/**
 * Standalone KB DOM inspection script.
 * Run: node scripts/inspect-kb.js
 * Logs the react-flow node structure, toolbar buttons, and bulk-action bar HTML.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL    = process.env.TEST_USER_EMAIL || '';
const PASS     = process.env.TEST_USER_PASSWORD || '';
const OUT_DIR  = path.resolve(__dirname, '../scripts/inspect-output');

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  const page    = await context.newPage();

  // ── Login (skip if already authenticated) ─────────────────────────────────
  await page.goto('/login');
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);

  const isOnLogin = page.url().includes('/login');
  console.log('  Current URL after goto /login:', page.url(), '| On login page:', isOnLogin);

  if (isOnLogin) {
    const emailInput = page.locator('[placeholder="Email"], input[type="email"], input[name="email"]').first();
    const inputVisible = await emailInput.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (!inputVisible) {
      console.error('Login form not found. Page HTML snippet:',
        await page.locator('body').innerHTML({ timeout: 3000 }).then(h => h.substring(0, 500)).catch(() => '(failed)'));
      await browser.close();
      process.exit(1);
    }
    await emailInput.fill(EMAIL);
    const passInput = page.locator('[placeholder="Password"], input[type="password"]').first();
    await passInput.fill(PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  }
  console.log('✓ Logged in, URL:', page.url());

  // ── Navigate to KB ─────────────────────────────────────────────────────────
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');
  console.log('✓ On KB page');

  // Dismiss health check popper if visible
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.mouse.click(720, 50);
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    console.log('✓ Dismissed health panel');
  }

  // Wait for canvas
  await page.locator('.react-flow__node').first()
    .waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  console.log('✓ Canvas nodes visible');

  // Fit view
  const fitBtn = page.getByRole('button', { name: 'Fit view' });
  if (await fitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await fitBtn.click();
    await page.waitForTimeout(1500);
    console.log('✓ Fit view clicked');
  }

  // ── Screenshot BEFORE any interaction ─────────────────────────────────────
  const screenshotBefore = path.join(OUT_DIR, 'kb-before.png');
  await page.screenshot({ path: screenshotBefore, fullPage: false });
  console.log('✓ Screenshot:', screenshotBefore);

  // ── Dump all react-flow nodes ──────────────────────────────────────────────
  const nodeInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[class*="react-flow__node"]'))
      .map(el => {
        const classes = el.className;
        const nodeType = (classes.match(/react-flow__node-(\S+)/) || [])[1] || 'unknown';
        const bb = el.getBoundingClientRect();
        const textContent = (el.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 120);
        return {
          nodeType,
          classes,
          inViewport: bb.top >= 0 && bb.left >= 0 && bb.bottom <= window.innerHeight && bb.right <= window.innerWidth,
          boundingBox: { top: Math.round(bb.top), left: Math.round(bb.left), width: Math.round(bb.width), height: Math.round(bb.height) },
          textContent,
        };
      });
  });

  console.log('\n── React Flow nodes ─────────────────────────────────────────');
  nodeInfo.forEach(n => {
    console.log(`  [${n.nodeType}] inViewport=${n.nodeType === 'unknown' ? '?' : n.inViewport} bb=${JSON.stringify(n.boundingBox)} text="${n.textContent.substring(0,80)}"`);
  });

  // ── Dump toolbar buttons ───────────────────────────────────────────────────
  const toolbarButtons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .filter(b => {
        const rect = b.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((b, idx) => ({
        idx,
        text: (b.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 50),
        ariaLabel: b.getAttribute('aria-label') || '',
        title: b.getAttribute('title') || '',
        type: b.getAttribute('type') || '',
        rect: (() => {
          const r = b.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
        })(),
      }));
  });

  console.log('\n── Visible buttons (for toolbar/Skills index) ───────────────');
  toolbarButtons.forEach(b => {
    const label = b.text || b.ariaLabel || b.title || '(no text)';
    console.log(`  [${b.idx}] "${label}" aria-label="${b.ariaLabel}" rect=${JSON.stringify(b.rect)}`);
  });

  // Find Skills button index
  const skillsIdx = toolbarButtons.findIndex(b => b.text === 'Skills');
  console.log(`\n  Skills button index: ${skillsIdx}`);
  if (skillsIdx >= 0) {
    console.log('  Buttons around Skills:');
    for (let i = Math.max(0, skillsIdx - 8); i <= Math.min(toolbarButtons.length - 1, skillsIdx + 2); i++) {
      const b = toolbarButtons[i];
      console.log(`    [${i}] "${b.text || b.ariaLabel || '(empty)'}"`);
    }
  }

  // ── Now try to add an Instagram integration and inspect what appears ────────
  console.log('\n── Attempting to click Instagram button (text mode) ─────────');
  const instagramBtn = page.getByRole('button', { name: 'Instagram' });
  const hasTextMode = await instagramBtn.isVisible({ timeout: 2000 }).catch(() => false);
  console.log('  Instagram text-mode button visible:', hasTextMode);

  if (!hasTextMode) {
    console.log('  Icon mode — checking positional approach (skillsIdx - 6)');
    const result = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button'));
      const skillsIdx = all.findIndex(b => (b.textContent || '').trim() === 'Skills');
      if (skillsIdx >= 6) {
        const igBtn = all[skillsIdx - 6];
        return {
          found: true,
          idx: skillsIdx - 6,
          text: (igBtn.textContent || '').trim(),
          ariaLabel: igBtn.getAttribute('aria-label') || '',
          title: igBtn.getAttribute('title') || '',
          outerHTML: igBtn.outerHTML.substring(0, 400),
        };
      }
      return { found: false, skillsIdx };
    });
    console.log('  Positional result (skillsIdx - 6):', JSON.stringify(result, null, 2));
  }

  // ── HTML of KB toolbar area ────────────────────────────────────────────────
  const toolbarHtml = await page.evaluate(() => {
    // Look for a horizontal list of buttons (the KB source toolbar)
    const candidates = Array.from(document.querySelectorAll('div, ul, nav'))
      .filter(el => {
        const btns = el.querySelectorAll('button');
        if (btns.length < 5) return false;
        const rect = el.getBoundingClientRect();
        return rect.height < 80 && rect.width > 200;
      });
    return candidates.map(el => ({
      tag: el.tagName,
      classes: el.className.substring(0, 100),
      buttonCount: el.querySelectorAll('button').length,
      html: el.outerHTML.substring(0, 2000),
    }));
  });

  console.log('\n── KB toolbar candidates ────────────────────────────────────');
  toolbarHtml.forEach((t, i) => {
    console.log(`  Candidate ${i}: <${t.tag}> class="${t.classes}" buttons=${t.buttonCount}`);
    console.log(`  HTML: ${t.html.substring(0, 500)}\n`);
  });

  // ── Save full button list to file ──────────────────────────────────────────
  const btnDump = path.join(OUT_DIR, 'buttons.json');
  fs.writeFileSync(btnDump, JSON.stringify(toolbarButtons, null, 2));
  console.log('\n✓ Full button list saved to:', btnDump);

  // ── Save nodes to file ─────────────────────────────────────────────────────
  const nodeDump = path.join(OUT_DIR, 'nodes.json');
  fs.writeFileSync(nodeDump, JSON.stringify(nodeInfo, null, 2));
  console.log('✓ Node list saved to:', nodeDump);

  await page.waitForTimeout(3000);
  await browser.close();
  console.log('\nDone.');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
