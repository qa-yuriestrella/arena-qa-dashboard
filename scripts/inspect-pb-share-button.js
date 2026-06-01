require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key && key.startsWith('avatar-health-shown-')) return 'true';
      return orig.call(this, key);
    };
  });

  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  await page.goto('/profile-builder', { waitUntil: 'load', timeout: 30000 });
  await page.getByText('Set the basic information of your profile').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('On Profile Builder page');

  // ─── Find the share button ────────────────────────────────────────────────────
  console.log('\n=== ALL BUTTONS IN TOP-RIGHT AREA ===');

  // Look for buttons near the URL span (top-right panel)
  const urlSpan = page.locator('span').filter({ hasText: /https:\/\/.*arena\.im\// }).first();
  const urlSpanHTML = await urlSpan.evaluate(e => {
    let p = e.parentElement;
    for (let i = 0; i < 5; i++) { if (p) p = p.parentElement; }
    return p ? p.outerHTML.substring(0, 2000) : '';
  }).catch(() => '');
  console.log('Container around URL span (5 levels up):\n' + urlSpanHTML);

  // Scan all buttons for share-related ones
  console.log('\n=== ALL BUTTONS (looking for share) ===');
  const allBtns = page.locator('button');
  const btnCount = await allBtns.count();
  for (let i = 0; i < Math.min(btnCount, 40); i++) {
    const btn = allBtns.nth(i);
    const id = await btn.getAttribute('id') || '';
    const ariaLabel = await btn.getAttribute('aria-label') || '';
    const title = await btn.getAttribute('title') || '';
    const cls = (await btn.getAttribute('class') || '').substring(0, 80);
    const txt = (await btn.innerText().catch(() => '')).trim().substring(0, 40);
    const svgCount = await btn.locator('svg').count();
    if (id.includes('radix') || ariaLabel || title || txt.toLowerCase().includes('share') || txt.toLowerCase().includes('copy') || txt.toLowerCase().includes('link')) {
      console.log(`  btn[${i}]: id="${id}" aria-label="${ariaLabel}" title="${title}" text="${txt}" svgs=${svgCount}`);
      console.log(`    class="${cls}"`);
    }
  }

  // ─── Click the share button (try various selectors) ───────────────────────────
  console.log('\n=== TRYING TO CLICK SHARE BUTTON ===');

  // Based on position: it should be to the right of the URL span
  const shareButtonCandidates = [
    page.locator('button[aria-label*="share" i]'),
    page.locator('button[aria-label*="copy" i]'),
    page.locator('button[title*="share" i]'),
    page.locator('button').filter({ has: page.locator('svg[data-lucide*="share" i]') }),
    page.locator('button').filter({ has: page.locator('svg[data-lucide*="external" i]') }),
  ];

  let shareBtn = null;
  for (const candidate of shareButtonCandidates) {
    const count = await candidate.count();
    if (count > 0) {
      console.log('Found share button via candidate');
      shareBtn = candidate.first();
      break;
    }
  }

  // Fallback: button near the URL span
  if (!shareBtn) {
    console.log('Trying fallback: button near URL span container');
    const spanParent = urlSpan.locator('xpath=ancestor::div[3]');
    const nearBtn = spanParent.locator('button').last();
    const nearCount = await nearBtn.count();
    if (nearCount > 0) shareBtn = nearBtn;
  }

  if (shareBtn) {
    const btnId = await shareBtn.getAttribute('id') || '';
    const btnAriaLabel = await shareBtn.getAttribute('aria-label') || '';
    console.log(`Clicking share button: id="${btnId}" aria-label="${btnAriaLabel}"`);
    await shareBtn.click();
    await page.waitForTimeout(2000);

    // ─── Inspect popover/popover content ─────────────────────────────────────────
    console.log('\n=== POPOVER CONTENT AFTER CLICK ===');
    const popovers = page.locator('[role="dialog"], [data-radix-popper-content-wrapper], [role="tooltip"], [data-state="open"]');
    const popoverCount = await popovers.count();
    console.log('Popovers/dialogs open:', popoverCount);
    for (let i = 0; i < popoverCount; i++) {
      const txt = (await popovers.nth(i).innerText().catch(() => '')).trim().substring(0, 400);
      const html = await popovers.nth(i).innerHTML().catch(() => '');
      console.log(`  popover[${i}]: "${txt}"`);
      console.log(`  HTML: ${html.substring(0, 800)}`);
    }

    // Look for the link and the "Open link" button
    console.log('\n=== BUTTONS IN POPOVER ===');
    const popoverBtns = page.locator('[data-state="open"] button, [data-radix-popper-content-wrapper] button');
    const popBtnCount = await popoverBtns.count();
    console.log('Buttons in popover:', popBtnCount);
    for (let i = 0; i < popBtnCount; i++) {
      const ariaLabel = await popoverBtns.nth(i).getAttribute('aria-label') || '';
      const txt = (await popoverBtns.nth(i).innerText().catch(() => '')).trim();
      console.log(`  btn[${i}]: aria-label="${ariaLabel}" text="${txt}"`);
    }

    // Look for anchor tags / links
    console.log('\n=== LINKS IN POPOVER ===');
    const popLinks = page.locator('[data-state="open"] a, [data-radix-popper-content-wrapper] a');
    const popLinkCount = await popLinks.count();
    console.log('Links in popover:', popLinkCount);
    for (let i = 0; i < popLinkCount; i++) {
      const href = await popLinks.nth(i).getAttribute('href') || '';
      const txt = (await popLinks.nth(i).innerText().catch(() => '')).trim();
      console.log(`  link[${i}]: href="${href}" text="${txt.substring(0, 100)}"`);
    }

    // Look for input with the URL (copy-to-clipboard pattern)
    console.log('\n=== INPUTS IN POPOVER ===');
    const popInputs = page.locator('[data-state="open"] input, [data-radix-popper-content-wrapper] input');
    const popInputCount = await popInputs.count();
    console.log('Inputs in popover:', popInputCount);
    for (let i = 0; i < popInputCount; i++) {
      const val = await popInputs.nth(i).inputValue().catch(() => '');
      const placeholder = await popInputs.nth(i).getAttribute('placeholder') || '';
      const readOnly = await popInputs.nth(i).getAttribute('readonly');
      console.log(`  input[${i}]: readonly=${readOnly} value="${val}" placeholder="${placeholder}"`);
    }

    await page.screenshot({ path: 'scripts/pb-share-popover.png', fullPage: true });
    console.log('\nScreenshot: pb-share-popover.png');

    // ─── Inspect the share button more carefully ──────────────────────────────────
    console.log('\n=== SHARE BUTTON DETAILS ===');
    const btnHTML = await shareBtn.evaluate(e => e.outerHTML.substring(0, 500));
    console.log(btnHTML);

    // SVG inside share button
    const svgs = shareBtn.locator('svg');
    const svgCount = await svgs.count();
    for (let i = 0; i < svgCount; i++) {
      const dataSvg = await svgs.nth(i).getAttribute('data-lucide') || '';
      const cls = await svgs.nth(i).getAttribute('class') || '';
      console.log(`  svg[${i}]: data-lucide="${dataSvg}" class="${cls.substring(0, 60)}"`);
    }
  } else {
    console.log('Share button NOT found via any candidate');
    await page.screenshot({ path: 'scripts/pb-share-notfound.png', fullPage: true });
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
