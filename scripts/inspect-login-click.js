require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  console.log('Navigating to', EU_URL);
  await page.goto(EU_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Dump buttons before click
  const btnsBefore = await page.evaluate(() =>
    [...document.querySelectorAll('button, [role="button"]')].map(b => ({
      text: b.innerText?.trim().slice(0, 60),
      ariaLabel: b.getAttribute('aria-label') || '',
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    })).filter(b => b.text || b.ariaLabel)
  );
  console.log('\n=== BUTTONS BEFORE CLICK ===');
  console.log(JSON.stringify(btnsBefore, null, 2));

  // Screenshot before click
  await page.screenshot({ path: path.join(__dirname, 'before-login-click.png') });
  console.log('\nScreenshot before click saved.');

  // Click Log in
  const loginBtn = page.getByRole('button', { name: /^log\s*in$/i }).first();
  const found = await loginBtn.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('\nLog in button visible:', found);
  if (found) {
    await loginBtn.click();
    console.log('Clicked Log in button.');
  } else {
    const allBtns = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map(b => b.innerText?.trim() || b.getAttribute('aria-label') || '(no text)')
    );
    console.log('All buttons:', allBtns);
  }

  // Wait and poll every second for 20 seconds
  for (let i = 1; i <= 20; i++) {
    await page.waitForTimeout(1000);
    const btnsAfter = await page.evaluate(() =>
      [...document.querySelectorAll('button, [role="button"]')].map(b => ({
        text: b.innerText?.trim().slice(0, 60),
        ariaLabel: b.getAttribute('aria-label') || '',
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      })).filter(b => b.text || b.ariaLabel)
    );
    const newBtns = btnsAfter.filter(b =>
      !btnsBefore.some(prev => prev.text === b.text && prev.ariaLabel === b.ariaLabel)
    );
    if (newBtns.length > 0) {
      console.log(`\n=== NEW BUTTONS AT ${i}s ===`);
      console.log(JSON.stringify(newBtns, null, 2));
      await page.screenshot({ path: path.join(__dirname, `after-login-${i}s.png`) });
      console.log(`Screenshot at ${i}s saved.`);
      break;
    } else {
      console.log(`${i}s: no new buttons yet`);
    }
  }

  // Final ARIA snapshot
  const ariaSnap = await page.accessibility.snapshot();
  console.log('\n=== ARIA SNAPSHOT (after click) ===');
  console.log(JSON.stringify(ariaSnap, null, 2).slice(0, 3000));

  // Check iframes
  const frames = page.frames();
  console.log(`\n=== FRAMES (${frames.length}) ===`);
  for (const f of frames) {
    console.log('  frame url:', f.url().slice(0, 100));
    try {
      const fBtns = await f.evaluate(() =>
        [...document.querySelectorAll('button, [role="button"]')].map(b => ({
          text: b.innerText?.trim().slice(0, 40),
          ariaLabel: b.getAttribute('aria-label') || '',
        })).filter(b => b.text || b.ariaLabel).slice(0, 10)
      );
      if (fBtns.length) console.log('  buttons:', JSON.stringify(fBtns));
    } catch (e) {
      console.log('  (frame not accessible)');
    }
  }

  await browser.close();
  console.log('\nDone.');
})();
