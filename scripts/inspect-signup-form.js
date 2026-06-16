/**
 * Clicks "New here? Create an account" on automation2arena and captures the signup form.
 * Run with: node scripts/inspect-signup-form.js
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
      links: [...dlg.querySelectorAll('a, [role="link"]')].map(a => ({
        text: a.innerText?.trim().slice(0, 80),
        href: a.href || a.getAttribute('href') || '',
      })),
      inputs: [...dlg.querySelectorAll('input')].map(i => ({
        type: i.type,
        placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label') || '',
        id: i.id || '',
        name: i.name || '',
        labelText: i.labels?.[0]?.innerText?.trim() || '',
      })),
      labels: [...dlg.querySelectorAll('label')].map(l => l.innerText?.trim().slice(0, 80)),
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

  // Open auth dialog
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(1000);
  console.log('\n=== After "Log in" click ===');
  console.log(JSON.stringify(await describeDialog(page), null, 2));
  await page.screenshot({ path: path.join(__dirname, 'signup-01-initial.png') });

  // Click "New here? Create an account"
  const createBtn = page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /create an account/i });
  if (await createBtn.count() > 0) {
    console.log('\nClicking "New here? Create an account"...');
    await createBtn.click();
    await page.waitForTimeout(1000);
    console.log('\n=== After "New here? Create an account" click ===');
    console.log(JSON.stringify(await describeDialog(page), null, 2));
    await page.screenshot({ path: path.join(__dirname, 'signup-02-create-form.png') });
  } else {
    console.log('"New here? Create an account" not found');
  }

  await browser.close();
  console.log('\nDone.');
})();
