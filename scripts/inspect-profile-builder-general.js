require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  // suppress health popper
  await page.addInitScript(() => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key && key.startsWith('avatar-health-shown-')) return 'true';
      return orig.call(this, key);
    };
  });

  // ─── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  // ─── Navigate to Profile Builder General ─────────────────────────────────────
  await page.goto('/profile-builder', { waitUntil: 'load', timeout: 30000 });
  await page.getByText('Set the basic information of your profile').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('On Profile Builder General tab');

  // ─── Current field values ─────────────────────────────────────────────────────
  const currentTitle = await page.locator('#title').inputValue().catch(() => '');
  const currentSlug = await page.locator('#slug').inputValue().catch(() => '');
  console.log('\nCurrent title:', currentTitle);
  console.log('Current slug:', currentSlug);

  // ─── Search for "Share your Avatar" section ───────────────────────────────────
  console.log('\n=== SEARCHING FOR "SHARE YOUR AVATAR" ===');
  const shareText = page.getByText(/share your avatar/i);
  const shareCount = await shareText.count();
  console.log('Share your Avatar elements:', shareCount);
  for (let i = 0; i < shareCount; i++) {
    const el = shareText.nth(i);
    const tag = await el.evaluate(e => e.tagName);
    const parentHTML = await el.evaluate(e => {
      let p = e.parentElement;
      for (let j = 0; j < 4; j++) { if (p) p = p.parentElement; }
      return p ? p.outerHTML.substring(0, 800) : 'no parent';
    });
    console.log(`  [${i}] tag=${tag}`);
    console.log('  Parent HTML:\n' + parentHTML.substring(0, 600));
  }

  // ─── Search for any URL display showing the slug ──────────────────────────────
  console.log('\n=== ELEMENTS CONTAINING CURRENT SLUG ===');
  if (currentSlug) {
    const slugEls = page.getByText(currentSlug, { exact: false });
    const slugCount = await slugEls.count();
    console.log(`Elements containing "${currentSlug}": ${slugCount}`);
    for (let i = 0; i < Math.min(slugCount, 10); i++) {
      const el = slugEls.nth(i);
      const tag = await el.evaluate(e => e.tagName);
      const text = await el.innerText().catch(() => '');
      const parentText = await el.evaluate(e => e.parentElement?.innerText?.() || '').catch(() => '');
      console.log(`  [${i}] tag=${tag} text="${text.substring(0, 100)}" parentText="${parentText.substring(0, 100)}"`);
    }
  }

  // ─── Look for share/link related elements ────────────────────────────────────
  console.log('\n=== LINKS AND SHARE ELEMENTS ===');
  const shareLinks = page.locator('a[href*="arena.im"], a[href*="myavatr"]');
  const linkCount = await shareLinks.count();
  console.log('Arena/myavatr links:', linkCount);
  for (let i = 0; i < Math.min(linkCount, 10); i++) {
    const href = await shareLinks.nth(i).getAttribute('href') || '';
    const text = await shareLinks.nth(i).innerText().catch(() => '');
    console.log(`  link[${i}]: href="${href}" text="${text.substring(0, 80)}"`);
  }

  // ─── Scan all paragraphs and spans for URLs ───────────────────────────────────
  console.log('\n=== P/SPAN ELEMENTS CONTAINING URL PATTERN ===');
  const urlEls = page.locator('p, span').filter({ hasText: /arena\.im|myavatr\.ai|dev-avatar|stg-dash/i });
  const urlElCount = await urlEls.count();
  console.log('URL-containing p/span elements:', urlElCount);
  for (let i = 0; i < Math.min(urlElCount, 10); i++) {
    const text = await urlEls.nth(i).innerText().catch(() => '');
    const id = await urlEls.nth(i).getAttribute('id') || '';
    const cls = (await urlEls.nth(i).getAttribute('class') || '').substring(0, 80);
    console.log(`  [${i}] id="${id}" class="${cls}" text="${text.substring(0, 150)}"`);
  }

  // ─── Full page text scan ──────────────────────────────────────────────────────
  console.log('\n=== FULL MAIN TEXT ===');
  const mainText = await page.locator('main').innerText().catch(() => '');
  console.log(mainText.substring(0, 3000));

  // ─── Screenshot ───────────────────────────────────────────────────────────────
  await page.screenshot({ path: 'scripts/pb-general-full.png', fullPage: true });
  console.log('\nScreenshot: pb-general-full.png');

  // ─── Title maxlength attribute ────────────────────────────────────────────────
  console.log('\n=== TITLE INPUT ATTRIBUTES ===');
  const titleAttrs = await page.locator('#title').evaluate(el => ({
    maxlength: el.getAttribute('maxlength'),
    maxLength: el.maxLength,
    type: el.type,
    value: el.value,
    class: el.className.substring(0, 100),
  }));
  console.log(JSON.stringify(titleAttrs, null, 2));

  // Try typing 40 chars into title field and see how many are accepted
  console.log('\n=== TEST: FILL TITLE WITH 40 CHARS ===');
  const fortyChars = 'A'.repeat(40);
  await page.locator('#title').clear();
  await page.locator('#title').fill(fortyChars);
  const titleValueAfterFill = await page.locator('#title').inputValue();
  console.log('Length after filling 40 A chars:', titleValueAfterFill.length);
  console.log('Value:', titleValueAfterFill);

  // Check for character counter near title
  const titleArea = page.locator('#title').locator('xpath=ancestor::div[3]');
  const titleAreaText = await titleArea.innerText().catch(() => '');
  console.log('Area around #title:', titleAreaText.substring(0, 300));

  // Restore title
  await page.locator('#title').fill(currentTitle);

  // ─── After slug change, check if share URL updates ───────────────────────────
  console.log('\n=== TEST: CHANGE SLUG AND CHECK URL UPDATE ===');
  const newSlug = `e2etest${Date.now() % 100000}`;
  console.log('New slug to try:', newSlug);

  // Note current share URL before change
  const preChangeShareEls = await page.locator('p, span, a').filter({ hasText: /arena\.im|myavatr/i }).allInnerTexts();
  console.log('Pre-change share elements:', preChangeShareEls.slice(0, 5));

  // Change slug
  await page.locator('#slug').clear();
  await page.locator('#slug').fill(newSlug);
  await page.locator('#slug').blur();
  await page.waitForTimeout(1000);

  // Check if any URL display updates reactively (before saving)
  const midChangeShareEls = await page.locator('p, span, a').filter({ hasText: new RegExp(newSlug, 'i') }).allInnerTexts().catch(() => []);
  console.log('Mid-change (after blur, before save) elements with new slug:', midChangeShareEls.slice(0, 5));

  // Save
  console.log('Saving...');
  const saveBtn = page.getByRole('button', { name: /^save$/i }).first();
  await saveBtn.click();
  await page.waitForTimeout(5000);
  console.log('URL after save:', page.url());

  // After save, check the URL display WITHOUT navigating
  // (If app redirected to /knowledge-base, navigate back)
  if (page.url().includes('knowledge-base')) {
    console.log('App redirected to knowledge-base after slug change (expected)');
    await page.goto('/profile-builder', { waitUntil: 'load', timeout: 30000 });
    await page.getByText('Set the basic information of your profile').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(2000);
  }

  // Check share URL now
  const postSaveShareEls = await page.locator('p, span, a').filter({ hasText: new RegExp(newSlug, 'i') }).allInnerTexts().catch(() => []);
  console.log('Post-save elements with new slug:', postSaveShareEls.slice(0, 5));

  // Search for share section again with new slug
  const shareSection = page.getByText(/share your avatar/i);
  const shareSectionCount = await shareSection.count();
  if (shareSectionCount > 0) {
    const parentHTML = await shareSection.first().evaluate(e => {
      let p = e.parentElement;
      for (let j = 0; j < 5; j++) { if (p) p = p.parentElement; }
      return p ? p.outerHTML.substring(0, 1000) : 'no parent';
    });
    console.log('\nShare section after save:\n' + parentHTML.substring(0, 800));
  }

  await page.screenshot({ path: 'scripts/pb-general-after-slug.png', fullPage: true });
  console.log('Screenshot: pb-general-after-slug.png');

  // ─── Restore original slug ────────────────────────────────────────────────────
  if (currentSlug && currentSlug !== newSlug) {
    await page.locator('#slug').clear();
    await page.locator('#slug').fill(currentSlug);
    await page.locator('#slug').blur();
    await page.locator('#title').fill(currentTitle);
    await page.getByRole('button', { name: /^save$/i }).first().click();
    await page.waitForTimeout(5000);
    console.log('\nOriginal slug restored');
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
