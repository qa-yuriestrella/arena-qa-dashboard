require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  // ─── Capture all requests ─────────────────────────────────────────────────────
  const captured = [];
  page.on('request', req => {
    const url = req.url();
    const method = req.method();
    if (method !== 'GET' || url.includes('stg-dash-avatar') || url.includes('arena')) {
      captured.push({ type: 'REQ', method, url: url.substring(0, 150) });
    }
  });
  page.on('response', async resp => {
    const url = resp.url();
    const status = resp.status();
    if (
      url.includes('stg-dash-avatar') || url.includes('arena') ||
      (url.includes('chargebee') && resp.request().method() !== 'GET')
    ) {
      try {
        const json = await resp.json().catch(() => null);
        captured.push({
          type: 'RES',
          status,
          url: url.substring(0, 150),
          body: json ? JSON.stringify(json).substring(0, 400) : '<non-json>'
        });
      } catch {
        captured.push({ type: 'RES', status, url: url.substring(0, 150), body: '' });
      }
    }
  });

  // ─── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  // ─── Navigate to Billing > Payment Method ─────────────────────────────────────
  await page.goto('/settings', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('nav button').nth(4).click();
  await page.waitForTimeout(2000);
  await page.locator('[role="tab"]', { hasText: /payment method/i }).click();
  await page.waitForTimeout(2000);
  console.log('On Payment Method tab');

  // Current card info
  const panelText = await page.locator('#payment').innerText().catch(() => '');
  console.log('\nPayment Method panel text:\n' + panelText);

  // ─── Click Change Credit Card ─────────────────────────────────────────────────
  captured.length = 0; // clear before form submit
  await page.locator('button', { hasText: /change credit card/i }).click();
  await page.waitForTimeout(3000);
  console.log('Change Credit Card clicked');

  // ─── Fill form ────────────────────────────────────────────────────────────────
  const dialog = page.locator('[role="dialog"]');
  await dialog.locator('#name').fill('Test Automation');
  await dialog.locator('#email').fill(process.env.TEST_USER_EMAIL);
  await page.waitForTimeout(500);

  // Card number iframe
  const numberFrame = page.frameLocator('iframe[name="cb-component-number-0"]');
  const cardInput = numberFrame.locator('input[type="tel"]').first();
  await cardInput.click();
  await cardInput.fill('4111111111111111');
  await page.waitForTimeout(500);

  // Expiry iframe
  const expiryFrame = page.frameLocator('iframe[name="cb-component-expiry-1"]');
  const expiryInput = expiryFrame.locator('input[type="tel"]').first();
  await expiryInput.click();
  await expiryInput.fill('12/29');
  await page.waitForTimeout(500);

  // CVV iframe
  const cvvFrame = page.frameLocator('iframe[name="cb-component-cvv-2"]');
  const cvvInput = cvvFrame.locator('input[type="tel"]').first();
  await cvvInput.click();
  await cvvInput.fill('737');
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'scripts/billing-cc-filled.png', fullPage: true });
  console.log('Screenshot: billing-cc-filled.png (form filled)');

  // ─── Submit ───────────────────────────────────────────────────────────────────
  console.log('\nClicking Save...');
  captured.length = 0;

  const saveBtn = dialog.locator('button[type="submit"]', { hasText: /save/i });
  await saveBtn.click();

  await page.waitForTimeout(8000); // wait for chargebee + arena calls

  await page.screenshot({ path: 'scripts/billing-cc-saved.png', fullPage: true });
  console.log('Screenshot: billing-cc-saved.png (after save)');

  // ─── Report captured requests ─────────────────────────────────────────────────
  console.log('\n=== ALL REQUESTS AFTER SAVE ===');
  for (const c of captured) {
    if (c.type === 'REQ') {
      console.log(`  [${c.method}] ${c.url}`);
    } else {
      console.log(`  <- [${c.status}] ${c.url}`);
      if (c.body && c.body !== '<non-json>') console.log(`     ${c.body}`);
    }
  }

  // Check what's visible after save
  console.log('\n=== PAGE AFTER SAVE ===');
  const pageText = await page.locator('main').innerText().catch(() => '');
  console.log(pageText.substring(0, 2000));

  // Dialog still open?
  const dialogVisible = await dialog.isVisible().catch(() => false);
  console.log('Dialog still visible:', dialogVisible);

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
