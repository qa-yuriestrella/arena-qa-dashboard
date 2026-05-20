require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible' });
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  console.log('Logged in OK');

  await page.goto('/settings');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1000);
  await page.locator('main aside nav button').nth(1).click();
  await page.waitForTimeout(500);
  await page.locator('[id$="-trigger-invites"]').click();
  await page.waitForTimeout(1500);

  const rows = page.locator('#invites table tbody tr');
  const count = await rows.count();
  console.log('Rows:', count);
  for (let i = 0; i < count; i++) {
    const email = await rows.nth(i).locator('td').first().innerText();
    console.log(`  [${i}] ${email.trim()}`);
  }

  if (count === 0) { console.log('Nothing to delete'); await browser.close(); return; }

  // Step-by-step delete first row
  const row0 = rows.first();
  const email0 = (await row0.locator('td').first().innerText()).trim();
  console.log('\nDeleting:', email0);

  const menuBtn = row0.locator('button[aria-haspopup="menu"]');
  console.log('Menu button visible:', await menuBtn.isVisible());
  await menuBtn.click();
  console.log('Clicked menu button');
  await page.waitForTimeout(800);

  const menuItems = page.locator('[role="menuitem"]');
  const itemCount = await menuItems.count();
  console.log('Menu items:', itemCount);
  for (let i = 0; i < itemCount; i++) {
    console.log(`  Item ${i}: "${await menuItems.nth(i).innerText()}"`);
  }

  if (itemCount > 0) {
    console.log('Clicking last item...');
    await menuItems.last().click();
    await page.waitForTimeout(800);
  }

  // Check page state after delete click
  console.log('\nState after Delete click:');
  const allDialogs = page.locator('[role="dialog"]');
  console.log('  [role="dialog"] count:', await allDialogs.count());
  for (let i = 0; i < await allDialogs.count(); i++) {
    const text = (await allDialogs.nth(i).innerText().catch(() => '')).trim().substring(0, 150);
    const hasBgDestr = await allDialogs.nth(i).locator('button.bg-destructive').count();
    console.log(`  Dialog ${i}: "${text}" | bg-destructive buttons: ${hasBgDestr}`);
  }

  // Try clicking bg-destructive
  const destrBtn = page.locator('button.bg-destructive');
  const destrCount = await destrBtn.count();
  console.log('\nbg-destructive buttons anywhere:', destrCount);
  if (destrCount > 0) {
    console.log('Clicking it...');
    await destrBtn.first().click();
    await page.waitForTimeout(1500);
  }

  console.log('\nFinal row count:', await rows.count());

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
