/**
 * Video AI deep form inspection — clicks the Audio tab and captures voice
 * section HTML, all style pills, all behavior pills, and the creativity slider.
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
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

// Get buttons only from the main content area (not the sidebar)
async function dumpMainButtons(page, context) {
  const btns = await page.evaluate(() => {
    // Find the main content area - not the sidebar
    const main = document.querySelector('main') ||
                 document.querySelector('[class*="flex-1"]') ||
                 document.body;
    // Exclude sidebar
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    return Array.from(main.querySelectorAll('button'))
      .filter(b => !sidebar || !sidebar.contains(b))
      .map(b => ({
        text:       (b.textContent || '').trim().substring(0, 100),
        ariaLabel:  b.getAttribute('aria-label'),
        dataState:  b.getAttribute('data-state'),
        ariaSelected: b.getAttribute('aria-selected'),
        ariaPressed:  b.getAttribute('aria-pressed'),
        disabled:   b.disabled,
        className:  b.className.substring(0, 120),
      }))
      .filter(b => b.text || b.ariaLabel);
  });
  capture(`main-buttons @ ${context}`, btns);
  return btns;
}

// Capture main content area HTML
async function dumpMainHTML(page, filename) {
  const html = await page.evaluate(() => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    const all = Array.from(document.querySelectorAll('[class*="flex-col"], main, [class*="container"]'));
    // Find first large element that is not the sidebar
    for (const el of all) {
      if (sidebar && sidebar.contains(el)) continue;
      if (el.innerHTML.length > 2000) {
        return el.outerHTML.substring(0, 20000);
      }
    }
    return document.body.innerHTML.substring(0, 20000);
  });
  fs.writeFileSync(path.join(OUT_DIR, filename), html);
  console.log(`  📄 ${filename} saved (${html.length} chars)`);
  return html;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── Capture non-GET requests ─────────────────────────────────────────────────
  const captured = [];
  page.on('request', req => {
    if (!['GET'].includes(req.method())) {
      captured.push({ method: req.method(), url: req.url(), postData: (req.postData() || '').substring(0, 500) });
    }
  });
  page.on('response', async res => {
    if (!['GET'].includes(res.request().method())) {
      const e = captured.find(c => c.url === res.url() && !c.status);
      if (e) {
        e.status = res.status();
        e.responseSnippet = await res.text().then(t => t.substring(0, 500)).catch(() => '');
      }
    }
  });

  // ── Login ────────────────────────────────────────────────────────────────────
  await page.goto('/login');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  if (page.url().includes('/login')) {
    await page.locator('[placeholder="Email"], input[type="email"]').first().fill(EMAIL);
    await page.locator('[placeholder="Password"], input[type="password"]').first().fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  }

  // ── Navigate to Video AI ─────────────────────────────────────────────────────
  await page.goto('/video-ai');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  const types = [
    { index: 0, slug: 'falar-para-a-camera' },
    { index: 1, slug: 'criar-cena' },
    { index: 2, slug: 'insercao-de-produto' },
  ];

  for (const { index, slug } of types) {
    console.log(`\n\n═══ Deep inspect card[${index}]: ${slug} ═══`);

    // Navigate fresh
    await page.goto('/video-ai');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    if (await popper.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Click card
    await page.evaluate((idx) => {
      const els = Array.from(document.querySelectorAll('button'))
        .filter(el => el.className.includes('rounded-2xl') || el.className.includes('w-64'));
      if (els[idx]) els[idx].click();
    }, index);
    await page.waitForTimeout(2000);

    await screenshot(page, `deep-${index}-${slug}-image-tab`);
    await dumpMainButtons(page, `${slug} image tab`);
    await dumpMainHTML(page, `deep-main-${index}-${slug}-image.html`);

    // ── Click Áudio tab ──────────────────────────────────────────────────────
    const audioTab = page.locator('button:has-text("Áudio")').first();
    if (await audioTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await audioTab.click();
      await page.waitForTimeout(1000);
      await screenshot(page, `deep-${index}-${slug}-audio-tab`);
      await dumpMainButtons(page, `${slug} audio tab`);

      // Save audio section HTML
      const audioHTML = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const audioBtn = btns.find(b => b.textContent.trim() === 'Áudio');
        if (!audioBtn) return '(áudio tab not found)';
        // get the panel/section rendered after clicking
        const parent = audioBtn.closest('[class*="flex-col"]') ||
                       audioBtn.closest('[class*="gap"]') ||
                       audioBtn.parentElement;
        return parent ? parent.outerHTML.substring(0, 15000) : '(parent not found)';
      });
      fs.writeFileSync(path.join(OUT_DIR, `deep-audio-${index}-${slug}.html`), audioHTML);
      console.log(`  📄 deep-audio-${index}-${slug}.html saved`);

      // Check for voice option buttons
      const voiceOptions = await page.evaluate(() =>
        Array.from(document.querySelectorAll('button')).map(b => ({
          text: (b.textContent || '').trim().substring(0, 80),
          ariaLabel: b.getAttribute('aria-label'),
          ariaSelected: b.getAttribute('aria-selected'),
          ariaPressed: b.getAttribute('aria-pressed'),
          dataState: b.getAttribute('data-state'),
          className: b.className.substring(0, 100),
        })).filter(b => /voz|voice|avatar|upload|gravar|record|micro/i.test((b.text || '') + (b.ariaLabel || '')))
      );
      capture(`voice option buttons @ ${slug}`, voiceOptions);
    } else {
      console.log('  ⚠ Áudio tab not visible');
    }

    // ── Go back to image tab and dump style+behavior pills ───────────────────
    await page.goto('/video-ai');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2000);
    if (await popper.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    await page.evaluate((idx) => {
      const els = Array.from(document.querySelectorAll('button'))
        .filter(el => el.className.includes('rounded-2xl') || el.className.includes('w-64'));
      if (els[idx]) els[idx].click();
    }, index);
    await page.waitForTimeout(2000);

    // Capture all rounded-full pills (style + behavior + creativity)
    const pills = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button'))
        .filter(b => b.className.includes('rounded-full'))
        .map(b => ({
          text:       (b.textContent || '').trim().substring(0, 80),
          ariaLabel:  b.getAttribute('aria-label'),
          ariaSelected: b.getAttribute('aria-selected'),
          ariaPressed:  b.getAttribute('aria-pressed'),
          dataState:  b.getAttribute('data-state'),
          className:  b.className.substring(0, 120),
        }))
    );
    capture(`pill buttons (rounded-full) @ ${slug}`, pills);

    // ── Try to expand creativity section ─────────────────────────────────────
    const creativityBtn = page.locator('button:has-text("Criatividade")').first();
    if (await creativityBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await creativityBtn.click();
      await page.waitForTimeout(500);
      await screenshot(page, `deep-${index}-${slug}-creativity-expanded`);
      const sliders = await page.evaluate(() =>
        Array.from(document.querySelectorAll('[role="slider"]')).map(el => ({
          ariaValueMin:  el.getAttribute('aria-valuemin'),
          ariaValueMax:  el.getAttribute('aria-valuemax'),
          ariaValueNow:  el.getAttribute('aria-valuenow'),
          ariaValueText: el.getAttribute('aria-valuetext'),
          className:     el.className.substring(0, 100),
        }))
      );
      capture(`sliders after creativity expand @ ${slug}`, sliders);
    }

    // ── Check section labels ─────────────────────────────────────────────────
    const sectionLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,label,p,span'))
        .filter(el => {
          const t = (el.textContent || '').trim();
          return t.length > 1 && t.length < 60 &&
            /estilo|estética|comportamento|humor|voz|criatividade|imagem|áudio|avatar|produto|script|cena/i.test(t);
        })
        .map(el => ({
          tag:   el.tagName,
          text:  (el.textContent || '').trim(),
          class: el.className.substring(0, 60),
        }))
    );
    capture(`section labels @ ${slug}`, sectionLabels);
  }

  // ── Dump final network capture ────────────────────────────────────────────
  capture('all non-GET requests (deep run)', captured);
  fs.writeFileSync(path.join(OUT_DIR, 'network-deep.json'), JSON.stringify(captured, null, 2));
  console.log('\n  📄 network-deep.json saved');

  console.log('\n\n✅ Deep inspection complete. Results in:', OUT_DIR);
  await browser.close();
})().catch(err => {
  console.error('Deep inspection failed:', err);
  process.exit(1);
});
