/**
 * Diagnostic: inspect what the Audio Skill dialog looks like before/after
 * clicking "Upload Existing Recording" and setting a file.
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASSWORD   = process.env.TEST_USER_PASSWORD || '';
const AUDIO_PATH = path.resolve(__dirname, '../support/fixtures/audios/test-audio.mp3');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const page = await ctx.newPage();

  // ── login ──
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 20000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  console.log('Logged in. URL:', page.url());
  await page.waitForTimeout(2000);

  // ── KB page ──
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);

  // Handle identity page if present
  const lockItIn = page.getByRole('button', { name: 'Lock It In' });
  if (await lockItIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Identity page found, clicking Lock It In...');
    await lockItIn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.goto('/knowledge-base');
    await page.waitForLoadState('load');
  }

  // Wait for KB canvas
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('KB loaded.');
  await page.screenshot({ path: path.join(__dirname, 'audio-01-kb.png') });

  // ── open Skills popover ──
  await page.getByRole('button', { name: 'Skills' }).click();
  await page.waitForTimeout(1000);

  // ── click Make Audio Calls ──
  await page.getByRole('button', { name: 'Make Audio Calls' }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(__dirname, 'audio-02-dialog-initial.png') });
  console.log('Dialog opened. Taking screenshot.');

  // ── snapshot of dialog ──
  const dialogSnapshot = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.innerHTML.slice(0, 2000) : '(no dialog)';
  });
  console.log('\nDialog HTML (first 2000 chars):\n', dialogSnapshot.slice(0, 500));

  // ── intercept file chooser and click upload card ──
  console.log('\nSetting up filechooser listener and clicking Upload Existing Recording...');

  // Listen for ALL console messages
  page.on('console', msg => console.log('  [page]', msg.text()));
  // Listen for ALL network requests to see if upload fires
  page.on('request', req => {
    if (req.url().includes('upload') || req.url().includes('audio') || req.url().includes('voice')) {
      console.log('  [net request]', req.method(), req.url().slice(0, 100));
    }
  });
  page.on('response', res => {
    if (res.url().includes('upload') || res.url().includes('audio') || res.url().includes('voice')) {
      console.log('  [net response]', res.status(), res.url().slice(0, 100));
    }
  });

  let fileChooserFired = false;
  const fcPromise = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);

  const uploadCard = page.getByText(/upload existing recording/i).first();
  console.log('  Upload card visible:', await uploadCard.isVisible({ timeout: 3000 }));
  await uploadCard.click();

  const fc = await fcPromise;
  if (fc) {
    fileChooserFired = true;
    console.log('  FileChooser fired! Setting file:', AUDIO_PATH);
    await fc.setFiles(AUDIO_PATH);
    console.log('  File set.');
  } else {
    console.log('  No file chooser fired after click.');
  }

  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(__dirname, 'audio-03-after-click.png') });
  console.log('\nScreenshot after click/upload taken.');

  // Check for switch
  const switchEl = page.getByRole('switch').first();
  const switchVisible = await switchEl.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('Switch visible:', switchVisible);

  // Snapshot of dialog after
  const dialogAfter = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.innerText.slice(0, 500) : '(no dialog)';
  });
  console.log('\nDialog text after upload:\n', dialogAfter);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, 'audio-04-final.png') });

  await browser.close();
  console.log('\nDone. Screenshots saved in scripts/');
})();
