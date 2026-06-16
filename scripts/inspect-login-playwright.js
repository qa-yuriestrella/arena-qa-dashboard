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

  // Check frames before click
  const framesBefore = page.frames();
  console.log(`\n=== FRAMES BEFORE CLICK (${framesBefore.length}) ===`);
  for (const f of framesBefore) {
    console.log(' ', f.url().slice(0, 120));
  }

  // Click "Log in"
  console.log('\nClicking Log in...');
  await page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  await page.waitForTimeout(2000);

  // Check frames after click
  const framesAfter = page.frames();
  console.log(`\n=== FRAMES AFTER CLICK (${framesAfter.length}) ===`);
  for (const f of framesAfter) {
    console.log(' ', f.url().slice(0, 120));
  }

  // Try getByRole on main page
  console.log('\n=== PAGE-LEVEL getByRole BUTTONS (after click) ===');
  for (const pattern of [
    /continue with email/i,
    /continue with google/i,
    /sign up with email/i,
    /welcome back/i,
    /close/i,
    /continue/i,
  ]) {
    try {
      const loc = page.getByRole('button', { name: pattern });
      const cnt = await loc.count();
      console.log(`  getByRole('button', { name: ${pattern} }) → count: ${cnt}`);
      if (cnt > 0) {
        const vis = await loc.first().isVisible();
        console.log(`    first().isVisible(): ${vis}`);
      }
    } catch (e) {
      console.log(`  ${pattern}: ERROR: ${e.message}`);
    }
  }

  // Try getByText
  console.log('\n=== getByText (after click) ===');
  for (const txt of ['Continue with email', 'Continue with Google', 'Welcome back', 'New here']) {
    const cnt = await page.getByText(txt).count();
    const vis = cnt > 0 ? await page.getByText(txt).first().isVisible() : false;
    console.log(`  getByText("${txt}") → count: ${cnt}, visible: ${vis}`);
  }

  // Check if there's a dialog or role=dialog
  console.log('\n=== ROLE=DIALOG ===');
  const dlgCnt = await page.getByRole('dialog').count();
  console.log(`  page.getByRole('dialog').count(): ${dlgCnt}`);

  // Check iframe content
  console.log('\n=== IFRAME CONTENT (after click) ===');
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    console.log('  iframe:', f.url().slice(0, 120));
    try {
      const ifrBtns = await f.locator('button').count();
      console.log(`    button count: ${ifrBtns}`);
      if (ifrBtns > 0) {
        const texts = await f.locator('button').allTextContents();
        console.log('    texts:', texts.slice(0, 5));
      }
    } catch (e) {
      console.log('    (inaccessible)');
    }
  }

  // Check aria-hidden containers that might wrap buttons
  console.log('\n=== ARIA-HIDDEN CONTAINERS WRAPPING BUTTONS ===');
  const ariaHiddenParents = await page.evaluate(() => {
    const allBtns = [...document.querySelectorAll('button')];
    return allBtns.map(b => {
      let el = b.parentElement;
      const ariaHiddenAncestors = [];
      while (el) {
        if (el.getAttribute('aria-hidden') === 'true') {
          ariaHiddenAncestors.push(el.tagName + ' ' + (el.className || '').slice(0, 40));
        }
        el = el.parentElement;
      }
      if (ariaHiddenAncestors.length) {
        return { btn: b.innerText?.trim().slice(0, 40) || b.getAttribute('aria-label') || '', ariaHiddenAncestors };
      }
      return null;
    }).filter(Boolean);
  });
  console.log(JSON.stringify(ariaHiddenParents.slice(0, 10), null, 2));

  await page.screenshot({ path: path.join(__dirname, 'after-login-playwright.png') });
  console.log('\nScreenshot saved.');
  await browser.close();
  console.log('Done.');
})();
