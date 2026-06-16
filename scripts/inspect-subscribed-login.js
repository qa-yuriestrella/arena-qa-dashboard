/**
 * Investigates the subscription state on automation2arena and whether
 * clicking "Log in" opens the auth modal in BOTH subscribed and unsubscribed states.
 *
 * Run with: node scripts/inspect-subscribed-login.js
 */
require('dotenv').config();
const { chromium, devices } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

async function testLoginClick(page, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING: ${label}`);
  console.log('='.repeat(60));

  const subBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, [role="button"]')];
    const sub = btns.find(b => /subscribe/i.test(b.getAttribute('aria-label') || b.innerText));
    if (!sub) return null;
    return {
      text: sub.innerText?.trim(),
      ariaLabel: sub.getAttribute('aria-label') || '',
      ariaPressed: sub.getAttribute('aria-pressed'),
    };
  });
  console.log('Subscribe button state:', JSON.stringify(subBtn));

  const ls = await page.evaluate(() => {
    const r = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      r[k] = localStorage.getItem(k)?.slice(0, 120);
    }
    return r;
  });
  console.log('localStorage keys:', Object.keys(ls));
  if (Object.keys(ls).length > 0) console.log('localStorage values:', JSON.stringify(ls, null, 2));

  const cookies = await page.context().cookies();
  const relevantCookies = cookies.filter(c => c.domain.includes('arena.im') || c.domain.includes('myavatar'));
  console.log('Relevant cookies:', relevantCookies.map(c => `${c.name}=${c.value?.slice(0, 40)}`));

  console.log('\nClicking "Log in"...');
  const loginBtn = page.getByRole('button', { name: /^log\s*in$/i }).first();
  const loginBtnVisible = await loginBtn.isVisible();
  console.log('"Log in" button visible:', loginBtnVisible);

  if (!loginBtnVisible) {
    console.log('WARNING: "Log in" not visible — checking all buttons:');
    const allBtns = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map(b => b.innerText?.trim()).filter(Boolean)
    );
    console.log('All buttons:', allBtns);
    return;
  }

  await loginBtn.click();
  console.log('Clicked.');

  // Check immediately at 500ms intervals up to 5s
  for (const delay of [500, 1000, 2000, 3000, 5000]) {
    await page.waitForTimeout(delay === 500 ? 500 : delay - (delay === 1000 ? 500 : delay === 2000 ? 1000 : delay === 3000 ? 2000 : 3000));
    const dialogCount = await page.locator('[role="dialog"]').count();
    const ariaModalCount = await page.locator('[aria-modal="true"]').count();
    const dialogVisible = dialogCount > 0 ? await page.locator('[role="dialog"]').first().isVisible() : false;
    console.log(`After ${delay}ms — role=dialog count: ${dialogCount}, visible: ${dialogVisible}, aria-modal count: ${ariaModalCount}`);
    if (dialogCount > 0) break;
  }

  // Full DOM snapshot of overlay/modal elements
  const overlays = await page.evaluate(() => {
    const selectors = ['[role="dialog"]', '[aria-modal="true"]', '[role="alertdialog"]', '.modal', '.overlay', '[data-testid*="modal"]', '[data-testid*="auth"]'];
    const results = [];
    for (const sel of selectors) {
      const els = [...document.querySelectorAll(sel)];
      for (const el of els) {
        results.push({
          selector: sel,
          tag: el.tagName.toLowerCase(),
          id: el.id || '',
          className: el.className?.slice?.(0, 80) || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          ariaModal: el.getAttribute('aria-modal') || '',
          role: el.getAttribute('role') || '',
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          innerHTML: el.innerHTML?.slice(0, 200),
        });
      }
    }
    return results;
  });
  if (overlays.length > 0) {
    console.log('\nOverlay/dialog elements found:');
    console.log(JSON.stringify(overlays, null, 2));
  } else {
    console.log('\nNo overlay/dialog elements found in DOM.');
    // Check what changed in the page
    const newBtns = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map(b => ({
        text: b.innerText?.trim().slice(0, 50),
        ariaLabel: b.getAttribute('aria-label') || '',
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      })).filter(b => b.text || b.ariaLabel)
    );
    console.log('Current buttons after click:', JSON.stringify(newBtns, null, 2));
  }

  await page.screenshot({
    path: path.join(__dirname, `subscribed-login-${label.replace(/\s+/g, '-').toLowerCase()}.png`),
  });
  console.log(`Screenshot saved.`);
}

(async () => {
  const desktopChrome = devices['Desktop Chrome'];
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  // ─── Test 1: Fresh context (no state) ─────────────────────────────────────────
  {
    const ctx = await browser.newContext({ ...desktopChrome, permissions: ['microphone'] });
    const page = await ctx.newPage();
    console.log('\nNavigating (fresh context)...');
    await page.goto(EU_URL, { timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 30000 });
    await page.waitForTimeout(2000); // let SPA finish rendering
    await testLoginClick(page, 'Fresh context (no state)');
    await ctx.close();
  }

  // ─── Test 2: Context with subscription localStorage pre-set ────────────────────
  // First, visit the page normally and subscribe, then test login
  {
    const ctx = await browser.newContext({ ...desktopChrome, permissions: ['microphone'] });
    const page = await ctx.newPage();
    console.log('\n\nNavigating (will subscribe first)...');
    await page.goto(EU_URL, { timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we can subscribe
    const subBtnText = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button, [role="button"]')];
      const sub = btns.find(b => /^subscribe/i.test(b.innerText?.trim() || b.getAttribute('aria-label') || ''));
      return sub ? (sub.innerText?.trim() || sub.getAttribute('aria-label')) : null;
    });
    console.log(`Subscribe button text: "${subBtnText}"`);

    if (subBtnText && /^subscribe/i.test(subBtnText)) {
      console.log('Clicking Subscribe...');
      await page.getByRole('button', { name: /^subscribe/i }).click();
      await page.waitForTimeout(2000);

      // Now check state after subscribe click
      const afterSubState = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, [role="button"]')];
        const sub = btns.find(b => /subscribe/i.test(b.getAttribute('aria-label') || b.innerText));
        return sub ? { text: sub.innerText?.trim(), ariaPressed: sub.getAttribute('aria-pressed') } : null;
      });
      console.log('After subscribe click:', JSON.stringify(afterSubState));

      // Check localStorage after subscribe
      const ls = await page.evaluate(() => {
        const r = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          r[k] = localStorage.getItem(k)?.slice(0, 120);
        }
        return r;
      });
      console.log('localStorage after subscribe:', JSON.stringify(ls, null, 2));

      // Maybe subscribing opened auth modal
      const dialogAfterSub = await page.locator('[role="dialog"]').count();
      console.log('Dialog count after subscribe click:', dialogAfterSub);
    } else {
      console.log('No "Subscribe" button found — checking "Unsubscribe":');
      const unsubBtn = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button, [role="button"]')];
        const unsub = btns.find(b => /unsubscribe/i.test(b.innerText?.trim() || b.getAttribute('aria-label') || ''));
        return unsub ? (unsub.innerText?.trim() || unsub.getAttribute('aria-label')) : null;
      });
      console.log('Unsubscribe button text:', unsubBtn);
    }

    // Close dialog if open, reload page
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.goto(EU_URL, { timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 30000 });
    await page.waitForTimeout(2000);

    await testLoginClick(page, 'After subscribe (or unsubscribe state)');
    await ctx.close();
  }

  await browser.close();
  console.log('\n\nDone.');
})();
