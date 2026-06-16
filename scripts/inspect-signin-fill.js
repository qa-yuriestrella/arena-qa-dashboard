/**
 * Diagnostic: traces the sign-in form fill path on Modern EU.
 * Run with: node scripts/inspect-signin-fill.js
 */
require('dotenv').config();
const { chromium, devices } = require('@playwright/test');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ ...devices['Desktop Chrome'], permissions: ['microphone'] });
  const page = await ctx.newPage();

  await page.goto(EU_URL, { timeout: 30000 });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  // Step 1: Open Login dialog
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(1000);

  // Step 2: selectEmailSignup — goes to Create your account signup form
  await page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /create an account/i }).click();
  await page.waitForTimeout(1000);
  await page.getByRole('dialog', { name: /create your account/i })
    .getByRole('button', { name: /sign up with email/i }).click();
  await page.waitForTimeout(1000);

  // Step 3: clickSignInLink
  const createDlg = page.getByRole('dialog', { name: /create your account/i });
  await createDlg.getByRole('button', { name: /other sign-in options/i }).click();
  await page.waitForTimeout(500);
  await createDlg.getByRole('button', { name: /already have an account/i }).click();
  await page.waitForTimeout(1000);

  const continueEmailBtn = page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /continue with email/i });
  console.log('\n"Continue with email" visible:', await continueEmailBtn.isVisible({ timeout: 3000 }).catch(() => false));
  await continueEmailBtn.click();
  await page.waitForTimeout(1000);

  // Check what dialogs are in the DOM
  const dialogInfo = await page.evaluate(() => {
    return [...document.querySelectorAll('[role="dialog"]')].map(d => ({
      ariaLabel: d.getAttribute('aria-label'),
      visible: d.offsetParent !== null,
      computedDisplay: window.getComputedStyle(d).display,
      emailInputs: [...d.querySelectorAll('input[name="email"]')].map(i => ({
        name: i.name, type: i.type, value: i.value, readOnly: i.readOnly,
        disabled: i.disabled,
        visible: i.offsetParent !== null,
      })),
    }));
  });
  console.log('\n=== DOM dialogs ===');
  console.log(JSON.stringify(dialogInfo, null, 2));

  // Step 4: Try to fill email
  const EMAIL = 'automation.arena1+1@gmail.com';
  const emailInput = page.locator('[role="dialog"][aria-label="Welcome back"] input[name="email"]');
  const count = await emailInput.count();
  console.log('\nEmail input count:', count);

  if (count > 0) {
    await emailInput.fill(EMAIL);
    const value = await emailInput.inputValue().catch(() => 'ERROR');
    console.log('Value after fill:', value);

    await page.waitForTimeout(500);
    const valueAfterWait = await emailInput.inputValue().catch(() => 'ERROR');
    console.log('Value after 500ms wait:', valueAfterWait);
  }

  await browser.close();
  console.log('\nDone.');
})();
