require('dotenv').config();
const { chromium } = require('@playwright/test');

(async () => {
  const BASE = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  // ─── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL);
  await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  console.log('Logged in OK');

  // ─── Navigate to Billing ──────────────────────────────────────────────────────
  await page.goto('/settings', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.locator('nav button').nth(4).click();
  await page.waitForTimeout(2000);
  console.log('On Billing page');

  // ─── Inner tabs ───────────────────────────────────────────────────────────────
  console.log('\n=== BILLING INNER TABS ===');
  const tabs = page.locator('[role="tab"]');
  const tabCount = await tabs.count();
  for (let i = 0; i < tabCount; i++) {
    const txt = (await tabs.nth(i).innerText()).trim();
    const state = await tabs.nth(i).getAttribute('data-state');
    const id = await tabs.nth(i).getAttribute('id') || '';
    const value = await tabs.nth(i).getAttribute('value') || '';
    console.log(`  tab[${i}]: "${txt}" | state="${state}" | id="${id}" | value="${value}"`);
  }

  // ─── Click Payment Method tab ─────────────────────────────────────────────────
  console.log('\n=== CLICKING PAYMENT METHOD TAB ===');
  const pmTab = page.locator('[role="tab"]', { hasText: /payment method/i });
  await pmTab.click();
  await page.waitForTimeout(2000);

  // Tab panel id
  const pmTabId = await pmTab.getAttribute('id') || '';
  const pmTabAriaControls = await pmTab.getAttribute('aria-controls') || '';
  console.log(`Payment Method tab id="${pmTabId}" aria-controls="${pmTabAriaControls}"`);

  // ─── Payment Method tab content ───────────────────────────────────────────────
  console.log('\n=== PAYMENT METHOD CONTENT ===');
  const mainText = await page.locator('main').innerText().catch(() => '');
  console.log(mainText.substring(0, 3000));

  // Active tab panel
  const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
  const panelCount = await activePanel.count();
  console.log('\nActive tab panels:', panelCount);
  for (let i = 0; i < panelCount; i++) {
    const id = await activePanel.nth(i).getAttribute('id') || '';
    const html = await activePanel.nth(i).innerHTML().catch(() => '').then(h => h.substring(0, 2000));
    console.log(`  panel[${i}] id="${id}":\n${html}\n`);
  }

  // ─── Buttons on Payment Method ────────────────────────────────────────────────
  console.log('\n=== BUTTONS ON PAYMENT METHOD TAB ===');
  const btns = page.locator('main button');
  const btnCount = await btns.count();
  for (let i = 0; i < Math.min(btnCount, 30); i++) {
    const txt = (await btns.nth(i).innerText()).trim().substring(0, 80);
    const disabled = await btns.nth(i).isDisabled();
    const ariaLabel = await btns.nth(i).getAttribute('aria-label') || '';
    console.log(`  btn[${i}]: "${txt}" | disabled=${disabled} | aria-label="${ariaLabel}"`);
  }

  await page.screenshot({ path: 'scripts/billing-payment-method.png', fullPage: true });
  console.log('\nScreenshot: billing-payment-method.png');

  // ─── Click Change Credit Card ─────────────────────────────────────────────────
  console.log('\n=== CLICKING CHANGE CREDIT CARD ===');
  const changeCCBtn = page.locator('button', { hasText: /change credit card/i });
  const changeCCCount = await changeCCBtn.count();
  console.log('Change Credit Card buttons found:', changeCCCount);

  if (changeCCCount > 0) {
    // Capture requests before clicking
    const apiRequests = [];
    page.on('request', req => {
      const url = req.url();
      if (!url.includes('.png') && !url.includes('.svg') && !url.includes('.css') && !url.includes('.js')) {
        apiRequests.push({ method: req.method(), url: url.substring(0, 120) });
      }
    });
    page.on('response', async resp => {
      const url = resp.url();
      if (url.includes('payment') || url.includes('card') || url.includes('billing') || url.includes('chargebee')) {
        try {
          const json = await resp.json().catch(() => null);
          if (json) console.log(`RESPONSE [${resp.status()}] ${url.substring(0, 100)}: ${JSON.stringify(json).substring(0, 300)}`);
        } catch {}
      }
    });

    await changeCCBtn.first().click();
    await page.waitForTimeout(3000);
    console.log('URL after Change Credit Card:', page.url());

    // ─── Modal/dialog content ─────────────────────────────────────────────────
    const dialogs = page.locator('[role="dialog"]');
    const dialogCount = await dialogs.count();
    console.log('\nDialogs after Change Credit Card:', dialogCount);
    for (let i = 0; i < dialogCount; i++) {
      const id = await dialogs.nth(i).getAttribute('id') || '';
      const txt = (await dialogs.nth(i).innerText().catch(() => '')).trim().substring(0, 500);
      console.log(`  dialog[${i}] id="${id}": "${txt}"`);
    }

    // ─── Check for iframes (Chargebee) ───────────────────────────────────────
    console.log('\n=== IFRAMES ===');
    const frames = page.frames();
    console.log('Total frames:', frames.length);
    for (const frame of frames) {
      const url = frame.url();
      const name = frame.name();
      console.log(`  frame: name="${name}" url="${url.substring(0, 120)}"`);
    }

    const iframes = page.locator('iframe');
    const iframeCount = await iframes.count();
    console.log('iframe elements:', iframeCount);
    for (let i = 0; i < iframeCount; i++) {
      const src = await iframes.nth(i).getAttribute('src') || '';
      const id = await iframes.nth(i).getAttribute('id') || '';
      const name = await iframes.nth(i).getAttribute('name') || '';
      console.log(`  iframe[${i}]: id="${id}" name="${name}" src="${src.substring(0, 100)}"`);
    }

    // ─── Modal buttons ────────────────────────────────────────────────────────
    console.log('\n=== BUTTONS AFTER CHANGE CREDIT CARD ===');
    const modalBtns = page.locator('[role="dialog"] button');
    const modalBtnCount = await modalBtns.count();
    console.log('Buttons in dialog:', modalBtnCount);
    for (let i = 0; i < modalBtnCount; i++) {
      const txt = (await modalBtns.nth(i).innerText()).trim().substring(0, 80);
      const disabled = await modalBtns.nth(i).isDisabled();
      const type = await modalBtns.nth(i).getAttribute('type') || '';
      console.log(`  btn[${i}]: "${txt}" | disabled=${disabled} | type="${type}"`);
    }

    // ─── Form inputs ──────────────────────────────────────────────────────────
    console.log('\n=== FORM INPUTS ===');
    const inputs = page.locator('[role="dialog"] input');
    const inputCount = await inputs.count();
    console.log('Inputs in dialog:', inputCount);
    for (let i = 0; i < inputCount; i++) {
      const type = await inputs.nth(i).getAttribute('type') || '';
      const placeholder = await inputs.nth(i).getAttribute('placeholder') || '';
      const name = await inputs.nth(i).getAttribute('name') || '';
      const id = await inputs.nth(i).getAttribute('id') || '';
      console.log(`  input[${i}]: type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
    }

    // ─── Full HTML of dialog ──────────────────────────────────────────────────
    console.log('\n=== DIALOG HTML (first 3000 chars) ===');
    for (let i = 0; i < dialogCount; i++) {
      const html = await dialogs.nth(i).innerHTML().catch(() => '');
      console.log(`dialog[${i}]:\n${html.substring(0, 3000)}\n`);
    }

    await page.screenshot({ path: 'scripts/billing-change-cc.png', fullPage: true });
    console.log('\nScreenshot: billing-change-cc.png');

    // ─── Try to interact with Chargebee iframe ────────────────────────────────
    console.log('\n=== TRYING TO FILL CHARGEBEE FORM ===');
    // Chargebee uses iframes for card fields - try to locate them
    const cbFrames = page.frames().filter(f => f.url().includes('chargebee') || f.url().includes('js.chargebee'));
    console.log('Chargebee frames:', cbFrames.length);

    for (const frame of cbFrames) {
      console.log(`  Chargebee frame url: ${frame.url()}`);
      try {
        const inputs = frame.locator('input');
        const count = await inputs.count();
        console.log(`  Inputs in chargebee frame: ${count}`);
        for (let i = 0; i < count; i++) {
          const ph = await inputs.nth(i).getAttribute('placeholder') || '';
          const type = await inputs.nth(i).getAttribute('type') || '';
          console.log(`    input[${i}]: type="${type}" placeholder="${ph}"`);
        }
      } catch (e) {
        console.log('  Error accessing chargebee frame:', e.message);
      }
    }

    // Try locating card number field by label
    const cardNumberLocators = [
      'input[placeholder*="card" i]',
      'input[placeholder*="número" i]',
      'input[name*="card" i]',
      '#card-number',
      '[id*="card-number" i]',
    ];
    for (const loc of cardNumberLocators) {
      const el = page.locator(loc);
      const count = await el.count();
      if (count > 0) console.log(`Found card input via: ${loc} (count=${count})`);
    }

    await page.waitForTimeout(2000);

    // Check requests made
    if (apiRequests.length > 0) {
      console.log('\n=== API REQUESTS (non-static) ===');
      apiRequests.slice(0, 20).forEach(r => console.log(`  [${r.method}] ${r.url}`));
    }
  }

  await browser.close();
  console.log('\nDone.');
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
