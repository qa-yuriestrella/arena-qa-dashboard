require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const CLASSIC_URL = process.env.EU_URL || 'https://dev-avatar.arena.im/automation1arena';
const MODERN_URL  = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';

function allButtons(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('button, [role="button"]')]
      .map(b => ({
        text:      b.innerText?.trim().slice(0, 60) || '',
        ariaLabel: b.getAttribute('aria-label') || '',
        class:     b.className?.slice(0, 100) || '',
        visible:   b.offsetParent !== null && getComputedStyle(b).display !== 'none',
        rect:      JSON.stringify(b.getBoundingClientRect()),
      }))
      .filter(b => b.text || b.ariaLabel)
  );
}

async function inspectEU(page, url, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`INSPECTING: ${label}`);
  console.log('='.repeat(60));

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // ── Home page buttons ──────────────────────────────────────────────────────
  console.log('\n--- HOME PAGE BUTTONS ---');
  const homeBtns = await allButtons(page);
  console.log(JSON.stringify(homeBtns, null, 2));

  await page.screenshot({ path: path.join(__dirname, `voice-${label}-home.png`) });
  console.log(`Screenshot: voice-${label}-home.png`);

  // ── Click Chat button ──────────────────────────────────────────────────────
  const chatBtn = page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).first();
  const chatVisible = await chatBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!chatVisible) {
    console.log('\nNo chat button found on home page — skipping chat inspection');
    return;
  }
  console.log('\nOpening chat...');
  await chatBtn.click();
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(__dirname, `voice-${label}-chat-open.png`) });
  console.log(`Screenshot: voice-${label}-chat-open.png`);

  // ── Buttons visible after chat opens ──────────────────────────────────────
  console.log('\n--- BUTTONS AFTER CHAT OPEN ---');
  const chatBtns = await allButtons(page);
  console.log(JSON.stringify(chatBtns, null, 2));

  // ── Specifically look for anything voice/call/phone related ──────────────
  const voiceCandidates = await page.evaluate(() => {
    const getClass = el => (typeof el.className === 'string' ? el.className : el.className?.baseVal || '');
    const keywords = ['voice', 'call', 'phone', 'audio', 'sound', 'micro', 'mic'];
    return [...document.querySelectorAll('button, [role="button"], svg, [class*="icon"]')]
      .filter(el => {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const cls   = getClass(el).toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        return keywords.some(k => label.includes(k) || cls.includes(k) || title.includes(k));
      })
      .map(el => ({
        tag:       el.tagName,
        ariaLabel: el.getAttribute('aria-label') || '',
        class:     getClass(el).slice(0, 120),
        title:     el.getAttribute('title') || '',
        visible:   el.offsetParent !== null,
        parent:    el.parentElement ? {
          tag:       el.parentElement.tagName,
          ariaLabel: el.parentElement.getAttribute('aria-label') || '',
          class:     getClass(el.parentElement).slice(0, 80),
        } : null,
        rect: JSON.stringify(el.getBoundingClientRect()),
      }));
  });
  console.log('\n--- VOICE/CALL/PHONE CANDIDATES (in chat) ---');
  console.log(JSON.stringify(voiceCandidates, null, 2));

  // ── Structure around the message input ────────────────────────────────────
  const inputArea = await page.evaluate(() => {
    const input = document.querySelector(
      'input[type="text"], textarea, [placeholder*="message" i], [aria-label*="message" i]'
    );
    if (!input) return null;
    const form = input.closest('form') || input.parentElement;
    return {
      inputTag:   input.tagName,
      inputLabel: input.getAttribute('aria-label') || '',
      inputClass: input.className?.slice(0, 80) || '',
      formClass:  form?.className?.slice(0, 120) || '',
      siblings:   [...(form?.querySelectorAll('button') || [])].map(b => ({
        text:      b.innerText?.trim().slice(0, 40),
        ariaLabel: b.getAttribute('aria-label') || '',
        class:     b.className?.slice(0, 80) || '',
      })),
    };
  });
  console.log('\n--- MESSAGE INPUT AREA & SIBLING BUTTONS ---');
  console.log(JSON.stringify(inputArea, null, 2));
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await inspectEU(page, CLASSIC_URL, 'classic');
  await inspectEU(page, MODERN_URL,  'modern');

  await browser.close();
  console.log('\nDone.');
})();
