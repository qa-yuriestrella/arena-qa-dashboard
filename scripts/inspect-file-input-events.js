/**
 * Diagnostic: intercept ALL events on file inputs to understand what the
 * component listens to AND what events actually fire after setFiles().
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASSWORD   = process.env.TEST_USER_PASSWORD || '';
const AUDIO_PATH = path.resolve(__dirname, '../support/fixtures/audios/test-audio.mp3');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });

  // Add init scripts
  await ctx.addInitScript(() => {
    window.__fileInputEvents = [];

    // Intercept addEventListener to log what events file inputs listen to
    const origAdd = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, fn, ...args) {
      if (this instanceof HTMLInputElement && this.type === 'file') {
        window.__fileInputEvents.push({ action: 'addEventListener', type, time: Date.now() });
        console.log(`[FILE-INPUT] addEventListener('${type}')`);
      }
      return origAdd.call(this, type, fn, ...args);
    };

    // Intercept click to append to DOM and log
    const originalClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function() {
      if (this.type === 'file') {
        console.log('[FILE-INPUT] click() intercepted, appending to body');
        if (!document.body.contains(this)) {
          this.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;';
          document.body.appendChild(this);
        }
      }
      return originalClick.call(this);
    };

    // Also intercept dispatchEvent to see what events get fired ON file inputs
    const origDispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function(event) {
      if (this instanceof HTMLInputElement && this.type === 'file') {
        window.__fileInputEvents.push({ action: 'dispatchEvent', type: event.type, time: Date.now() });
        console.log(`[FILE-INPUT] dispatchEvent('${event.type}')`);
      }
      return origDispatch.call(this, event);
    };

    // Intercept onchange setter
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'onchange');
    if (desc?.set) {
      Object.defineProperty(HTMLInputElement.prototype, 'onchange', {
        set(fn) {
          if (this.type === 'file') {
            console.log('[FILE-INPUT] onchange setter called');
            window.__fileInputEvents.push({ action: 'onchange setter', time: Date.now() });
            const wrapped = function(e) {
              console.log('[FILE-INPUT] onchange handler called, files:', e.target.files?.length);
              return fn.call(this, e);
            };
            return desc.set.call(this, wrapped);
          }
          return desc.set.call(this, fn);
        },
        get: desc.get,
        configurable: true,
      });
    }

    // Intercept showOpenFilePicker
    if ('showOpenFilePicker' in window) {
      const native = window.showOpenFilePicker;
      window.showOpenFilePicker = async (...args) => {
        console.log('[FILE-PICKER] showOpenFilePicker called (NATIVE)');
        window.__fileInputEvents.push({ action: 'showOpenFilePicker', time: Date.now() });
        return native(...args);
      };
    }

    console.log('[INIT] File input event interceptors installed');
  });

  const page = await ctx.newPage();

  page.on('console', msg => {
    const t = msg.text();
    if (t.startsWith('[FILE-INPUT]') || t.startsWith('[FILE-PICKER]') || t.startsWith('[INIT]')) {
      console.log('  [page]', t);
    }
  });

  page.on('pageerror', err => console.log('  [pageerror]', err.message));

  // Login
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 30000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  console.log('Logged in. URL:', page.url());

  // Navigate to KB
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');

  // Handle Lock It In
  const lockItIn = page.getByRole('button', { name: 'Lock It In' });
  if (await lockItIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lockItIn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.goto('/knowledge-base');
    await page.waitForLoadState('load');
  }

  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('KB loaded.');

  // Open Skills → Make Audio Calls
  await page.getByRole('button', { name: 'Skills' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Make Audio Calls' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'events-01-dialog.png') });

  console.log('\n=== Clicking "Upload Existing Recording" ===');

  // Set up filechooser listener
  const fcPromise = page.waitForEvent('filechooser', { timeout: 10000 }).catch(e => {
    console.log('  filechooser event NOT fired:', e.message);
    return null;
  });

  await page.getByText(/upload existing recording/i).first().click();
  await page.waitForTimeout(500);

  // Check events so far
  const eventsBeforeSet = await page.evaluate(() => window.__fileInputEvents || []);
  console.log('Events before setFiles:', JSON.stringify(eventsBeforeSet));

  const fc = await fcPromise;
  if (fc) {
    console.log('\n=== Filechooser fired! Calling setFiles... ===');
    await fc.setFiles(AUDIO_PATH);
    console.log('setFiles done');
  } else {
    console.log('\n=== No filechooser. Trying direct setInputFiles... ===');
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(AUDIO_PATH);
    }
  }

  await page.waitForTimeout(2000);

  // Check events after
  const eventsAfterSet = await page.evaluate(() => window.__fileInputEvents || []);
  console.log('Events after setFiles:', JSON.stringify(eventsAfterSet));

  // Check file input state
  const fileInputState = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="file"]')];
    return inputs.map(i => ({
      files: i.files?.length ?? 0,
      fileName: i.files?.[0]?.name ?? '(none)',
      inDOM: document.body.contains(i),
      accept: i.accept,
    }));
  });
  console.log('File input state after setFiles:', JSON.stringify(fileInputState));

  await page.screenshot({ path: path.join(__dirname, 'events-02-after-set.png') });

  // Check dialog state
  const dialogText = await page.locator('[role="dialog"]').first().innerText().catch(() => '(none)');
  console.log('Dialog text:', dialogText.replace(/\n/g, ' | ').slice(0, 300));

  // Check for switch
  const switchVisible = await page.getByRole('switch').first().isVisible({ timeout: 1000 }).catch(() => false);
  console.log('Switch visible:', switchVisible);

  // Wait longer and check again
  await page.waitForTimeout(8000);
  await page.screenshot({ path: path.join(__dirname, 'events-03-after-8s.png') });

  const switchVisible2 = await page.getByRole('switch').first().isVisible({ timeout: 500 }).catch(() => false);
  const dialogText2 = await page.locator('[role="dialog"]').first().innerText().catch(() => '(none)');
  console.log('Switch visible after 8s:', switchVisible2);
  console.log('Dialog text after 8s:', dialogText2.replace(/\n/g, ' | ').slice(0, 300));

  await browser.close();
  console.log('\nDone.');
})();
