/**
 * Inspect the crop dialog that appears after setting a file on the avatar upload input.
 * Captures the dialog DOM and button structure.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL    = process.env.TEST_USER_EMAIL || '';
const PASS     = process.env.TEST_USER_PASSWORD || '';
const TEST_IMAGE = path.resolve(__dirname, '../support/fixtures/images/test-face.jpg');
const OUT_DIR  = path.resolve(__dirname, 'inspect-output');

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: undefined });
  const page    = await context.newPage();

  // ── Auth ──────────────────────────────────────────────────────────────────
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle').catch(() => {});
  if (page.url().includes('login') || page.url().includes('auth')) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle').catch(() => {});
  }

  // ── Navigate to Video AI ──────────────────────────────────────────────────
  console.log('Navigating to /video-ai...');
  await page.goto(`${BASE_URL}/video-ai`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});

  // Dismiss any checklist/tooltip popover
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // ── Click "Talk to the camera" card ──────────────────────────────────────
  console.log('Clicking Talk to the camera card...');
  const card = page.locator('button[class*="rounded-2xl"]')
    .filter({ hasText: /falar para a câmera|talk.?to.?the.?camera/i }).first();
  if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
    await card.click();
  } else {
    console.log('Card not found with rounded-2xl, trying any button...');
    await page.locator('button').filter({ hasText: /falar para a câmera|talk.?to.?the.?camera/i }).first().click();
  }
  await page.locator('textarea[name="videoSceneText"]').waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForTimeout(500);

  console.log('\n--- Form loaded ---');
  await page.screenshot({ path: path.join(OUT_DIR, 'crop-01-form.png') });

  // ── Set file on input ──────────────────────────────────────────────────────
  console.log('Setting file on input...');
  const fileInput = page.locator('input[type="file"][accept*="image"]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 10000 });
  await fileInput.setInputFiles(TEST_IMAGE);
  await page.waitForTimeout(1000);

  // ── Wait for crop dialog ──────────────────────────────────────────────────
  console.log('Waiting for crop dialog...');
  const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]').first();
  const dialogVisible = await dialog.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);

  if (!dialogVisible) {
    console.log('❌ No dialog appeared after file upload!');
    await page.screenshot({ path: path.join(OUT_DIR, 'crop-02-no-dialog.png') });
    await browser.close();
    return;
  }

  console.log('✅ Dialog appeared!');
  await page.screenshot({ path: path.join(OUT_DIR, 'crop-02-dialog.png') });

  // ── Capture dialog structure ──────────────────────────────────────────────
  const dialogInfo = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]') ||
                document.querySelector('[data-radix-dialog-content]');
    if (!dlg) return null;

    const buttons = Array.from(dlg.querySelectorAll('button')).map(b => ({
      text:      (b.textContent || '').trim().substring(0, 100),
      ariaLabel: b.getAttribute('aria-label'),
      type:      b.type,
      disabled:  b.disabled,
      className: b.className.substring(0, 100),
    }));

    const headings = Array.from(dlg.querySelectorAll('h1,h2,h3,h4,[role="heading"]')).map(h => h.textContent.trim());
    const spans    = Array.from(dlg.querySelectorAll('span,p,label')).map(s => s.textContent.trim()).filter(Boolean);

    return {
      outerHtml: dlg.outerHTML.substring(0, 2000),
      headings,
      spans: spans.slice(0, 20),
      buttons,
      firstLevelChildren: Array.from(dlg.children).map(c => ({
        tag: c.tagName,
        className: c.className.substring(0, 80),
        text: (c.textContent || '').trim().substring(0, 100),
      })),
    };
  });

  console.log('\n=== CROP DIALOG INFO ===');
  console.log(JSON.stringify(dialogInfo, null, 2));

  // ── Also capture what the page accessibility tree shows ──────────────────
  const snapshot = await page.locator('[role="dialog"]').first().innerHTML().catch(() => 'not found');
  console.log('\n=== DIALOG INNER HTML (first 3000 chars) ===');
  console.log(snapshot.substring(0, 3000));

  // ── Try to save the crop ───────────────────────────────────────────────────
  console.log('\n=== Attempting to save crop ===');

  // Try save button
  const saveBtn = page.locator('[role="dialog"] button')
    .filter({ hasText: /salvar|save|ok|confirm|apply|done|crop|finish/i }).first();
  const saveBtnText = await saveBtn.textContent().catch(() => null);
  console.log('Save button found:', saveBtnText);

  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
    console.log('Clicked save button');
  } else {
    console.log('Save button not found by text, trying last button...');
    const lastBtn = page.locator('[role="dialog"] button').last();
    const lastBtnText = await lastBtn.textContent().catch(() => null);
    console.log('Last button text:', lastBtnText);
    await lastBtn.click();
  }

  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT_DIR, 'crop-03-after-save.png') });

  // ── Check what the upload button shows now ────────────────────────────────
  const uploadBtnInfo = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Upload image"], [aria-label="Enviar imagem"]');
    if (!btn) return { found: false };
    const imgs = Array.from(btn.querySelectorAll('img')).map(img => ({
      src: img.src.substring(0, 200),
      alt: img.alt,
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
    return {
      found: true,
      ariaLabel: btn.getAttribute('aria-label'),
      text: (btn.textContent || '').trim().substring(0, 100),
      imgs,
    };
  });

  console.log('\n=== UPLOAD BUTTON AFTER CROP SAVE ===');
  console.log(JSON.stringify(uploadBtnInfo, null, 2));

  await browser.close();
  console.log('\nDone. Screenshots saved to:', OUT_DIR);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
