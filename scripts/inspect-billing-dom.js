require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  // Go to home first (like ensurePrimaryAvatar does) then settings
  await page.goto('/', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.goto('/settings', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check nav structure after home visit
  console.log('\n=== NAV AFTER HOME VISIT ===');
  const navBtns = page.locator('main aside nav button');
  const navCount = await navBtns.count();
  console.log('main aside nav button count:', navCount);
  if (navCount > 0) {
    for (let i = 0; i < navCount; i++) {
      const txt = (await navBtns.nth(i).innerText()).trim();
      console.log(`  nav[${i}]: "${txt}"`);
    }
  }

  // Click Billing by text regardless
  const billingBtn = page.locator('button', { hasText: /^Billing$/ });
  await billingBtn.first().click();
  await page.waitForTimeout(2000);
  console.log('Clicked Billing, URL:', page.url());

  // Get the HTML of the tab panel (Plans & Usage content)
  console.log('\n=== TAB PANEL HTML ===');
  const tabPanel = page.locator('[role="tabpanel"]').first();
  const tabPanelVisible = await tabPanel.isVisible().catch(() => false);
  console.log('Tab panel visible:', tabPanelVisible);
  if (tabPanelVisible) {
    const html = await tabPanel.innerHTML().catch(() => '');
    console.log('Tab panel HTML (first 3000 chars):\n' + html.substring(0, 3000));
  }

  // Dump full main text
  console.log('\n=== FULL MAIN TEXT ===');
  const mainEl = page.locator('main').first();
  const mainText = await mainEl.innerText().catch(() => '');
  console.log('Main innerText:\n' + mainText.substring(0, 2000));

  // Try locating specific billing content elements
  console.log('\n=== SPECIFIC SELECTORS ===');

  const planInfoHeader = page.locator('text=Plan Information');
  console.log('Plan Information count:', await planInfoHeader.count());

  const nextRenewal = page.locator('text=Next Renewal');
  console.log('Next Renewal count:', await nextRenewal.count());

  const currentPlan = page.locator('text=Current Plan');
  console.log('Current Plan text count:', await currentPlan.count());

  const quotaLimits = page.locator('text=Quota Limits');
  console.log('Quota Limits count:', await quotaLimits.count());

  const usageLabel = page.locator('text=Usage');
  console.log('Usage count:', await usageLabel.count());

  // Get the element containing "Current Plan" and check its parent structure
  if (await currentPlan.count() > 0) {
    const el = currentPlan.first();
    const parentHTML = await el.evaluate(node => {
      let p = node.parentElement;
      // Go up 3 levels to get the row/container
      for (let i = 0; i < 3; i++) {
        if (p) p = p.parentElement;
      }
      return p ? p.outerHTML.substring(0, 500) : 'no parent';
    });
    console.log('\nParent HTML around "Current Plan" (3 levels up):\n' + parentHTML);

    // Check sibling or nearby bold/strong element for plan name
    const planNameEl = page.locator('text=Current Plan').locator('..').locator('strong, b, [class*="font-bold"], [class*="font-semibold"]');
    const planNameCount = await planNameEl.count();
    console.log('Plan name bold element count:', planNameCount);
    if (planNameCount > 0) {
      console.log('Plan name text:', await planNameEl.first().innerText());
    }
  }

  // Get "Next Renewal" row value
  if (await nextRenewal.count() > 0) {
    const renewalRow = await nextRenewal.first().evaluate(node => {
      let p = node.parentElement;
      for (let i = 0; i < 2; i++) {
        if (p) p = p.parentElement;
      }
      return p ? p.innerText.trim() : 'no parent';
    });
    console.log('\nNext Renewal row text:', renewalRow);
  }

  // ─── Navigate to 3-dot menu ────────────────────────────────────────────────
  console.log('\n=== MORE PLAN OPTIONS MENU ===');
  const moreBtn = page.locator('button[aria-label="More plan options"]');
  console.log('More plan options button count:', await moreBtn.count());
  if (await moreBtn.count() > 0) {
    await moreBtn.click();
    await page.waitForTimeout(800);
    const menuItems = page.locator('[role="menuitem"]');
    const itemCount = await menuItems.count();
    console.log('Menu items:', itemCount);
    for (let i = 0; i < itemCount; i++) {
      const txt = (await menuItems.nth(i).innerText()).trim();
      console.log(`  item[${i}]: "${txt}"`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // ─── Inspect plan cards structure in Manage Plan ──────────────────────────
  console.log('\n=== MANAGE PLAN - PLAN CARD DOM ===');
  const managePlanBtn = page.locator('button', { hasText: /^Manage Plan$/ });
  if (await managePlanBtn.count() > 0) {
    await managePlanBtn.click();
    await page.waitForTimeout(2000);

    // Get plan card HTML structure
    const planCards = page.locator('h3, h4').filter({ hasText: /starter|professional|business/i });
    const cardCount = await planCards.count();
    console.log('Plan name headings:', cardCount);
    for (let i = 0; i < cardCount; i++) {
      const txt = (await planCards.nth(i).innerText()).trim();
      const parentHTML = await planCards.nth(i).evaluate(node => {
        let p = node.parentElement;
        for (let j = 0; j < 2; j++) {
          if (p) p = p.parentElement;
        }
        return p ? p.outerHTML.substring(0, 600) : 'no parent';
      });
      console.log(`\n  Card[${i}]: "${txt}"`);
      console.log('  Card container HTML:\n  ' + parentHTML.substring(0, 400));
    }

    // Check if "Your Current Plan" button has a data attribute that identifies the plan
    const currentPlanBtn = page.locator('button', { hasText: 'Your Current Plan' });
    const currentPlanBtnCount = await currentPlanBtn.count();
    console.log('\nYour Current Plan button count:', currentPlanBtnCount);
    if (currentPlanBtnCount > 0) {
      const parentHTML = await currentPlanBtn.first().evaluate(node => {
        let p = node;
        for (let i = 0; i < 4; i++) {
          if (p.parentElement) p = p.parentElement;
        }
        return p.outerHTML.substring(0, 800);
      });
      console.log('Current plan card container (4 levels up):\n' + parentHTML.substring(0, 600));
    }

    // Check for "Choose this plan" - get parent context
    const chooseBtns = page.locator('button', { hasText: 'Choose this plan' });
    const chooseCount = await chooseBtns.count();
    console.log('\nChoose this plan count:', chooseCount);
    for (let i = 0; i < chooseCount; i++) {
      const parentHTML = await chooseBtns.nth(i).evaluate(node => {
        let p = node;
        for (let j = 0; j < 3; j++) {
          if (p.parentElement) p = p.parentElement;
        }
        return p.innerText.trim().substring(0, 200);
      });
      console.log(`  Choose[${i}] parent text: "${parentHTML}"`);
    }

    // Check for "Back" button
    const backBtn = page.locator('button', { hasText: /^Back$/ });
    console.log('\nBack button count:', await backBtn.count());
  }

  await page.screenshot({ path: 'scripts/billing-dom-check.png', fullPage: true });
  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
