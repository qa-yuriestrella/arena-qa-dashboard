/**
 * VAI004 voice panel deep inspection.
 * Captures all UI states: initial open, after file upload, after recording, presets modal.
 * Run: node scripts/inspect-vai004-voice-panel.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { chromium } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASS       = process.env.TEST_USER_PASSWORD || '';
const TEST_AUDIO = path.resolve(__dirname, '../support/fixtures/audios/test-audio.mp3');
const OUT_DIR    = path.resolve(__dirname, 'inspect-output/vai004-voice');

fs.mkdirSync(OUT_DIR, { recursive: true });

function log(label, data) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[${label}]`);
  console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

async function shot(page, name) {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function dumpPanel(page, label) {
  const info = await page.evaluate(() => {
    const panel = document.querySelector('div.fixed.inset-0.z-50.flex');
    if (!panel) return { found: false };

    const walk = (el, depth = 0) => {
      if (depth > 8) return null;
      const tag  = el.tagName?.toLowerCase();
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      const attr = {};
      for (const a of (el.attributes || [])) attr[a.name] = a.value;
      const children = [...el.children].map(c => walk(c, depth + 1)).filter(Boolean);
      return { tag, text, attr, children };
    };

    const buttons = [...panel.querySelectorAll('button')].map((b, i) => ({
      index: i,
      text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
      ariaLabel: b.getAttribute('aria-label'),
      disabled: b.disabled,
      classes: b.className.slice(0, 120),
      type: b.type,
    }));

    const inputs = [...panel.querySelectorAll('input')].map(i => ({
      type: i.type,
      accept: i.getAttribute('accept'),
      name: i.name,
      id: i.id,
      classes: i.className.slice(0, 80),
    }));

    const headings = [...panel.querySelectorAll('h1,h2,h3,h4,h5')].map(h => ({
      level: h.tagName,
      text: h.textContent?.trim(),
    }));

    const audios = [...panel.querySelectorAll('audio')].map(a => ({
      src: a.src?.slice(0, 80),
      controls: a.controls,
      classes: a.className.slice(0, 80),
    }));

    const svgIcons = [...panel.querySelectorAll('svg')].map(s => ({
      classes: s.className?.baseVal?.slice(0, 60),
      parentTag: s.parentElement?.tagName?.toLowerCase(),
      parentText: (s.parentElement?.textContent || '').trim().slice(0, 40),
    }));

    const tabs = [...panel.querySelectorAll('[role="tab"], [role="tablist"]')].map(t => ({
      role: t.getAttribute('role'),
      text: t.textContent?.trim().slice(0, 60),
      selected: t.getAttribute('aria-selected'),
    }));

    const divText = [...panel.querySelectorAll('p, span, label')]
      .filter(el => el.children.length === 0)
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 2 && t.length < 120)
      .slice(0, 30);

    return {
      found: true,
      buttons,
      inputs,
      headings,
      audios,
      svgIcons: svgIcons.slice(0, 20),
      tabs,
      divText,
      outerHTMLPreview: panel.outerHTML.slice(0, 3000),
    };
  });
  log(label, info);
  return info;
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASS);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function goToVideoAI(page) {
  await page.goto(`${BASE_URL}/video-ai`);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  const popper = page.locator('[data-radix-popper-content-wrapper]');
  if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

async function selectTalkToCam(page) {
  const cards = page.locator('button[class*="rounded-2xl"]');
  if (await cards.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await cards.first().click();
    await page.locator('textarea[name="videoSceneText"]').waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(600);
  } else {
    const modelBtn = page.locator('button[aria-label="Choose the video model"]').first();
    if (await modelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const txt = await modelBtn.textContent().catch(() => '');
      if (!/talk to the camera/i.test(txt)) {
        await modelBtn.click();
        await page.waitForTimeout(400);
        await cards.first().click();
        await page.locator('textarea[name="videoSceneText"]').waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
      }
    }
  }
}

async function dumpAllVisibleButtons(page, label) {
  const btns = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter(b => b.offsetParent !== null)
      .map((b, i) => ({
        index: i,
        text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        ariaLabel: b.getAttribute('aria-label'),
        svgClasses: [...b.querySelectorAll('svg')].map(s => s.className?.baseVal).join(', '),
      }))
      // Skip the many repeated "Ações do vídeo" history buttons
      .filter(b => b.ariaLabel !== 'Ações do vídeo' && b.text !== '')
  );
  log(label, btns);
  return btns;
}

async function openAudioDropdown(page) {
  // Dump all buttons to find the audio tab
  await dumpAllVisibleButtons(page, 'buttons-before-audio-open');

  // Audio tab: unconfigured → has .lucide-mic; configured → text ends with " audio" / " áudio", has .lucide-play
  let audioTab = page.locator('button:has(.lucide-mic)').first();
  if (!await audioTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    audioTab = page.locator('button[aria-label="Audio"], button[aria-label="Áudio"], button[aria-label$=" audio"], button[aria-label$=" áudio"]').first();
  }
  if (!await audioTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Configured state: no aria-label, text content ends with " audio" / " áudio"
    audioTab = page.locator('button').filter({ hasText: / audio$| áudio$/i }).first();
  }

  await audioTab.waitFor({ state: 'visible', timeout: 10000 });
  await audioTab.click();
  await page.waitForTimeout(600);

  log('audio-dropdown-options', await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => ({
      text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
    }))
  ));
}

async function openAvatarVoicePanel(page) {
  const btn = page.locator('button').filter({ hasText: /voz do avatar|avatar.?voice/i }).first();
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
  await page.locator('div.fixed.inset-0.z-50.flex').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1000);
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page    = await browser.newPage();

  // ── Login & navigate ──────────────────────────────────────────────────────────
  await login(page);
  await goToVideoAI(page);
  await selectTalkToCam(page);
  await shot(page, '01-form-ready');

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 1 — Panel initial open (no previous audio)
  // ════════════════════════════════════════════════════════════════════════════
  await openAudioDropdown(page);
  await shot(page, '02-audio-dropdown');
  await openAvatarVoicePanel(page);
  await shot(page, '03-panel-initial');
  await dumpPanel(page, 'STATE-1: panel initial open');

  // ── Upload tab / section ──────────────────────────────────────────────────
  log('looking-for-upload-tab', await page.evaluate(() => {
    const panel = document.querySelector('div.fixed.inset-0.z-50.flex');
    if (!panel) return 'panel not found';
    return [...panel.querySelectorAll('button, [role="tab"]')]
      .map(b => ({ text: (b.textContent||'').trim().slice(0,60), ariaLabel: b.getAttribute('aria-label'), role: b.getAttribute('role') }));
  }));

  // Try clicking upload tab if it exists
  const panel = page.locator('div.fixed.inset-0.z-50.flex');
  const uploadTab = panel.locator('[role="tab"]').filter({ hasText: /upload|carregar/i }).first();
  if (await uploadTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await uploadTab.click();
    await page.waitForTimeout(500);
    await shot(page, '04-upload-tab');
    await dumpPanel(page, 'STATE-1b: upload tab selected');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 2 — After file upload
  // ════════════════════════════════════════════════════════════════════════════
  const fileInput = panel.locator('input[type="file"]').first();
  const hasFileInput = await fileInput.isVisible({ timeout: 3000 }).catch(() => false)
    || await fileInput.count().then(c => c > 0).catch(() => false);

  if (hasFileInput) {
    log('direct-file-input', 'Found file input — setting files directly');
    await fileInput.setInputFiles(TEST_AUDIO).catch(() => {});
    await page.waitForTimeout(2000);
    await shot(page, '05-after-file-input');
    await dumpPanel(page, 'STATE-2a: after direct file input');
  } else {
    // Try via click → file chooser
    const uploadClickBtn = panel.locator('button').filter({ hasText: /upload|carregar|escolher|browse/i }).first();
    if (await uploadClickBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fcPromise = page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null);
      await uploadClickBtn.click();
      const fc = await fcPromise;
      if (fc) {
        await fc.setFiles(TEST_AUDIO);
        await page.waitForTimeout(2000);
        await shot(page, '05-after-upload-chooser');
        await dumpPanel(page, 'STATE-2b: after file chooser upload');
      } else {
        log('file-chooser', 'NO file chooser appeared');
        await shot(page, '05-no-chooser');
      }
    } else {
      log('upload-btn', 'No upload button or file input found');
      await shot(page, '05-no-upload-ui');
    }
  }

  // Check panel state after upload
  const panelStillOpen = await panel.isVisible({ timeout: 2000 }).catch(() => false);
  log('panel-open-after-upload', panelStillOpen);

  if (panelStillOpen) {
    await dumpPanel(page, 'STATE-2-final: panel after upload (still open)');

    // Look for save button
    const saveBtn = panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first();
    const hasSave = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
    log('save-button-visible', hasSave);

    if (hasSave) {
      await shot(page, '06-before-save');
      await saveBtn.click();
      await page.waitForTimeout(1500);
      await shot(page, '07-after-save');
      const panelClosed = !(await panel.isVisible({ timeout: 3000 }).catch(() => false));
      log('panel-closed-after-save', panelClosed);
      if (!panelClosed) {
        await dumpPanel(page, 'STATE-3: panel after save (still open?)');
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 3 — Recording tab
  // ════════════════════════════════════════════════════════════════════════════
  // Re-open the panel for recording inspection
  if (!(await panel.isVisible({ timeout: 1000 }).catch(() => false))) {
    await openAudioDropdown(page);
    await openAvatarVoicePanel(page);
    await shot(page, '08-panel-reopened');
  }
  await dumpPanel(page, 'STATE-3: panel re-opened (may have prior audio)');

  // Look for tabs
  const allTabs = panel.locator('[role="tab"]');
  const tabCount = await allTabs.count();
  log('tabs-count', tabCount);
  for (let i = 0; i < tabCount; i++) {
    const t = allTabs.nth(i);
    const txt = await t.textContent().catch(() => '');
    const sel = await t.getAttribute('aria-selected').catch(() => '');
    log(`tab-${i}`, { text: txt.trim(), selected: sel });
  }

  // Click recording tab
  const recordTab = panel.locator('[role="tab"]').filter({ hasText: /grav|record/i }).first();
  if (await recordTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await recordTab.click();
    await page.waitForTimeout(500);
    await shot(page, '09-record-tab');
    await dumpPanel(page, 'STATE-3b: record tab selected');
  }

  // Mock microphone
  await page.context().grantPermissions(['microphone']);
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      return dst.stream;
    };
  });

  const recordBtn = panel.locator('button').filter({ hasText: /gravar|record|iniciar|start/i }).first();
  if (await recordBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await shot(page, '10-before-record');
    await recordBtn.click();
    await page.waitForTimeout(600);
    await shot(page, '11-recording-active');
    await dumpPanel(page, 'STATE-4: recording in progress');

    // Stop
    const stopBtn = panel.locator('button').filter({ hasText: /parar|stop|finalizar|finish/i }).first();
    if (await stopBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await stopBtn.click();
    } else {
      await recordBtn.click(); // toggle
    }
    await page.waitForTimeout(1200);
    await shot(page, '12-after-record-stop');
    await dumpPanel(page, 'STATE-5: after recording stopped');
  } else {
    log('record-btn', 'Record button not found');
    await shot(page, '10-no-record-btn');
  }

  // Save after recording
  const saveBtnRec = panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first();
  if (await saveBtnRec.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtnRec.click();
    await page.waitForTimeout(1500);
    await shot(page, '13-after-save-recording');
    const closed = !(await panel.isVisible({ timeout: 3000 }).catch(() => false));
    log('panel-closed-after-recording-save', closed);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 4 — Panel with pre-existing audio (re-open)
  // ════════════════════════════════════════════════════════════════════════════
  await openAudioDropdown(page);
  await openAvatarVoicePanel(page);
  await shot(page, '14-panel-with-prior-audio');
  await dumpPanel(page, 'STATE-6: panel opened when audio already exists');

  // ════════════════════════════════════════════════════════════════════════════
  // STATE 5 — Presets modal
  // ════════════════════════════════════════════════════════════════════════════
  // Close panel first
  const closeBtn = panel.locator('button').first();
  await closeBtn.click().catch(() => {});
  await panel.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  await openAudioDropdown(page);
  const presetsBtn = page.locator('button').filter({ hasText: /predefinições|presets/i }).first();
  if (await presetsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await presetsBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, '15-presets-modal');

    log('presets-modal', await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const buttons = [...dialog.querySelectorAll('button')].map((b, i) => ({
        index: i,
        text: (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        ariaLabel: b.getAttribute('aria-label'),
        classes: b.className.slice(0, 100),
        disabled: b.disabled,
      }));
      const headings = [...dialog.querySelectorAll('h1,h2,h3,h4')].map(h => h.textContent?.trim());
      const listItems = [...dialog.querySelectorAll('[role="listitem"], li, [class*="preset"], [class*="item"]')]
        .slice(0, 15)
        .map(li => ({
          text: (li.textContent || '').trim().slice(0, 60),
          tag: li.tagName?.toLowerCase(),
          classes: li.className?.slice(0, 80),
        }));
      return { found: true, headings, buttons: buttons.slice(0, 20), listItems, htmlPreview: dialog.outerHTML.slice(0, 2000) };
    }));

    // Click first preset item
    const firstPreset = page.locator('[role="dialog"]')
      .locator('button, [role="option"], li')
      .filter({ hasNotText: /^close$|^fechar$|^cancel$|^cancelar$/i })
      .first();
    if (await firstPreset.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstPreset.click();
      await page.waitForTimeout(500);
      await shot(page, '16-preset-selected');
      await dumpPanel(page, 'after-preset-click');

      const confirmBtn = page.locator('button').filter({ hasText: /^save$|^salvar$|^select$|^selecionar$|^use$|^usar$|^confirm$|^confirmar$/i }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shot(page, '17-preset-confirm-btn-visible');
        log('preset-confirm-btn', { text: await confirmBtn.textContent() });
      }
    }
  } else {
    log('presets-btn', 'Presets option not found in dropdown');
  }

  await shot(page, '18-final');

  console.log(`\n✅ Done. Screenshots saved to: ${OUT_DIR}`);
  await page.waitForTimeout(4000);
  await browser.close();
})();
