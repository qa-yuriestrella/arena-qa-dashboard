require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  // ─── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  await page.goto('/settings', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ─── Map sidebar nav buttons ──────────────────────────────────────────────────
  console.log('\n=== SIDEBAR NAV BUTTONS (main aside nav button) ===');
  const navBtns = page.locator('main aside nav button');
  const navCount = await navBtns.count();
  console.log('Nav count:', navCount);
  for (let i = 0; i < navCount; i++) {
    const txt = (await navBtns.nth(i).innerText()).trim();
    console.log(`  nav[${i}]: "${txt}"`);
  }

  // ─── Click Billing (index 4) ──────────────────────────────────────────────────
  console.log('\n=== CLICKING BILLING ===');
  const billingBtn = page.locator('main aside nav button', { hasText: /billing/i });
  const billingCount = await billingBtn.count();
  console.log('Billing button count:', billingCount);

  if (billingCount === 0) {
    // Fallback: try nth(4)
    console.log('Trying nth(4)...');
    await navBtns.nth(4).click();
  } else {
    await billingBtn.first().click();
  }
  await page.waitForTimeout(2000);
  console.log('URL after Billing click:', page.url());

  // ─── Plans & Usage content ────────────────────────────────────────────────────
  console.log('\n=== PAGE STRUCTURE ===');
  const pageText = await page.locator('main').innerText().catch(() => '');
  console.log('Main content (first 2000 chars):\n' + pageText.substring(0, 2000));

  // Inner tabs
  console.log('\n=== INNER TABS (role=tab) ===');
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  console.log('Tabs found:', tabCount);
  for (let i = 0; i < tabCount; i++) {
    const txt = (await tabs.nth(i).innerText()).trim();
    const state = await tabs.nth(i).getAttribute('data-state');
    const id = await tabs.nth(i).getAttribute('id') || '';
    console.log(`  tab[${i}]: "${txt}" | state="${state}" | id="${id}"`);
  }

  // All buttons on billing page
  console.log('\n=== BUTTONS ON BILLING PAGE ===');
  const btns = page.locator('main button');
  const btnCount = await btns.count();
  console.log('Button count:', btnCount);
  for (let i = 0; i < Math.min(btnCount, 25); i++) {
    const txt = (await btns.nth(i).innerText()).trim().substring(0, 60);
    const disabled = await btns.nth(i).isDisabled();
    const ariaLabel = await btns.nth(i).getAttribute('aria-label') || '';
    console.log(`  btn[${i}]: "${txt}" | disabled=${disabled} | aria-label="${ariaLabel}"`);
  }

  // Take screenshot of Plans & Usage
  await page.screenshot({ path: 'scripts/billing-plans-usage.png', fullPage: true });
  console.log('\nScreenshot: billing-plans-usage.png');

  // ─── Click Manage Plan ────────────────────────────────────────────────────────
  console.log('\n=== CLICKING MANAGE PLAN ===');
  const managePlanBtn = page.locator('main button', { hasText: /manage plan/i });
  const managePlanCount = await managePlanBtn.count();
  console.log('Manage Plan buttons found:', managePlanCount);

  if (managePlanCount > 0) {
    // Intercept API calls during manage plan
    const requests = [];
    page.on('request', req => {
      if (req.url().includes('/api/') || req.url().includes('/subscription') || req.url().includes('/plan')) {
        requests.push({ method: req.method(), url: req.url() });
      }
    });

    await managePlanBtn.first().click();
    await page.waitForTimeout(2000);
    console.log('URL after Manage Plan:', page.url());

    console.log('\n=== MANAGE PLAN PAGE/VIEW ===');
    const manageTxt = await page.locator('main').innerText().catch(() => '');
    console.log(manageTxt.substring(0, 3000));

    // Inner tabs on manage plan
    const tabs2 = page.locator('[role="tab"]');
    const tab2Count = await tabs2.count();
    console.log('\nTabs after Manage Plan:', tab2Count);
    for (let i = 0; i < tab2Count; i++) {
      const txt = (await tabs2.nth(i).innerText()).trim();
      const state = await tabs2.nth(i).getAttribute('data-state');
      console.log(`  tab[${i}]: "${txt}" | state="${state}"`);
    }

    // Buttons on manage plan
    console.log('\n=== BUTTONS ON MANAGE PLAN VIEW ===');
    const btns2 = page.locator('main button');
    const btn2Count = await btns2.count();
    for (let i = 0; i < Math.min(btn2Count, 30); i++) {
      const txt = (await btns2.nth(i).innerText()).trim().substring(0, 80);
      const disabled = await btns2.nth(i).isDisabled();
      const ariaLabel = await btns2.nth(i).getAttribute('aria-label') || '';
      console.log(`  btn[${i}]: "${txt}" | disabled=${disabled} | aria-label="${ariaLabel}"`);
    }

    // Plan card structure
    console.log('\n=== PLAN CARD HEADINGS ===');
    const headings = page.locator('main h1,main h2,main h3,main h4');
    const hCount = await headings.count();
    for (let i = 0; i < hCount; i++) {
      const txt = (await headings.nth(i).innerText()).trim();
      console.log(`  heading[${i}]: "${txt}"`);
    }

    // Check for 3-dot menu
    console.log('\n=== 3-DOT MENU (aria-haspopup=menu) ===');
    const menuBtns = page.locator('button[aria-haspopup="menu"]');
    const menuCount = await menuBtns.count();
    console.log('3-dot buttons:', menuCount);
    if (menuCount > 0) {
      await menuBtns.first().click();
      await page.waitForTimeout(500);
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

    await page.screenshot({ path: 'scripts/billing-manage-plan.png', fullPage: true });
    console.log('\nScreenshot: billing-manage-plan.png');

    // ─── Click "Choose this plan" on non-current plan (upgrade test) ─────────────
    console.log('\n=== TRYING CHOOSE THIS PLAN (UPGRADE) ===');
    const chooseBtns = page.locator('main button', { hasText: /choose this plan/i });
    const chooseCount = await chooseBtns.count();
    console.log('Choose this plan buttons:', chooseCount);

    if (chooseCount > 0) {
      // Intercept subscription API
      const subRequests = [];
      page.on('response', async resp => {
        const url = resp.url();
        if (url.includes('subscription') || url.includes('plan') || url.includes('billing')) {
          try {
            const json = await resp.json().catch(() => null);
            subRequests.push({ url, status: resp.status(), body: JSON.stringify(json).substring(0, 200) });
          } catch {}
        }
      });

      await chooseBtns.first().click();
      await page.waitForTimeout(2000);

      console.log('URL after Choose this plan:', page.url());
      const modalContent = await page.locator('main').innerText().catch(() => '');
      console.log('Content after Choose this plan (first 2000 chars):\n' + modalContent.substring(0, 2000));

      // Modal/dialog?
      const dialogs = page.locator('[role="dialog"]');
      const dialogCount = await dialogs.count();
      console.log('\nDialogs:', dialogCount);
      for (let i = 0; i < dialogCount; i++) {
        const txt = (await dialogs.nth(i).innerText().catch(() => '')).trim().substring(0, 300);
        console.log(`  dialog[${i}]: "${txt}"`);
      }

      // Buttons in upgrade view
      console.log('\n=== BUTTONS IN UPGRADE VIEW ===');
      const upgBtns = page.locator('main button');
      const upgCount = await upgBtns.count();
      for (let i = 0; i < Math.min(upgCount, 20); i++) {
        const txt = (await upgBtns.nth(i).innerText()).trim().substring(0, 80);
        const disabled = await upgBtns.nth(i).isDisabled();
        console.log(`  btn[${i}]: "${txt}" | disabled=${disabled}`);
      }

      if (subRequests.length > 0) {
        console.log('\n=== API REQUESTS CAPTURED ===');
        subRequests.forEach(r => console.log(`  ${r.url} [${r.status}]: ${r.body}`));
      }

      await page.screenshot({ path: 'scripts/billing-upgrade-view.png', fullPage: true });
      console.log('\nScreenshot: billing-upgrade-view.png');

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  } else {
    console.log('Manage Plan button NOT found');
    await page.screenshot({ path: 'scripts/billing-page.png', fullPage: true });
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
