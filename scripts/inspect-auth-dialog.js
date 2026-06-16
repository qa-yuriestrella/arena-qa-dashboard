/**
 * Shows the full content of the "Welcome back" auth dialog on automation2arena.
 * Run with: node scripts/inspect-auth-dialog.js
 */
require('dotenv').config();
const { chromium, devices } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

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

  // Dump full dialog content
  console.log('\n=== INITIAL AUTH DIALOG ===');
  const initialContent = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-label="Welcome back"]');
    if (!dlg) return 'Dialog not found';

    function describeEl(el, depth = 0) {
      if (depth > 4) return '...';
      const indent = '  '.repeat(depth);
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const text = el.innerText?.trim().slice(0, 60).replace(/\n/g, ' ') || '';
      const type = el.getAttribute('type') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const href = el.getAttribute('href') || '';

      let desc = `${indent}<${tag}`;
      if (role) desc += ` role="${role}"`;
      if (ariaLabel) desc += ` aria-label="${ariaLabel}"`;
      if (type) desc += ` type="${type}"`;
      if (placeholder) desc += ` placeholder="${placeholder}"`;
      if (href) desc += ` href="${href}"`;
      if (text && !el.children.length) desc += ` text="${text}"`;
      desc += '>';

      const children = [...el.children].map(c => describeEl(c, depth + 1)).filter(Boolean);
      if (children.length) desc += '\n' + children.join('\n');
      return desc;
    }
    return describeEl(dlg);
  });
  console.log(initialContent);

  // List all interactive elements
  console.log('\n=== BUTTONS IN DIALOG ===');
  const buttons = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-label="Welcome back"]');
    if (!dlg) return [];
    return [...dlg.querySelectorAll('button, [role="button"]')].map(b => ({
      text: b.innerText?.trim().slice(0, 60),
      ariaLabel: b.getAttribute('aria-label') || '',
      type: b.getAttribute('type') || '',
    }));
  });
  console.log(JSON.stringify(buttons, null, 2));

  console.log('\n=== LINKS IN DIALOG ===');
  const links = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"][aria-label="Welcome back"]');
    if (!dlg) return [];
    return [...dlg.querySelectorAll('a, [role="link"]')].map(a => ({
      text: a.innerText?.trim().slice(0, 60),
      ariaLabel: a.getAttribute('aria-label') || '',
      href: a.getAttribute('href') || '',
    }));
  });
  console.log(JSON.stringify(links, null, 2));

  await page.screenshot({ path: path.join(__dirname, 'auth-dialog-initial.png') });
  console.log('\nScreenshot: auth-dialog-initial.png');

  // Now click "Continue with email" and capture that state
  console.log('\n\n=== AFTER "Continue with email" ===');
  const emailBtn = page.getByRole('dialog', { name: /welcome back/i })
    .getByRole('button', { name: /continue with email/i });
  const emailBtnExists = await emailBtn.count();
  console.log('"Continue with email" button count:', emailBtnExists);

  if (emailBtnExists > 0) {
    await emailBtn.click();
    await page.waitForTimeout(1000);

    const afterEmailContent = await page.evaluate(() => {
      const dlgs = [...document.querySelectorAll('[role="dialog"]')];
      return dlgs.map(dlg => ({
        ariaLabel: dlg.getAttribute('aria-label'),
        buttons: [...dlg.querySelectorAll('button')].map(b => ({
          text: b.innerText?.trim().slice(0, 60),
          ariaLabel: b.getAttribute('aria-label') || '',
        })),
        links: [...dlg.querySelectorAll('a, [role="link"]')].map(a => ({
          text: a.innerText?.trim().slice(0, 60),
          href: a.href || a.getAttribute('href') || '',
        })),
        inputs: [...dlg.querySelectorAll('input, [role="textbox"]')].map(i => ({
          type: i.getAttribute('type') || '',
          placeholder: i.getAttribute('placeholder') || '',
          ariaLabel: i.getAttribute('aria-label') || '',
        })),
      }));
    });
    console.log(JSON.stringify(afterEmailContent, null, 2));
    await page.screenshot({ path: path.join(__dirname, 'auth-dialog-after-email.png') });
    console.log('Screenshot: auth-dialog-after-email.png');
  }

  await browser.close();
  console.log('\nDone.');
})();
