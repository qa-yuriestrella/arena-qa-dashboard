require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const ADMIN_URL   = process.env.BASE_URL   || 'https://dev-dash-avatar.arena.im';
const CLASSIC_URL = process.env.EU_URL        || 'https://dev-avatar.arena.im/automation1arena';
const MODERN_URL  = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';
const EMAIL       = process.env.TEST_USER_EMAIL    || '';
const PASSWORD    = process.env.TEST_USER_PASSWORD || '';

function allButtons(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button, [role="button"]')]
      .map(b => ({
        text:      b.innerText?.trim().slice(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
        class:     (typeof b.className === 'string' ? b.className : '').slice(0, 80),
        visible:   b.offsetParent !== null && getComputedStyle(b).display !== 'none',
      }))
      .filter(b => (b.text || b.ariaLabel) && b.visible)
  );
}

async function checkVoiceButtons(page, url, label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`EU: ${label} → ${url}`);
  console.log('─'.repeat(60));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  console.log('\nHOME PAGE buttons:');
  const home = await allButtons(page);
  console.log(JSON.stringify(home, null, 2));
  await page.screenshot({ path: path.join(__dirname, `vc-auth-${label}-home.png`) });

  // open chat
  const chatBtn = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  if (!await chatBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('  → no chat button found');
    return;
  }
  await chatBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, `vc-auth-${label}-chat.png`) });

  console.log('\nBUTTONS inside chat:');
  const chat = await allButtons(page);
  console.log(JSON.stringify(chat, null, 2));

  const voiceCandidates = await page.evaluate(() => {
    const getClass = el => (typeof el.className === 'string' ? el.className : el.className?.baseVal || '');
    const keywords = ['voice', 'call', 'phone', 'audio', 'sound', 'mic'];
    return [...document.querySelectorAll('button, [role="button"]')]
      .filter(el => {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const cls   = getClass(el).toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const text  = (el.innerText || '').toLowerCase();
        return keywords.some(k => label.includes(k) || cls.includes(k) || title.includes(k) || text.includes(k));
      })
      .map(el => ({
        tag:       el.tagName,
        text:      el.innerText?.trim().slice(0, 40) || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        class:     getClass(el).slice(0, 100),
        visible:   el.offsetParent !== null,
      }));
  });
  console.log('\nVOICE/CALL candidates in chat:');
  console.log(JSON.stringify(voiceCandidates, null, 2));
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    baseURL: ADMIN_URL,
  });
  const page = await ctx.newPage();

  // ── 1. Login to admin ─────────────────────────────────────────────────────
  console.log(`\nLogging into admin: ${ADMIN_URL}`);
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 15000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
  console.log('Logged in. Current URL:', page.url());

  // ── 2. Ensure we are on automation1arena ─────────────────────────────────
  await page.goto('/knowledge-base', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('\nKB URL:', page.url());
  await page.waitForTimeout(2000);

  // Read which avatar is active from the switcher button text
  const switcherText = await page.locator('[data-sidebar="menu-button"][aria-haspopup="menu"]')
    .first().innerText().catch(() => '(not found)');
  console.log('Active avatar in switcher:', switcherText.trim());

  // ── 3. Check voice call skill state ──────────────────────────────────────
  const skillsBtn = page.getByRole('button', { name: /skills/i }).first();
  const skillsBtnVisible = await skillsBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (skillsBtnVisible) {
    await skillsBtn.click();
    await page.waitForTimeout(1000);
    const makeAudioBtn = page.getByRole('button', { name: /make audio calls|audio calls/i })
      .or(page.getByText(/make audio calls/i)).first();
    const audioVisible = await makeAudioBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (audioVisible) {
      await makeAudioBtn.click();
      await page.waitForTimeout(1500);
      const toggle = page.getByRole('switch').first();
      const toggleVisible = await toggle.isVisible({ timeout: 3000 }).catch(() => false);
      if (toggleVisible) {
        const state = await toggle.getAttribute('data-state').catch(() => 'unknown');
        console.log('\nVoice call toggle data-state:', state);
      } else {
        console.log('\nVoice call toggle NOT FOUND (audio not uploaded yet)');
      }
    } else {
      console.log('\nMake Audio Calls option not found in Skills popover');
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── 4. Now visit Classic EU page and check buttons ────────────────────────
  await checkVoiceButtons(page, CLASSIC_URL, 'classic');

  // ── 5. Visit Modern EU page ───────────────────────────────────────────────
  await checkVoiceButtons(page, MODERN_URL, 'modern');

  await browser.close();
  console.log('\nDone.');
})();
