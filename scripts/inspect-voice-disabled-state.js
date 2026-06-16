/**
 * Quick headless inspection: what does the voice button look like in the modern EU
 * chat AFTER the skill is disabled, vs after it's enabled?
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');
const { ensureModernAvatar, ensurePrimaryAvatar } = require('../support/helpers/avatarHelper');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const MODERN_EU  = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASSWORD   = process.env.TEST_USER_PASSWORD || '';
const SLUG       = 'automation2arena';

async function dumpVoiceState(page, label) {
  const btns = await page.evaluate(() => {
    return [...document.querySelectorAll('button')]
      .filter(b => (b.getAttribute('aria-label') || '').toLowerCase().includes('voice') ||
                   (b.getAttribute('aria-label') || '').toLowerCase().includes('call'))
      .map(b => {
        const style = window.getComputedStyle(b);
        const rect = b.getBoundingClientRect();
        let anc = b.parentElement;
        const ancestors = [];
        while (anc && anc !== document.body) {
          ancestors.push(anc.tagName + (anc.className ? '.' + (typeof anc.className === 'string' ? anc.className.split(' ')[0] : '') : ''));
          anc = anc.parentElement;
        }
        return {
          ariaLabel: b.getAttribute('aria-label'),
          disabled: b.disabled,
          ariaDisabled: b.getAttribute('aria-disabled'),
          dataState: b.getAttribute('data-state'),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          class: (typeof b.className === 'string' ? b.className : '').slice(0, 150),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
          inForm: !!b.closest('form'),
          ancestors: ancestors.slice(0, 5).join(' > '),
        };
      });
  });
  console.log(`\n=== ${label} ===`);
  btns.forEach(b => console.log(JSON.stringify(b)));
  if (btns.length === 0) console.log('  (no voice/call buttons found)');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const page = await ctx.newPage();

  // Login
  console.log('Logging in...');
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { timeout: 20000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  console.log('Logged in:', page.url());

  // Switch to modern avatar then go to KB
  await ensureModernAvatar(page);
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Dismiss any poppers/overlays
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.mouse.click(720, 50);
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('p,span,div')].find(e => e.textContent?.trim() === 'AVATAR QUALITY');
    if (!h) return;
    let p = h.parentElement;
    while (p && p !== document.body) { if (window.getComputedStyle(p).position === 'fixed') break; p = p.parentElement; }
    if (!p || p === document.body) return;
    const btn = p.querySelector('[aria-label="Close"]') ||
      [...p.querySelectorAll('button')].find(b => ['×','✕','✖','X','Close'].includes(b.textContent?.trim()));
    if (btn) btn.click(); else p.style.display = 'none';
  });
  await page.waitForTimeout(500);

  // Open Skills → Make Audio Calls drawer
  await page.getByRole('button', { name: /skills/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /make audio calls/i }).first().click();
  await page.waitForTimeout(1000);
  const drawer = page.getByRole('dialog', { name: /audio skill/i });
  await drawer.waitFor({ state: 'visible', timeout: 10000 });

  // Find toggle
  let toggle = drawer.getByRole('switch').first();
  const toggleVisible = await toggle.isVisible({ timeout: 2000 }).catch(() => false);
  if (!toggleVisible) {
    await drawer.getByText('Settings', { exact: true }).first().click();
    await page.waitForTimeout(500);
    toggle = drawer.getByRole('switch').first();
  }

  const initialState = await toggle.getAttribute('data-state');
  console.log(`\nToggle initial state: ${initialState}`);

  // Ensure it's enabled first
  if (initialState !== 'checked') {
    console.log('Enabling toggle first...');
    await toggle.click();
    await page.waitForTimeout(6000);
    console.log('After enable:', await toggle.getAttribute('data-state'));
  }

  // Now DISABLE
  console.log('\nDisabling voice call skill...');
  await toggle.click();
  await page.waitForTimeout(6000);
  console.log('After disable:', await toggle.getAttribute('data-state'));

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Visit modern EU
  console.log('\nVisiting modern EU...');
  await page.goto(MODERN_EU);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  await dumpVoiceState(page, 'Modern EU HOME (voice DISABLED)');

  // Open chat
  const chatBtn = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  if (await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await chatBtn.click();
    await page.waitForTimeout(3000);
    await dumpVoiceState(page, 'Modern EU CHAT OPEN (voice DISABLED)');
  } else {
    console.log('No chat button found');
  }

  // Now RE-ENABLE
  console.log('\n\nRe-enabling voice...');
  await ensureModernAvatar(page);
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(2000);

  const p2 = page.locator('[data-radix-popper-content-wrapper]');
  if (await p2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.mouse.click(720, 50);
    await p2.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('p,span,div')].find(e => e.textContent?.trim() === 'AVATAR QUALITY');
    if (!h) return;
    let p = h.parentElement;
    while (p && p !== document.body) { if (window.getComputedStyle(p).position === 'fixed') break; p = p.parentElement; }
    if (!p || p === document.body) return;
    const btn = p.querySelector('[aria-label="Close"]') ||
      [...p.querySelectorAll('button')].find(b => ['×','✕','✖','X','Close'].includes(b.textContent?.trim()));
    if (btn) btn.click(); else p.style.display = 'none';
  });
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: /skills/i }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /make audio calls/i }).first().click();
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
  if (s2State !== 'checked') {
    await t2.click();
    await page.waitForTimeout(6000);
    console.log('Re-enabled:', await t2.getAttribute('data-state'));
  } else {
    console.log('Already enabled');
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Visit EU again (enabled)
  await page.goto(MODERN_EU);
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  await dumpVoiceState(page, 'Modern EU HOME (voice ENABLED)');

  const cb2 = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  if (await cb2.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cb2.click();
    await page.waitForTimeout(3000);
    await dumpVoiceState(page, 'Modern EU CHAT OPEN (voice ENABLED)');
  }

  await browser.close();
  console.log('\nDone.');
})();
