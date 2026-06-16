/**
 * Pure Playwright test (no playwright-bdd) that simulates the exact EU001M flow.
 * Run with: node scripts/test-login-flow.js
 */
require('dotenv').config();
const { chromium, devices, expect } = require('@playwright/test');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

(async () => {
  const desktopChrome = devices['Desktop Chrome'];
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const ctx = await browser.newContext({ ...desktopChrome, permissions: ['microphone'] });
  const page = await ctx.newPage();

  // ─── Step 1: Background — navigate to Modern EU ───────────────────────────────
  console.log('Step 1: Navigating to Modern EU...');
  const response = await page.goto(EU_URL, { timeout: 30000 });
  if (response && response.status() === 404) throw new Error('404');
  await page.waitForLoadState('load', { timeout: 30000 });
  console.log('Navigation complete.');

  // ─── Step 2: clickProfileButton() — exact replica ─────────────────────────────
  console.log('\nStep 2: clickProfileButton()');
  console.log('  Waiting up to 5s for iframe...');
  const hasIframe = await page.locator('iframe').first()
    .waitFor({ state: 'attached', timeout: 5000 })
    .then(() => true).catch(() => false);
  console.log('  hasIframe:', hasIframe);

  if (hasIframe) {
    console.log('  Classic EU: waiting for dialog inside iframe...');
    const frame = page.frameLocator('iframe').first();
    await frame.getByRole('dialog').waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
  }

  const loginBtnCount = await page.getByRole('button', { name: /^log\s*in$/i }).count();
  console.log('  "Log in" button count:', loginBtnCount);

  const loginBtn = page.getByRole('button', { name: /^log\s*in$/i }).first();
  const loginBtnVisible = await loginBtn.isVisible();
  console.log('  "Log in" button visible:', loginBtnVisible);

  console.log('  Clicking "Log in"...');
  await loginBtn.click();
  console.log('  Clicked.');

  // ─── Step 3: authModalShouldBeVisible() — exact replica ───────────────────────
  console.log('\nStep 3: authModalShouldBeVisible()');
  const iframeCount = await page.locator('iframe').count();
  console.log('  iframe count after click:', iframeCount);
  const hasIframeNow = iframeCount > 0;
  console.log('  hasIframeNow:', hasIframeNow);

  if (hasIframeNow) {
    console.log('  Classic path: checking iframe dialog...');
    try {
      await expect(page.frameLocator('iframe').first().getByRole('dialog')).toBeVisible({ timeout: 10000 });
      console.log('  ✓ Classic iframe dialog visible');
    } catch (e) {
      console.log('  ✗ Classic iframe dialog NOT visible:', e.message.split('\n')[0]);
    }
  } else {
    console.log('  Modern path: checking page-level dialog...');

    // Check at intervals
    for (const delay of [500, 1000, 2000, 5000]) {
      await page.waitForTimeout(delay === 500 ? 500 : delay - (delay === 1000 ? 500 : delay === 2000 ? 1000 : 2000));
      const count = await page.locator('[role="dialog"]').count();
      const ariaModalCount = await page.locator('[aria-modal="true"]').count();
      console.log(`  [${delay}ms] role=dialog: ${count}, aria-modal: ${ariaModalCount}`);
      if (count > 0) {
        const visible = await page.locator('[role="dialog"]').first().isVisible();
        console.log(`  [${delay}ms] dialog visible: ${visible}`);
      }
    }

    try {
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
      console.log('  ✓ Page dialog visible (expect passed)');
    } catch (e) {
      console.log('  ✗ Page dialog NOT visible:', e.message.split('\n')[0]);

      // Final DOM state
      const allRoles = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[role]')];
        return els.map(e => ({
          tag: e.tagName.toLowerCase(),
          role: e.getAttribute('role'),
          ariaModal: e.getAttribute('aria-modal'),
          ariaLabel: e.getAttribute('aria-label') || '',
          visible: e.offsetWidth > 0 && e.offsetHeight > 0,
        })).filter(e => ['dialog', 'alertdialog', 'presentation'].includes(e.role));
      });
      console.log('  DOM elements with dialog/alertdialog roles:', JSON.stringify(allRoles, null, 2));
    }
  }

  await page.screenshot({ path: require('path').join(__dirname, 'test-login-flow-result.png') });
  console.log('\nScreenshot saved: test-login-flow-result.png');
  await browser.close();
  console.log('Done.');
})();
