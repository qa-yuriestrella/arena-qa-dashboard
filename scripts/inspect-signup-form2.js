/**
 * Full Modern EU signup and signin flow investigation.
 * Run with: node scripts/inspect-signup-form2.js
 */
require('dotenv').config();
const { chromium, devices } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

async function describeDialog(page) {
  const data = await page.evaluate(() => {
    const dlgs = [...document.querySelectorAll('[role="dialog"]')];
    return dlgs.map(dlg => ({
      ariaLabel: dlg.getAttribute('aria-label') || '',
      headings: [...dlg.querySelectorAll('h1,h2,h3')].map(h => h.innerText?.trim()),
      buttons: [...dlg.querySelectorAll('button')].map(b => ({
        text: b.innerText?.trim().slice(0, 80),
        ariaLabel: b.getAttribute('aria-label') || '',
      })),
      inputs: [...dlg.querySelectorAll('input')].map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        id: i.id || '',
        labelText: i.labels?.[0]?.innerText?.trim() || '',
        ariaLabel: i.getAttribute('aria-label') || '',
      })),
      labels: [...dlg.querySelectorAll('label')].map(l => ({
        text: l.innerText?.trim().slice(0, 80),
        for: l.getAttribute('for') || '',
      })),
    }));
  });
  return data;
}

(async () => {
  const desktopChrome = devices['Desktop Chrome'];
  const browser = await chromium.launch({ headless: false, slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ ...desktopChrome, permissions: ['microphone'] });
  const page = await ctx.newPage();

  await page.goto(EU_URL, { timeout: 30000 });
  await page.waitForLoadState('load', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // ── Path 1: New here → Sign up with email ────────────────────────────────────
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(1000);

  await page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /create an account/i }).click();
  await page.waitForTimeout(1000);
  console.log('\n=== "Create your account" dialog ===');
  console.log(JSON.stringify(await describeDialog(page), null, 2));
  await page.screenshot({ path: path.join(__dirname, 'signup-create-account.png') });

  await page.getByRole('dialog', { name: /create your account/i })
    .getByRole('button', { name: /sign up with email/i }).click();
  await page.waitForTimeout(1000);
  console.log('\n=== After "Sign up with email" click ===');
  const signupState = await describeDialog(page);
  console.log(JSON.stringify(signupState, null, 2));
  await page.screenshot({ path: path.join(__dirname, 'signup-email-form.png') });

  // Check if there's a "sign in" link on the signup form
  const signInBtnsOnSignup = await page.evaluate(() => {
    const dlgs = [...document.querySelectorAll('[role="dialog"]')];
    const btns = [];
    for (const dlg of dlgs) {
      const allEls = [...dlg.querySelectorAll('button, a, [role="link"]')];
      for (const el of allEls) {
        const text = el.innerText?.trim();
        if (/sign.?in|already have/i.test(text)) {
          btns.push({ tag: el.tagName.toLowerCase(), text, ariaLabel: el.getAttribute('aria-label') || '' });
        }
      }
    }
    return btns;
  });
  console.log('\n=== Sign-in options on signup form ===');
  console.log(JSON.stringify(signInBtnsOnSignup, null, 2));

  // Close this dialog
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── Path 2: Continue with email → sign-in form ────────────────────────────────
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(1000);

  await page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /^continue with email$/i }).click();
  await page.waitForTimeout(1000);
  console.log('\n\n=== After "Continue with email" (sign-in form) ===');
  const signinState = await describeDialog(page);
  console.log(JSON.stringify(signinState, null, 2));
  await page.screenshot({ path: path.join(__dirname, 'signin-form.png') });

  await browser.close();
  console.log('\nDone.');
})();
