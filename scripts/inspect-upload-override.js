/**
 * Diagnostic: verify whether addInitScript + goto override of showOpenFilePicker
 * actually intercepts the call when "Upload Existing Recording" is clicked.
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASSWORD   = process.env.TEST_USER_PASSWORD || '';
const AUDIO_PATH = path.resolve(__dirname, '../support/fixtures/audios/test-audio.mp3');
const audioBase64 = fs.readFileSync(AUDIO_PATH).toString('base64');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });

  // Add the init script BEFORE creating the page (applies to all navigations)
  await ctx.addInitScript((b64) => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const file = new File([bytes], 'test-audio.mp3', { type: 'audio/mpeg' });
    const mockHandle = {
      kind: 'file',
      name: 'test-audio.mp3',
      getFile: async () => {
        console.log('[MOCK] getFile() called');
        return file;
      },
      isSameEntry: async () => false,
      queryPermission: async () => 'granted',
      requestPermission: async () => 'granted',
    };
    window.__mockCalled = false;
    window.__mockError = null;
    window.showOpenFilePicker = async (opts) => {
      window.__mockCalled = true;
      console.log('[MOCK] showOpenFilePicker called, opts:', JSON.stringify(opts));
      return [mockHandle];
    };
    console.log('[INIT] showOpenFilePicker overridden');
  }, audioBase64);

  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[MOCK]') || text.startsWith('[INIT]') || text.startsWith('[ERROR]')) {
      console.log('  [page]', text);
    }
  });

  page.on('pageerror', err => console.log('  [pageerror]', err.message));

  page.on('request', req => {
    if (/upload|audio|voice|clone/i.test(req.url())) {
      console.log('  [net request]', req.method(), req.url().slice(0, 120));
    }
  });
  page.on('response', res => {
    if (/upload|audio|voice|clone/i.test(res.url())) {
      console.log('  [net response]', res.status(), res.url().slice(0, 120));
    }
  });

  // ── login ──
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 20000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  console.log('Logged in. URL:', page.url());

  // ── KB ──
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('KB loaded.');

  // Check if override is in place
  const overrideActive = await page.evaluate(() => {
    const fn = window.showOpenFilePicker;
    return { type: typeof fn, isNative: fn?.toString().includes('[native code]'), src: fn?.toString().slice(0, 80) };
  });
  console.log('showOpenFilePicker override status:', JSON.stringify(overrideActive));

  // ── open Skills → Make Audio Calls ──
  await page.getByRole('button', { name: 'Skills' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Make Audio Calls' }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'override-01-dialog.png') });

  // ── click upload ──
  console.log('\nClicking "Upload Existing Recording"...');
  await page.getByText(/upload existing recording/i).first().click();

  // Wait 2 seconds and screenshot (check if any transition happened)
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, 'override-02-after-click.png') });

  // Check if mock was called
  const mockCalled = await page.evaluate(() => window.__mockCalled);
  console.log('Mock was called:', mockCalled);

  const dialogText = await page.locator('[role="dialog"]').first().innerText().catch(() => '(no dialog)');
  console.log('Dialog text (2s after click):\n', dialogText.slice(0, 300));

  // Wait more and check toggle
  await page.waitForTimeout(10000);
  await page.screenshot({ path: path.join(__dirname, 'override-03-after-10s.png') });

  const switchVisible = await page.getByRole('switch').first().isVisible({ timeout: 1000 }).catch(() => false);
  console.log('Switch visible after 10s:', switchVisible);

  const dialogText2 = await page.locator('[role="dialog"]').first().innerText().catch(() => '(no dialog)');
  console.log('Dialog text after 10s:\n', dialogText2.slice(0, 400));

  await browser.close();
  console.log('\nDone.');
})();
