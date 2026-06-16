/**
 * Traces the path from signup form back to sign-in form on Modern EU.
 * Run with: node scripts/inspect-signin-from-signup.js
 */
require('dotenv').config();
const { chromium, devices } = require('@playwright/test');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

async function describeDialogs(page) {
  return page.evaluate(() => {
    return [...document.querySelectorAll('[role="dialog"]')].map(dlg => ({
      ariaLabel: dlg.getAttribute('aria-label') || '',
      heading: dlg.querySelector('h1,h2,h3')?.innerText?.trim() || '',
      buttons: [...dlg.querySelectorAll('button')].map(b => b.innerText?.trim().slice(0, 80)),
      links: [...dlg.querySelectorAll('a, [role="link"]')].map(a => a.innerText?.trim().slice(0, 80)),
      inputs: [...dlg.querySelectorAll('input')].map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder, ariaLabel: i.getAttribute('aria-label') || '' })),
    }));
  });
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ ...devices['Desktop Chrome'], permissions: ['microphone'] });
  const page = await ctx.newPage();

  await page.goto(EU_URL, { timeout: 30000 });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  // 1. Open auth dialog
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(1000);

  // 2. "New here? Create an account"
  await page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /create an account/i }).click();
  await page.waitForTimeout(1000);

  // 3. "Sign up with email"
  await page.getByRole('dialog', { name: /create your account/i })
    .getByRole('button', { name: /sign up with email/i }).click();
  await page.waitForTimeout(1000);
  console.log('\n=== Signup email form ===');
  console.log(JSON.stringify(await describeDialogs(page), null, 2));

  // 4. Click "Other sign-in options"
  const otherBtn = page.getByRole('dialog', { name: /create your account/i })
    .getByRole('button', { name: /other sign-in options/i });
  if (await otherBtn.count() > 0) {
    console.log('\nClicking "Other sign-in options"...');
    await otherBtn.click();
    await page.waitForTimeout(1500);
    console.log('\n=== After "Other sign-in options" ===');
    console.log(JSON.stringify(await describeDialogs(page), null, 2));
  } else {
    console.log('"Other sign-in options" NOT FOUND');
  }

  // 5. Look for "Already have an account?" or "Sign in" link
  const dialogs = await describeDialogs(page);
  for (const dlg of dialogs) {
    const signInEls = [...dlg.buttons, ...dlg.links].filter(t => /sign.?in|already have/i.test(t));
    if (signInEls.length) {
      console.log(`\nSign-in options in "${dlg.ariaLabel}" dialog:`, signInEls);
    }
  }

  await browser.close();
  console.log('\nDone.');
})();
