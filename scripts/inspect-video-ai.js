/**
 * Video AI DOM + Network inspection script.
 * Run: node scripts/inspect-video-ai.js
 *
 * What it captures:
 *   1. Type selection cards (selector, text, aria attrs)
 *   2. Form sections for each type (Talk to Cam, Card, Product Placement, Slideshow)
 *   3. Style buttons (text, data-state)
 *   4. Behavior buttons (text, data-state)
 *   5. Voice section structure and option buttons
 *   6. Script/textarea fields
 *   7. Generate button label and selector
 *   8. Existing video player (if any) + action menu items (Regenerate, Delete, etc.)
 *   9. All POST/PUT/PATCH/DELETE requests captured during type selection
 *  10. Screenshots at each step
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL    = process.env.TEST_USER_EMAIL || '';
const PASS     = process.env.TEST_USER_PASSWORD || '';
const OUT_DIR  = path.resolve(__dirname, 'inspect-output/video-ai');

// Collect all network requests
const captured = [];

function capture(label, data) {
  console.log('\n──────────────────────────────────────────');
  console.log(`[${label}]`);
  console.log(JSON.stringify(data, null, 2));
}

async function screenshot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function dumpButtons(page, context) {
  const btns = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => ({
      text:       (b.textContent || '').trim().substring(0, 80),
      ariaLabel:  b.getAttribute('aria-label'),
      dataState:  b.getAttribute('data-state'),
      ariaSelected: b.getAttribute('aria-selected'),
      ariaPressed:  b.getAttribute('aria-pressed'),
      disabled:   b.disabled,
      className:  b.className.substring(0, 100),
    })).filter(b => b.text || b.ariaLabel)
  );
  capture(`buttons @ ${context}`, btns);
  return btns;
}

async function dumpTextareas(page, context) {
  const areas = await page.evaluate(() =>
    Array.from(document.querySelectorAll('textarea, input[type="text"]')).map(el => ({
      tag:          el.tagName,
      name:         el.name,
      id:           el.id,
      placeholder:  el.placeholder,
      className:    el.className.substring(0, 100),
    }))
  );
  capture(`textarea/text-inputs @ ${context}`, areas);
  return areas;
}

async function dumpFileInputs(page, context) {
  const inputs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input[type="file"]')).map((el, i) => ({
      index:   i,
      accept:  el.accept,
      id:      el.id,
      name:    el.name,
      className: el.className.substring(0, 100),
    }))
  );
  capture(`file-inputs @ ${context}`, inputs);
  return inputs;
}

async function dumpSectionHeadings(page, context) {
  const headings = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1,h2,h3,h4,label,legend,[class*="section"],[class*="Section"]'))
      .map(el => ({
        tag:      el.tagName,
        text:     (el.textContent || '').trim().substring(0, 120),
        class:    el.className.substring(0, 80),
      }))
      .filter(h => h.text.length > 0 && h.text.length < 120)
  );
  capture(`headings/labels @ ${context}`, headings);
  return headings;
}

async function dumpVideoPlayer(page) {
  const info = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return null;
    return {
      src:       video.src || video.currentSrc,
      className: video.className.substring(0, 100),
      parentHTML: video.parentElement?.outerHTML?.substring(0, 800),
    };
  });
  capture('video player', info);
  return info;
}

async function dumpMenuItems(page, context) {
  const items = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], [data-radix-dropdown-menu-item]'))
      .map(el => ({
        text:      (el.textContent || '').trim(),
        role:      el.getAttribute('role'),
        className: el.className.substring(0, 80),
      }))
  );
  capture(`menu items @ ${context}`, items);
  return items;
}

async function dumpSliders(page, context) {
  const sliders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="slider"]')).map(el => ({
      ariaValueMin:  el.getAttribute('aria-valuemin'),
      ariaValueMax:  el.getAttribute('aria-valuemax'),
      ariaValueNow:  el.getAttribute('aria-valuenow'),
      ariaValueText: el.getAttribute('aria-valuetext'),
      className:     el.className.substring(0, 100),
    }))
  );
  capture(`sliders @ ${context}`, sliders);
  return sliders;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  const page    = await context.newPage();

  // ── Intercept all non-GET requests ──────────────────────────────────────────
  page.on('request', req => {
    if (!['GET'].includes(req.method())) {
      captured.push({
        method:   req.method(),
        url:      req.url(),
        postData: (req.postData() || '').substring(0, 300),
      });
    }
  });
  page.on('response', async res => {
    if (!['GET'].includes(res.request().method())) {
      const entry = captured.find(c => c.url === res.url() && !c.status);
      if (entry) {
        entry.status = res.status();
        entry.responseSnippet = await res.text().then(t => t.substring(0, 300)).catch(() => '');
      }
    }
  });

  // ── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);

  if (page.url().includes('/login')) {
    const emailInput = page.locator('[placeholder="Email"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(EMAIL);
    await page.locator('[placeholder="Password"], input[type="password"]').first().fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  }
  console.log('✓ Logged in, URL:', page.url());

  // ── Navigate to Video AI ─────────────────────────────────────────────────────
  await page.goto('/video-ai');
  await page.waitForLoadState('networkidle').catch(() => {});

  // Wait for loading spinner to disappear ("Carregando..." overlay)
  const spinner = page.locator('.animate-spin, [class*="animate-spin"]').first();
  await spinner.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Dismiss quality checklist if present
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  console.log('\n✓ On Video AI page, URL:', page.url());
  await screenshot(page, '01-video-ai-initial');

  // ── 1. Initial page — type selection cards ───────────────────────────────────
  capture('initial page URL', { url: page.url() });

  const initialHTML = await page.evaluate(() =>
    document.body.innerHTML.substring(0, 5000)
  );
  fs.writeFileSync(path.join(OUT_DIR, 'initial-page.html'), initialHTML);
  console.log('  📄 initial-page.html saved');

  await dumpButtons(page, 'initial screen');
  await dumpSectionHeadings(page, 'initial screen');

  // Check if video player already exists (pre-existing video)
  const hasVideo = await page.locator('video').isVisible({ timeout: 2000 }).catch(() => false);
  capture('pre-existing video', { found: hasVideo });
  if (hasVideo) {
    await dumpVideoPlayer(page);

    // Dump the action menu (more-options button)
    const moreBtn = page.locator('button:has(.lucide-more-vertical), button:has([class*="more"])').first();
    if (await moreBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moreBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, '02-more-options-menu');
      await dumpMenuItems(page, 'more options menu');
      // Capture HTML of the open menu
      const menuHTML = await page.evaluate(() => {
        const menu = document.querySelector('[role="menu"], [data-radix-dropdown-menu-content]');
        return menu ? menu.outerHTML : '(no menu found)';
      });
      fs.writeFileSync(path.join(OUT_DIR, 'more-options-menu.html'), menuHTML);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Check for Regenerate and Publish/Remove profile buttons
    const actionBtns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: (b.textContent || '').trim(),
        ariaLabel: b.getAttribute('aria-label'),
      })).filter(b => /regenerate|publish|remove|profile|scene/i.test(b.text + (b.ariaLabel || '')))
    );
    capture('action buttons around video player', actionBtns);
  }

  // ── 2. Collect ALL type cards on the initial screen ──────────────────────────
  const typeCards = await page.evaluate(() => {
    // Cards have class containing "rounded-2xl" and are direct button elements
    const els = Array.from(document.querySelectorAll('button'));
    return els
      .filter(el => el.className.includes('rounded-2xl') || el.className.includes('w-64'))
      .map((el, i) => ({
        index:     i,
        text:      (el.textContent || '').trim().substring(0, 120),
        className: el.className.substring(0, 120),
        outerHTML: el.outerHTML.substring(0, 400),
      }));
  });
  capture('type cards found on initial screen', typeCards);

  // ── 3. Click each type card by index and inspect the resulting form ───────────
  for (let ti = 0; ti < typeCards.length; ti++) {
    const card = typeCards[ti];
    const label = card.text.split('\n')[0].trim().substring(0, 50);
    console.log(`\n\n═══ TYPE CARD [${ti}]: ${label} ═══`);

    // Re-navigate to get a clean initial state
    await page.goto('/video-ai');
    await page.waitForLoadState('networkidle').catch(() => {});
    await spinner.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    if (await popper.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Click card by index among the rounded-2xl buttons
    const clicked = await page.evaluate((idx) => {
      const els = Array.from(document.querySelectorAll('button'))
        .filter(el => el.className.includes('rounded-2xl') || el.className.includes('w-64'));
      if (els[idx]) { els[idx].click(); return true; }
      return false;
    }, ti);

    if (!clicked) {
      console.warn(`  ⚠ Could not click card[${ti}]`);
      continue;
    }

    await page.waitForTimeout(2000);
    console.log(`  ✓ Clicked card[${ti}]: ${label}`);

    const slug = label.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '').toLowerCase().substring(0, 30);
    await screenshot(page, `0${ti + 3}-form-${slug}`);

    await dumpButtons(page, `form: ${label}`);
    await dumpTextareas(page, `form: ${label}`);
    await dumpFileInputs(page, `form: ${label}`);
    await dumpSectionHeadings(page, `form: ${label}`);
    await dumpSliders(page, `form: ${label}`);

    // Save full form HTML
    const formHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 12000));
    fs.writeFileSync(path.join(OUT_DIR, `form-card${ti}-${slug}.html`), formHTML);
    console.log(`  📄 form-card${ti}-${slug}.html saved`);

    // Voice section — dump HTML of the section containing "voz" or "voice"
    const voiceHTML = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('div, section'));
      const el = all.find(e => {
        const t = (e.textContent || '').toLowerCase();
        return (t.includes('voz') || t.includes('voice')) &&
               e.querySelectorAll('button').length >= 2 &&
               e.children.length > 0;
      });
      return el ? el.outerHTML.substring(0, 3000) : '(voice section not found)';
    });
    fs.writeFileSync(path.join(OUT_DIR, `voice-card${ti}-${slug}.html`), voiceHTML);
    console.log(`  📄 voice-card${ti}-${slug}.html saved`);
  }

  // ── 3. Network requests captured ─────────────────────────────────────────────
  capture('all captured non-GET requests', captured);
  fs.writeFileSync(
    path.join(OUT_DIR, 'network-requests.json'),
    JSON.stringify(captured, null, 2)
  );
  console.log('\n  📄 network-requests.json saved');

  // ── 4. End-user page — check avatar ring/video display ───────────────────────
  const EU_URL = process.env.EU_URL || '';
  if (EU_URL) {
    await page.goto(EU_URL);
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);
    await screenshot(page, '09-end-user-page');

    const euVideoInfo = await page.evaluate(() => {
      const video = document.querySelector('video');
      const ring  = document.querySelector('[class*="ring"], [class*="Ring"], [class*="video-border"]');
      return {
        hasVideo: !!video,
        videoSrc: video?.src,
        hasRing:  !!ring,
        ringClass: ring?.className,
      };
    });
    capture('end-user video ring', euVideoInfo);
  }

  console.log('\n\n✅ Inspection complete. Results in:', OUT_DIR);
  await browser.close();
})().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
