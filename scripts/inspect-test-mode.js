require('dotenv').config();
const { chromium, devices } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

(async () => {
  // Use EXACT same launch options as playwright.config.js
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // Use EXACT same context options as playwright.config.js
  const desktopChrome = devices['Desktop Chrome'];
  const ctx = await browser.newContext({
    ...desktopChrome,
    permissions: ['microphone'],
  });
  const page = await ctx.newPage();

  console.log('User agent:', await page.evaluate(() => navigator.userAgent));

  console.log('\nNavigating to', EU_URL);
  await page.goto(EU_URL, { timeout: 30000 });
  await page.waitForLoadState('load', { timeout: 30000 });
  console.log('Page loaded.');

  // Check subscription state
  const subBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    return btns.map(b => ({ text: b.innerText?.trim(), ariaLabel: b.getAttribute('aria-label') || '' }))
      .filter(b => /subscribe/i.test(b.text) || /subscribe/i.test(b.ariaLabel));
  });
  console.log('\nSubscribe buttons:', JSON.stringify(subBtn, null, 2));

  // Check localStorage
  const ls = await page.evaluate(() => {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      result[key] = localStorage.getItem(key)?.slice(0, 100);
    }
    return result;
  });
  console.log('\nlocalStorage:', JSON.stringify(ls, null, 2));

  // Wait (same as hasIframe check timing in clickProfileButton)
  console.log('\nWaiting 5s for iframe (simulating clickProfileButton)...');
  const hasIframe = await page.locator('iframe').first()
    .waitFor({ state: 'attached', timeout: 5000 })
    .then(() => true).catch(() => false);
  console.log('hasIframe:', hasIframe);

  // Now click "Log in"
  console.log('\nClicking "Log in"...');
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  console.log('Clicked.');

  // Check immediately
  await page.waitForTimeout(1000);
  const dialogCount = await page.getByRole('dialog').count();
  console.log('dialog count (1s after click):', dialogCount);

  const emailBtnCount = await page.getByRole('button', { name: /continue with email/i }).count();
  console.log('email button count:', emailBtnCount);

  // Try toBeVisible
  const { expect } = require('@playwright/test');
  try {
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    console.log('\n✓ page dialog IS visible');
  } catch (e) {
    console.log('\n✗ page dialog NOT visible in 5s');
    // Dump full ARIA
    const btnsNow = await page.evaluate(() =>
      [...document.querySelectorAll('button, [role="button"]')].map(b => ({
        text: b.innerText?.trim().slice(0, 50),
        ariaLabel: b.getAttribute('aria-label') || '',
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      })).filter(b => b.text || b.ariaLabel)
    );
    console.log('Current DOM buttons:', JSON.stringify(btnsNow, null, 2));
  }

  await page.screenshot({ path: path.join(__dirname, 'test-mode-after-click.png') });
  console.log('\nScreenshot saved.');
  await browser.close();
  console.log('Done.');
})();
