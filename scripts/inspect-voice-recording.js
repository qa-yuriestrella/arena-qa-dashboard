/**
 * Inspect the Voice Recording panel that opens after clicking "Voz do avatar".
 * Run: node scripts/inspect-voice-recording.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL      = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL         = process.env.TEST_USER_EMAIL || '';
const PASS          = process.env.TEST_USER_PASSWORD || '';
const TEST_AUDIO    = path.resolve(__dirname, '../tests/fixtures/audios/test-audio.mp3');
const OUT_DIR       = path.resolve(__dirname, 'inspect-output/voice-recording');

fs.mkdirSync(OUT_DIR, { recursive: true });

function log(label, data) {
  console.log(`\n── [${label}] ──`);
  console.log(JSON.stringify(data, null, 2));
}

async function shot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function dumpPanel(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('div.fixed.inset-0.z-50.flex');
    if (!panel) return { found: false };
    const buttons = [...panel.querySelectorAll('button')].map(b => ({
      text: b.textContent?.trim().slice(0, 80),
      ariaLabel: b.getAttribute('aria-label'),
      disabled: b.disabled,
    }));
    const inputs = [...panel.querySelectorAll('input')].map(i => ({
      type: i.type,
      accept: i.getAttribute('accept'),
      name: i.name,
    }));
    const headings = [...panel.querySelectorAll('h1,h2,h3,h4')].map(h => ({
      level: h.tagName,
      text: h.textContent?.trim(),
    }));
    return { found: true, buttons, inputs, headings, panelHTML: panel.outerHTML.slice(0, 2000) };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const page    = await browser.newPage();

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/stg-dash-avatar|arena\.im/, { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Navigate to video-ai
  await page.goto(`${BASE_URL}/video-ai`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

  // Dismiss popper if any
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  await shot(page, '1-initial');

  // Select "Falar para a câmera" (first card)
  const cards = page.locator('button[class*="rounded-2xl"]');
  if (await cards.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await cards.first().click();
    await page.waitForTimeout(1000);
  }
  await shot(page, '2-talk-to-cam');

  // Open audio dropdown
  await page.locator('button').filter({ hasText: /audio$|áudio$/i }).first().click({ timeout: 10000 });
  await page.waitForTimeout(600);
  await shot(page, '3-audio-dropdown-open');

  log('audio-dropdown-buttons', await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => ({
      text: b.textContent?.trim().slice(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
    }))
  ));

  // Click "Voz do avatar"
  const avatarBtn = page.locator('button').filter({ hasText: /voz do avatar|avatar.?voice/i }).first();
  await avatarBtn.waitFor({ state: 'visible', timeout: 5000 });
  await avatarBtn.click();
  await page.waitForTimeout(1500);

  // Dump panel state BEFORE upload
  const panelBefore = await dumpPanel(page);
  log('panel-before-upload', panelBefore);
  await shot(page, '4-voice-panel-opened');

  // Click "Upload Existing Recording"
  const uploadBtn = page.locator('button').filter({ hasText: /upload existing recording|carregar gravação/i }).first();
  if (await uploadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('\n>> Clicking Upload Existing Recording...');
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null);
    await uploadBtn.click();
    const fc = await fileChooserPromise;
    if (fc) {
      console.log('>> File chooser appeared — uploading test audio...');
      await fc.setFiles(TEST_AUDIO);
      await page.waitForTimeout(3000);
      await shot(page, '5-after-upload');
      const panelAfter = await dumpPanel(page);
      log('panel-after-upload', panelAfter);

      // Wait to see if panel auto-closes
      const closed = await page.locator('div.fixed.inset-0.z-50.flex')
        .waitFor({ state: 'hidden', timeout: 15000 }).then(() => true).catch(() => false);
      log('panel-auto-closed', closed);
      if (!closed) {
        await shot(page, '5b-panel-still-open');
        const panelAfter2 = await dumpPanel(page);
        log('panel-still-open-state', panelAfter2);
      }
    } else {
      console.log('>> NO file chooser appeared after clicking Upload button!');
      await shot(page, '5-no-filechooser');
    }
  } else {
    console.log('>> Upload button NOT found in panel');
    await shot(page, '5-upload-btn-not-found');
  }

  // Check audio button state
  await shot(page, '6-final-state');
  log('audio-button-final', await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(b =>
      b.getAttribute('aria-label')?.toLowerCase().includes('audio')
    );
    return btn ? { ariaLabel: btn.getAttribute('aria-label'), text: btn.textContent?.trim() } : null;
  }));

  console.log('\n\nDone. Check inspect-output/voice-recording/ for screenshots.');
  await page.waitForTimeout(3000);
  await browser.close();
})();
