/**
 * Diagnostic: captures all voice-related buttons/DOM and network calls when
 * the "Make Audio Calls" skill toggle is clicked in automation2arena, then
 * shows the EU state before and after.
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');

const BASE_URL    = process.env.BASE_URL    || 'https://stg-dash-avatar.arena.im';
const MODERN_EU   = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';
const EMAIL       = process.env.TEST_USER_EMAIL    || '';
const PASSWORD    = process.env.TEST_USER_PASSWORD || '';
const MODERN_SLUG = 'automation2arena';

async function dumpVoiceButtons(page, label) {
  const btns = await page.evaluate(() => {
    const kw = ['voice', 'call', 'phone', 'audio', 'mic'];
    const getClass = el => (typeof el.className === 'string' ? el.className : el.className?.baseVal || '');
    return [...document.querySelectorAll('button, [role="button"]')]
      .filter(el => {
        const a = (el.getAttribute('aria-label') || '').toLowerCase();
        const c = getClass(el).toLowerCase();
        const t = (el.textContent || '').toLowerCase();
        return kw.some(k => a.includes(k) || t.includes(k));
      })
      .map(el => ({
        tag:      el.tagName,
        ariaLabel: el.getAttribute('aria-label') || '',
        text:     (el.textContent || '').trim().slice(0, 40),
        disabled: el.disabled,
        ariaDisabled: el.getAttribute('aria-disabled'),
        visible:  el.offsetParent !== null && getComputedStyle(el).display !== 'none' &&
                  getComputedStyle(el).visibility !== 'hidden',
        opacity:  getComputedStyle(el).opacity,
        class:    getClass(el).slice(0, 120),
        rect:     JSON.stringify(el.getBoundingClientRect()),
      }));
  });
  console.log(`\n=== ${label} ===`);
  if (btns.length === 0) console.log('  (no voice/call/phone buttons found)');
  btns.forEach(b => console.log(JSON.stringify(b)));
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const page = await ctx.newPage();

  // Capture all network requests going to skill/commerce-ai/voice endpoints
  const captured = [];
  page.on('request', req => {
    const url = req.url();
    if (/skill|voice|commerce-ai|audio/i.test(url)) {
      captured.push({ dir: '→', method: req.method(), url: url.slice(0, 120) });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (/skill|voice|commerce-ai|audio/i.test(url)) {
      let body = '';
      try { body = JSON.stringify(await res.json()).slice(0, 200); } catch {}
      captured.push({ dir: '←', status: res.status(), url: url.slice(0, 120), body });
    }
  });

  // ── Log in ──────────────────────────────────────────────────────────────────
  console.log('\n[1] Logging in...');
  await page.goto('/login');
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  console.log('  Logged in. URL:', page.url());

  // ── Switch to automation2arena if needed ─────────────────────────────────
  if (!page.url().includes(MODERN_SLUG)) {
    console.log('\n[2] Switching to automation2arena avatar...');
    // Try clicking avatar switcher — look for a dropdown or list
    const avatarMenu = page.locator('[aria-label*="avatar" i], [aria-label*="switch" i], [class*="avatar-switch" i]').first();
    const menuVisible = await avatarMenu.isVisible({ timeout: 3000 }).catch(() => false);
    if (menuVisible) {
      await avatarMenu.click();
      const modernItem = page.getByText(MODERN_SLUG, { exact: false }).first();
      await modernItem.click({ timeout: 5000 });
    } else {
      // Directly navigate
      await page.goto(`/${MODERN_SLUG}/knowledge-base`);
    }
    await page.waitForLoadState('load');
    console.log('  URL:', page.url());
  }

  // ── Go to KB and open Audio Skill drawer ─────────────────────────────────
  if (!page.url().includes('/knowledge-base')) {
    await page.goto(`/${MODERN_SLUG}/knowledge-base`);
    await page.waitForLoadState('load');
  }
  console.log('\n[3] On KB page:', page.url());
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Dismiss Avatar Quality panel if present
  const aqVisible = await page.locator('div').filter({ hasText: /^AVATAR QUALITY$/ }).first()
    .isVisible({ timeout: 2000 }).catch(() => false);
  if (aqVisible) {
    console.log('  Avatar Quality panel visible — dismissing...');
    await page.evaluate(() => {
      const h = [...document.querySelectorAll('p,span,div')].find(e => e.textContent?.trim() === 'AVATAR QUALITY');
      if (!h) return;
      let p = h.parentElement;
      while (p && p !== document.body) { if (window.getComputedStyle(p).position === 'fixed') break; p = p.parentElement; }
      if (!p || p === document.body) return;
      const pr = p.getBoundingClientRect();
      const btn = p.querySelector('[aria-label="Close"]') ||
        [...p.querySelectorAll('button')].find(b => {
          const t = b.textContent?.trim();
          if (['×','✕','✖','X','Close'].includes(t)) return true;
          const r = b.getBoundingClientRect();
          return r.width <= 50 && r.top <= pr.top + 60 && r.right >= pr.right - 60;
        });
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
  }

  // Click Skills button
  const skillsBtn = page.getByRole('button', { name: /skills/i }).first();
  await skillsBtn.waitFor({ state: 'visible', timeout: 10000 });
  await skillsBtn.click();
  await page.waitForTimeout(1000);

  // Click "Make Audio Calls"
  const macBtn = page.getByRole('button', { name: /make audio calls/i }).first();
  await macBtn.waitFor({ state: 'visible', timeout: 10000 });
  await macBtn.click();
  await page.waitForTimeout(1000);

  // Find the drawer
  const drawer = page.getByRole('dialog', { name: /audio skill/i });
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
  console.log('\n[4] Audio Skill drawer open.');

  // Dump ALL switches and their state
  const switches = await drawer.evaluate(el => {
    return [...el.querySelectorAll('[role="switch"], input[type="checkbox"], input[type="radio"]')]
      .map(s => ({
        role: s.getAttribute('role') || s.type,
        ariaLabel: s.getAttribute('aria-label') || '',
        dataState: s.getAttribute('data-state') || '',
        checked: s.checked,
        text: (s.closest('label')?.textContent || s.closest('[class*="item"]')?.textContent || '').trim().slice(0, 60),
        id: s.id || '',
        name: s.name || '',
        class: (typeof s.className === 'string' ? s.className : '').slice(0, 80),
      }));
  });
  console.log('\n  Switches in drawer:', JSON.stringify(switches, null, 2));

  // Find toggle on default tab; if not visible, try Settings tab
  let toggle = drawer.getByRole('switch').first();
  const toggleVisible = await toggle.isVisible({ timeout: 2000 }).catch(() => false);
  if (!toggleVisible) {
    console.log('  Toggle not visible on default tab — clicking Settings tab...');
    await drawer.getByText('Settings', { exact: true }).first().click();
    await page.waitForTimeout(500);
    toggle = drawer.getByRole('switch').first();
  }

  const initialState = await toggle.getAttribute('data-state');
  console.log(`\n  Toggle initial data-state: ${initialState}`);

  // ── Check current toggle state ────────────────────────────────────────────
  if (initialState === 'unchecked') {
    console.log('  Toggle is UNCHECKED (disabled) — enabling first to test the full cycle...');
    captured.length = 0;
    await toggle.click();
    await page.waitForTimeout(5000);
    const afterEnable = await toggle.getAttribute('data-state');
    console.log(`  After click: data-state=${afterEnable}`);
    const enableCaptures = [...captured];
    console.log('\n  Network calls during ENABLE click:');
    enableCaptures.forEach(c => console.log('  ', JSON.stringify(c)));
  }

  // Now toggle should be 'checked' — let's DISABLE it
  console.log('\n[5] Disabling voice call skill...');
  captured.length = 0;
  const stateBeforeDisable = await toggle.getAttribute('data-state');
  console.log(`  data-state before disable click: ${stateBeforeDisable}`);
  await toggle.click();
  await page.waitForTimeout(8000); // Wait 8s for any async saves
  const stateAfterDisable = await toggle.getAttribute('data-state');
  console.log(`  data-state after disable click + 8s: ${stateAfterDisable}`);
  console.log('\n  Network calls during DISABLE click:');
  captured.forEach(c => console.log('  ', JSON.stringify(c)));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── Visit modern EU ────────────────────────────────────────────────────────
  console.log('\n[6] Visiting modern EU (after disable)...');
  await page.goto(MODERN_EU, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scripts/voice-toggle-eu-home-disabled.png' });
  await dumpVoiceButtons(page, 'Modern EU HOME (voice disabled)');

  // Open chat
  const chatBtn = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  const chatBtnVisible = await chatBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (chatBtnVisible) {
    await chatBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/voice-toggle-eu-chat-disabled.png' });
    await dumpVoiceButtons(page, 'Modern EU CHAT (voice disabled)');
  } else {
    console.log('  No chat button found on EU home page');
  }

  // ── Re-enable and check EU ───────────────────────────────────────────────
  console.log('\n[7] Re-enabling voice call skill...');
  if (!page.url().includes('/knowledge-base')) {
    await page.goto(`/${MODERN_SLUG}/knowledge-base`);
    await page.waitForLoadState('load');
    await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2000);
  }
  const s2 = page.getByRole('button', { name: /skills/i }).first();
  await s2.click();
  await page.waitForTimeout(1000);
  const mac2 = page.getByRole('button', { name: /make audio calls/i }).first();
  await mac2.click();
  await page.waitForTimeout(1000);
  const d2 = page.getByRole('dialog', { name: /audio skill/i });
  await d2.waitFor({ state: 'visible', timeout: 10000 });
  let t2 = d2.getByRole('switch').first();
  const tv2 = await t2.isVisible({ timeout: 2000 }).catch(() => false);
  if (!tv2) {
    await d2.getByText('Settings', { exact: true }).first().click();
    await page.waitForTimeout(500);
    t2 = d2.getByRole('switch').first();
  }
  const s2State = await t2.getAttribute('data-state');
  console.log(`  Toggle state before enable: ${s2State}`);
  if (s2State !== 'checked') {
    captured.length = 0;
    await t2.click();
    await page.waitForTimeout(8000);
    const s2After = await t2.getAttribute('data-state');
    console.log(`  Toggle state after enable + 8s: ${s2After}`);
    console.log('  Network calls during RE-ENABLE:');
    captured.forEach(c => console.log('  ', JSON.stringify(c)));
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  console.log('\n[8] Visiting modern EU (after re-enable)...');
  await page.goto(MODERN_EU, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scripts/voice-toggle-eu-home-enabled.png' });
  await dumpVoiceButtons(page, 'Modern EU HOME (voice enabled)');

  const cb2 = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  if (await cb2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cb2.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/voice-toggle-eu-chat-enabled.png' });
    await dumpVoiceButtons(page, 'Modern EU CHAT (voice enabled)');
  }

  await browser.close();
  console.log('\nDone. Screenshots saved to scripts/');
})();
