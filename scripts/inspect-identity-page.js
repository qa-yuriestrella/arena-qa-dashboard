require('dotenv').config();
const { chromium } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL    = process.env.TEST_USER_EMAIL || '';
const PASSWORD = process.env.TEST_USER_PASSWORD || '';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const page = await ctx.newPage();

  // Listen for ALL navigations
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('  → navigated to:', frame.url());
    }
  });

  console.log('\n1. Logging in...');
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible' });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  console.log('After login URL:', page.url());
  await page.waitForTimeout(2000);

  console.log('\n2. Navigating to /knowledge-base...');
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  console.log('After /knowledge-base URL:', page.url());
  await page.waitForTimeout(2000);

  const isOnboarding = await page.locator('h1, h2')
    .filter({ hasText: /Lock in your Identity/i })
    .isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Identity page detected:', isOnboarding);

  if (isOnboarding) {
    const lockBtn = page.getByRole('button', { name: 'Lock It In' });
    const lockVisible = await lockBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('"Lock It In" visible:', lockVisible);

    if (lockVisible) {
      console.log('\n3. Clicking "Lock It In"...');
      await lockBtn.click();
      console.log('  click sent');
      await page.waitForTimeout(5000); // wait 5s to see what happens
      console.log('After click URL:', page.url());

      const stillOnboarding = await page.locator('h1, h2')
        .filter({ hasText: /Lock in your Identity/i })
        .isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Still on identity page after click:', stillOnboarding);

      // Check for any error message
      const errorMsg = await page.locator('[role="alert"], .error, [class*="error"], [class*="toast"]')
        .first().innerText().catch(() => '(none)');
      console.log('Error/toast message:', errorMsg);
    }
  }

  console.log('\n4. Navigating to / to check avatar context...');
  await page.goto('/');
  await page.waitForLoadState('load');
  console.log('After / URL:', page.url());
  await page.waitForTimeout(3000);

  const isOnboarding2 = await page.locator('h1, h2')
    .filter({ hasText: /Lock in your Identity/i })
    .isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Identity page on /:', isOnboarding2);

  await page.screenshot({ path: require('path').join(__dirname, 'identity-page-result.png') });
  console.log('\nScreenshot saved to scripts/identity-page-result.png');

  await browser.close();
})();
