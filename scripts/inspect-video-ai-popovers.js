/**
 * Quick inspection: click each pill (Realista, Neutro, Criatividade) and
 * capture the resulting popover/panel HTML + buttons.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL    = process.env.TEST_USER_EMAIL || '';
const PASS     = process.env.TEST_USER_PASSWORD || '';
const OUT_DIR  = path.resolve(__dirname, 'inspect-output/video-ai');

function capture(label, data) {
  console.log('\n──────────────────────────────────────────');
  console.log(`[${label}]`);
  console.log(JSON.stringify(data, null, 2));
}

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
  console.log(`  📸 ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto('/login');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    await page.locator('[placeholder="Email"], input[type="email"]').first().fill(EMAIL);
    await page.locator('[placeholder="Password"], input[type="password"]').first().fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  }

  // Navigate to Video AI and click first card
  await page.goto('/video-ai');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // Click "Falar para a câmera" card
  await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('button'))
      .filter(el => el.className.includes('rounded-2xl') || el.className.includes('w-64'));
    if (els[0]) els[0].click();
  });
  await page.waitForTimeout(2000);

  // ── 1. Click "Realista" pill ──────────────────────────────────────────────
  console.log('\n═══ Clicking Realista pill ═══');
  const realistaPill = page.locator('[role="group"][aria-label="Video options"] button').first();
  await realistaPill.click();
  await page.waitForTimeout(800);
  await screenshot(page, 'popover-style');

  const stylePopover = await page.evaluate(() => {
    // Find any newly visible dropdown/popover
    const candidates = Array.from(document.querySelectorAll(
      '[data-radix-popper-content-wrapper], [role="dialog"], [role="listbox"], [role="menu"], .absolute, [class*="popover"], [class*="dropdown"]'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.innerHTML.length > 50;
    });
    return candidates.map(el => ({
      tagName: el.tagName,
      role: el.getAttribute('role'),
      class: el.className.substring(0, 100),
      innerHTML: el.innerHTML.substring(0, 3000),
    }));
  });
  capture('style popover candidates', stylePopover);
  fs.writeFileSync(path.join(OUT_DIR, 'style-popover.html'), JSON.stringify(stylePopover, null, 2));

  // Get all buttons after clicking Realista
  const afterStyleClick = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => ({ text: (b.textContent || '').trim().substring(0, 60), ariaLabel: b.getAttribute('aria-label'), className: b.className.substring(0, 80) }))
      .filter(b => b.text || b.ariaLabel)
  );
  capture('all buttons after clicking Realista', afterStyleClick);

  // Close by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── 2. Click "Neutro" pill ────────────────────────────────────────────────
  console.log('\n═══ Clicking Neutro pill ═══');
  const neutroPill = page.locator('[role="group"][aria-label="Video options"] button').nth(1);
  await neutroPill.click();
  await page.waitForTimeout(800);
  await screenshot(page, 'popover-behavior');

  const behaviorPopover = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll(
      '[data-radix-popper-content-wrapper], [role="dialog"], [role="listbox"], [role="menu"], .absolute, [class*="popover"], [class*="dropdown"]'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.innerHTML.length > 50;
    });
    return candidates.map(el => ({
      tagName: el.tagName,
      role: el.getAttribute('role'),
      class: el.className.substring(0, 100),
      innerHTML: el.innerHTML.substring(0, 3000),
    }));
  });
  capture('behavior popover candidates', behaviorPopover);

  const afterBehaviorClick = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => ({ text: (b.textContent || '').trim().substring(0, 60), ariaLabel: b.getAttribute('aria-label'), className: b.className.substring(0, 80) }))
      .filter(b => b.text || b.ariaLabel)
  );
  capture('all buttons after clicking Neutro', afterBehaviorClick);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // ── 3. Click "Criatividade" pill ──────────────────────────────────────────
  console.log('\n═══ Clicking Criatividade pill ═══');
  const criativPill = page.locator('[role="group"][aria-label="Video options"] button').nth(2);
  await criativPill.click();
  await page.waitForTimeout(800);
  await screenshot(page, 'popover-creativity');

  const creativityPopover = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll(
      '[data-radix-popper-content-wrapper], [role="dialog"], [role="listbox"], [role="menu"], .absolute, [class*="popover"], [class*="dropdown"], [role="slider"]'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && el.innerHTML.length > 10;
    });
    return candidates.map(el => ({
      tagName: el.tagName,
      role: el.getAttribute('role'),
      class: el.className.substring(0, 100),
      innerHTML: el.innerHTML.substring(0, 3000),
    }));
  });
  capture('creativity popover candidates', creativityPopover);

  // Look specifically for slider
  const sliders = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="slider"], input[type="range"]')).map(el => ({
      role: el.getAttribute('role'),
      type: el.type,
      ariaValueNow: el.getAttribute('aria-valuenow'),
      ariaValueMin: el.getAttribute('aria-valuemin'),
      ariaValueMax: el.getAttribute('aria-valuemax'),
      className: el.className.substring(0, 100),
    }))
  );
  capture('sliders/range inputs after creativity click', sliders);

  // Check all sections on page now
  const allButtons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => ({ text: (b.textContent || '').trim().substring(0, 60), ariaLabel: b.getAttribute('aria-label'), className: b.className.substring(0, 60) }))
      .filter(b => b.text || b.ariaLabel)
  );
  capture('all buttons after clicking Criatividade', allButtons);

  // Save the full page HTML after creativity click
  const pageHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 30000));
  fs.writeFileSync(path.join(OUT_DIR, 'after-creativity-click.html'), pageHTML);
  console.log('  📄 after-creativity-click.html saved');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ── 4. Click Voz do avatar option ────────────────────────────────────────
  console.log('\n═══ Clicking Áudio → Voz do avatar ═══');
  await page.locator('button:has(.lucide-mic)').first().click();
  await page.waitForTimeout(500);
  const vozDoAvatar = page.locator('button:has-text("Voz do avatar")').first();
  await vozDoAvatar.waitFor({ state: 'visible', timeout: 3000 });
  await vozDoAvatar.click();
  await page.waitForTimeout(800);
  await screenshot(page, 'after-voz-do-avatar');

  const afterVozClick = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .map(b => ({ text: (b.textContent || '').trim().substring(0, 80), ariaLabel: b.getAttribute('aria-label'), className: b.className.substring(0, 80) }))
      .filter(b => b.text || b.ariaLabel)
  );
  capture('buttons after Voz do avatar click', afterVozClick);

  // Check audio section HTML
  const audioSectionHTML = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, section'));
    for (const el of all) {
      const t = (el.textContent || '').toLowerCase();
      if ((t.includes('voz do avatar') || t.includes('voice')) && el.innerHTML.length > 200 && el.innerHTML.length < 10000) {
        return el.outerHTML.substring(0, 8000);
      }
    }
    return 'not found';
  });
  fs.writeFileSync(path.join(OUT_DIR, 'voz-do-avatar-section.html'), audioSectionHTML);
  console.log('  📄 voz-do-avatar-section.html saved');

  // ── 5. Click Predefinições ────────────────────────────────────────────────
  console.log('\n═══ Clicking Áudio → Predefinições ═══');
  await page.locator('button:has(.lucide-mic)').first().click();
  await page.waitForTimeout(500);
  const predBtn = page.locator('button:has-text("Predefinições")').first();
  if (await predBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await predBtn.click();
    await page.waitForTimeout(800);
    await screenshot(page, 'after-predefinicoes');
    const afterPred = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .map(b => ({ text: (b.textContent || '').trim().substring(0, 80), ariaLabel: b.getAttribute('aria-label'), className: b.className.substring(0, 80) }))
        .filter(b => b.text || b.ariaLabel)
    );
    capture('buttons after Predefinições click', afterPred);
  }

  console.log('\n\n✅ Popover inspection complete');
  await browser.close();
})().catch(err => {
  console.error('Popover inspection failed:', err);
  process.exit(1);
});
