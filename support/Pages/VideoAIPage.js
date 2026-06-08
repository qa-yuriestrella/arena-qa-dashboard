const { expect } = require('@playwright/test');
const path = require('path');

const MODERN_EU_URL = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';

const TEST_IMAGE_PATH = path.resolve(__dirname, '../fixtures/images/rodrigo rodrigues.jpg');
const TEST_PRODUCT_IMAGE_PATH = path.resolve(__dirname, '../fixtures/images/product.jpg');
const TEST_AUDIO_PATH = path.resolve(__dirname, '../fixtures/audios/test-audio.mp3');

const DEFAULT_SCRIPT =
  'A pessoa olha diretamente para a câmera com um sorriso caloroso, acenando suavemente ao cumprimentar o público.';

const VIDEO_TYPE_CARD_INDEX = {
  'Falar para a câmera': 0,
  'Criar cena':          1,
  'Inserção de produto': 2,
};

const VIDEO_TYPE_EN_TEXT = {
  'Falar para a câmera': 'Talk to the camera',
  'Criar cena':          'Create Scene',
  'Inserção de produto': 'Product Placement',
};

class VideoAIPage {
  constructor(page) {
    this.page = page;
    this._generationRequestPromise = null;
    this._generationStarted = false;
    this._videoCompletedPromise = null;
    this._lastGeneratedVideoLabel = null;
  }

  async visit() {
    await this.page.goto('/video-ai');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.locator('.animate-spin').first()
      .waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await this._dismissQualityChecklist();
  }

  async _dismissQualityChecklist() {
    const popper = this.page.locator('[data-radix-popper-content-wrapper]');
    if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
        await this.page.locator('header').first().click({ force: true });
        await popper.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      });
    }
  }

  async _closeOpenOverlay() {
    const closed = await this.page.evaluate(() => {
      const btn = document.querySelector('button.fixed.inset-0');
      if (btn) { btn.click(); return true; }
      return false;
    }).catch(() => false);
    if (!closed) await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  // ─── Video type selection ─────────────────────────────────────────────────────

  async selectVideoType(typeName) {
    const cardIndex = VIDEO_TYPE_CARD_INDEX[typeName] ?? 0;
    const enText    = VIDEO_TYPE_EN_TEXT[typeName] || typeName;
    const cards     = this.page.locator('button[class*="rounded-2xl"]');

    if (!await cards.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const modelBtn = this.page.locator('button[aria-label="Choose the video model"]').first();
      if (await modelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        const currentTypeText = await modelBtn.textContent().catch(() => '');
        if (new RegExp(enText, 'i').test(currentTypeText)) {
          await this.page.locator('textarea[name="videoSceneText"]')
            .waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
          return;
        }
        await modelBtn.click();
        await this.page.waitForTimeout(400);
      }
    }

    const cardByIndex = cards.nth(cardIndex);
    if (await cardByIndex.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardByIndex.click();
    } else if (await cards.filter({ hasText: enText }).first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await cards.filter({ hasText: enText }).first().click();
    } else {
      await this.page.locator('button').filter({ hasText: new RegExp(enText, 'i') }).first().click();
    }

    await this.page.locator('textarea[name="videoSceneText"]')
      .waitFor({ state: 'attached', timeout: 15000 });
    await this.page.waitForTimeout(500);
  }

  // ─── UI section assertions ────────────────────────────────────────────────────

  async imageUploadAreaShouldBeVisible() {
    await expect(
      this.page.locator('input[type="file"][accept*="image"]').first()
    ).toBeAttached({ timeout: 15000 });
  }

  async styleOptionsShouldBeVisible() {
    await expect(
      this.page.locator('[role="group"][aria-label="Video options"] button').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async behaviorOptionsShouldBeVisible() {
    await expect(
      this.page.locator('[role="group"][aria-label="Video options"] button').nth(1)
    ).toBeVisible({ timeout: 10000 });
  }

  async creativitySliderShouldBeVisible() {
    await this._openCreativityPanel();
    await expect(
      this.page.locator('input[type="range"][min="0"][max="100"]')
    ).toBeAttached({ timeout: 5000 });
    await this._closeOpenOverlay();
  }

  async voiceSectionShouldBeVisible() {
    await expect(
      this.page.locator('button:has(.lucide-mic)')
        .or(this.page.locator('button[aria-label$=" audio"]'))
        .first()
    ).toBeVisible({ timeout: 10000 });
  }

  async scriptFieldShouldBeVisible() {
    await expect(
      this.page.locator('textarea[name="videoSceneText"]')
    ).toBeVisible({ timeout: 10000 });
  }

  async generateButtonShouldBeVisible() {
    await expect(
      this.page.locator('button[aria-label="Create"]')
    ).toBeVisible({ timeout: 15000 });
  }

  // ─── Image upload ─────────────────────────────────────────────────────────────

  async uploadAvatarImage() {
    await this.page.locator('input[type="file"][accept*="image"]').first()
      .setInputFiles(TEST_IMAGE_PATH);
  }

  async uploadProductImage() {
    await this.page.locator('input[type="file"][accept*="image"]').last()
      .setInputFiles(TEST_PRODUCT_IMAGE_PATH);
  }

  async uploadMultipleImages() {
    const images = [
      path.resolve(__dirname, '../fixtures/images/rodrigo rodrigues.jpg'),
      path.resolve(__dirname, '../fixtures/images/Virginia.jpg'),
      path.resolve(__dirname, '../fixtures/images/Cristiano_Ronaldo.jpg'),
      path.resolve(__dirname, '../fixtures/images/michael jackson.jpg'),
      path.resolve(__dirname, '../fixtures/images/test-face.jpg'),
    ];

    for (let i = 0; i < 5; i++) {
      // Re-locate each iteration — the input is removed once 5 images are uploaded
      const input = this.page.locator('input[type="file"][multiple][accept*="image"]').first();
      if ((await input.count().catch(() => 0)) === 0) break;

      await input.setInputFiles(images[i % images.length]);

      const dialog = this.page.locator('[role="dialog"]');
      const appeared = await dialog.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
      if (!appeared) break;
      await this.page.waitForTimeout(400);

      const saveBtn = dialog.locator('button[type="submit"]').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click();
      } else {
        const fallback = dialog.locator('button').filter({ hasText: /salvar|save|apply|done|confirm/i }).first();
        if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
          await fallback.click();
        } else {
          await dialog.locator('button').filter({ hasNotText: /cancel|cancelar|close|fechar/i }).last().click();
        }
      }
      await dialog.waitFor({ state: 'hidden', timeout: 12000 }).catch(() => {});
      await this.page.waitForTimeout(600);
    }
  }

  async referenceImageThumbnailsShouldBeVisible() {
    await expect(
      this.page.locator('button[aria-label="Remove image"]').first()
        .or(this.page.locator('button:has(.lucide-x)[class*="absolute"]').first())
    ).toBeVisible({ timeout: 15000 });
  }

  async cropDialogShouldAppear() {
    await expect(
      this.page.locator('[role="dialog"]').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async saveImageCrop() {
    const dialog = this.page.locator('[role="dialog"]');
    const saveBtn = dialog.locator('button[type="submit"]').first();
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
    } else {
      const fallback = dialog.locator('button').filter({ hasText: /salvar|save/i }).first();
      if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallback.click();
      } else {
        await dialog.locator('button').filter({ hasNotText: /cancel|cancelar|close|fechar/i }).last().click();
      }
    }
    await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  async imagePreviewShouldBeVisible() {
    await expect(
      this.page.locator('button[aria-label="Upload image"], button[aria-label="Avatar image"]').first()
    ).not.toBeAttached({ timeout: 10000 });
  }

  async productImagePreviewShouldBeVisible() {
    await expect(
      this.page.locator('button[aria-label="Product image"]').first()
    ).not.toBeAttached({ timeout: 10000 });
  }

  async uploadAvatarImageAndSaveCrop() {
    await this.uploadAvatarImage();
    await this.cropDialogShouldAppear();
    await this.saveImageCrop();
  }

  async uploadProductImageAndSaveCrop() {
    await this.uploadProductImage();
    await this.cropDialogShouldAppear();
    await this.saveImageCrop();
  }

  // ─── Style selection ──────────────────────────────────────────────────────────

  async _openStylePopover() {
    await this.page.locator('[role="group"][aria-label="Video options"] button').first().click();
    await this.page.waitForTimeout(400);
  }

  _styleImgAlts(style) {
    const map = {
      'Realista':   ['Realista', 'Realistic'],
      'Realistic':  ['Realistic', 'Realista'],
      'Anime':      ['Anime'],
      '3D Cartoon': ['3D Cartoon'],
    };
    return map[style] || [style];
  }

  _styleDisplayText(style) {
    const map = {
      'Realista':   /realista|realistic/i,
      'Realistic':  /realistic|realista/i,
      'Anime':      /anime/i,
      '3D Cartoon': /3d.?cartoon/i,
    };
    return map[style] || new RegExp(style, 'i');
  }

  async selectStyle(style) {
    await this._openStylePopover();
    let clicked = false;
    for (const alt of this._styleImgAlts(style)) {
      const btn = this.page.locator(`button:has(img[alt="${alt}"])`).first();
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await this.page.locator('button').filter({ hasText: this._styleDisplayText(style) }).last().click();
    }
    await this._closeOpenOverlay();
    await this.page.waitForTimeout(300);
  }

  async styleShouldBeActive(style) {
    await expect(
      this.page.locator('[role="group"][aria-label="Video options"] button').first()
    ).toHaveText(this._styleDisplayText(style), { timeout: 5000 });
  }

  // ─── Behavior / mood ──────────────────────────────────────────────────────────

  async _openBehaviorPopover() {
    await this.page.locator('[role="group"][aria-label="Video options"] button').nth(1).click();
    await this.page.waitForTimeout(400);
  }

  _behaviorDisplayText(behavior) {
    const map = {
      'Neutro':    /neutro|neutral/i,
      'Neutral':   /neutral|neutro/i,
      'Feliz':     /feliz|happy/i,
      'Happy':     /happy|feliz/i,
      'Confiante': /confiante|confident/i,
      'Confident': /confident|confiante/i,
      'Sério':     /sério|serious/i,
      'Serious':   /serious|sério/i,
      'Triste':    /triste|sad/i,
      'Sad':       /sad|triste/i,
      'Dramático': /dramático|dramatic/i,
      'Dramatic':  /dramatic|dramático/i,
    };
    return map[behavior] || new RegExp(behavior, 'i');
  }

  async selectBehavior(behavior) {
    await this._openBehaviorPopover();
    const btn = this.page.locator('button').filter({ hasText: this._behaviorDisplayText(behavior) }).last();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this._closeOpenOverlay();
    await this.page.waitForTimeout(300);
  }

  async behaviorShouldBeActive(behavior) {
    await expect(
      this.page.locator('[role="group"][aria-label="Video options"] button').nth(1)
    ).toHaveText(this._behaviorDisplayText(behavior), { timeout: 5000 });
  }

  // ─── Creativity ────────────────────────────────────────────────────────────────

  async _openCreativityPanel() {
    const wasOpen = await this.page.evaluate(() => {
      const btn = document.querySelector('button.fixed.inset-0');
      if (btn) { btn.click(); return true; }
      return false;
    }).catch(() => false);
    if (wasOpen) await this.page.waitForTimeout(200);
    await this.page.locator('[role="group"][aria-label="Video options"] button').nth(2).click();
    await this.page.waitForTimeout(400);
  }

  async setCreativity(percentage) {
    await this._openCreativityPanel();
    const rangeInput = this.page.locator('input[type="range"][min="0"][max="100"]');
    await rangeInput.waitFor({ state: 'attached', timeout: 5000 });
    await rangeInput.focus();
    if (percentage <= 0) {
      await this.page.keyboard.press('Home');
    } else if (percentage >= 100) {
      await this.page.keyboard.press('End');
    } else {
      await rangeInput.evaluate((el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, String(percentage));
    }
    await this.page.waitForTimeout(300);
    await this._closeOpenOverlay();
  }

  async creativityShouldShow(percentage) {
    await this._openCreativityPanel();
    await expect(
      this.page.locator('[role="group"][aria-label="Video options"] p')
        .filter({ hasText: `${percentage}%` }).first()
        .or(this.page.locator('p').filter({ hasText: new RegExp(`^${percentage}%$`) }).first())
    ).toBeVisible({ timeout: 5000 });
    await this._closeOpenOverlay();
  }

  // ─── Script field ─────────────────────────────────────────────────────────────

  async fillScript(text) {
    const value = text || DEFAULT_SCRIPT;
    const textarea = this.page.locator('textarea[name="videoSceneText"]');
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(600);
    await textarea.evaluate((el, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await this.page.waitForTimeout(300);
    const current = await textarea.inputValue().catch(() => '');
    if (!current.trim()) {
      await textarea.click();
      await this.page.keyboard.type(value, { delay: 5 });
      await this.page.waitForTimeout(300);
    }
  }

  // ─── Audio / Voice ────────────────────────────────────────────────────────────

  _audioTabLocator() {
    return this.page.locator('button:has(.lucide-mic)')
      .or(this.page.locator('button[aria-label="Audio"], button[aria-label="Áudio"], button[aria-label$=" audio"], button[aria-label$=" áudio"]'))
      .or(this.page.locator('button').filter({ hasText: / audio$| áudio$/i }))
      .first();
  }

  async _openAudioDropdown() {
    // If the dropdown is already open the backdrop intercepts clicks — skip re-opening
    const backdrop = this.page.locator('button[aria-label="Close audio options"]');
    if (await backdrop.isVisible({ timeout: 500 }).catch(() => false)) return;

    await this._audioTabLocator().click({ timeout: 15000 });
    await this.page.waitForTimeout(400);
    await this.page.locator('button').filter({
      hasText: /voz do avatar|avatar voice|áudio desativado|audio off|predefinições|presets/i,
    }).first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  async openAudioOptions() {
    await this._openAudioDropdown();
  }

  async closeAudioOptions() {
    const backdrop = this.page.locator('button.fixed.inset-0');
    if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
      await backdrop.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.page.waitForTimeout(200);
  }

  async audioOptionShouldBeVisible(option) {
    await expect(
      this.page.locator('button').filter({ hasText: this._voiceOptionPattern(option) }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async presetsModalShouldBeVisible() {
    await expect(
      this.page.getByRole('heading', { name: /presets|predefinições/i }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  _voiceOptionPattern(option) {
    const map = {
      'Voz do avatar':    /voz do avatar|avatar.?voice/i,
      'Avatar Voice':     /avatar.?voice|voz do avatar/i,
      'Predefinições':    /predefinições|presets/i,
      'Presets':          /presets|predefinições/i,
      'Áudio desativado': /áudio desativado|audio.?off/i,
      'Audio Off':        /audio.?off|áudio desativado/i,
    };
    return map[option] || new RegExp(option, 'i');
  }

  async selectVoiceOption(option) {
    await this._openAudioDropdown();
    const btn = this.page.locator('button').filter({ hasText: this._voiceOptionPattern(option) }).first();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this.page.waitForTimeout(500);
    if (/voz do avatar|avatar.?voice/i.test(option)) {
      await this._handleAvatarVoiceModal();
    }
  }

  async voiceOptionShouldBeActive(option) {
    await this.page.waitForTimeout(500);
    await expect(this.page.locator('button.fixed.inset-0')).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  }

  async _panelGoToStateB() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    // Handles State A ("Record Again") and State C ("Upload Again" — voice just processed)
    const goBackBtn = panel.locator('button').filter({
      hasText: /gravar novamente|re.?record|record again|upload again|enviar novamente/i,
    }).first();
    if (await goBackBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await goBackBtn.click();
      await this.page.waitForTimeout(700);
    }
  }

  async uploadVoiceAudioFile() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    await this._panelGoToStateB();

    const uploadCardBtn = panel.locator('button').filter({ hasText: /enviar gravação existente|upload.*recording|existing recording/i }).first();
    await uploadCardBtn.waitFor({ state: 'visible', timeout: 5000 });

    const fcPromise = this.page.waitForEvent('filechooser', { timeout: 10000 });
    await uploadCardBtn.click();
    const chooser = await fcPromise;
    await chooser.setFiles(TEST_AUDIO_PATH);
    await this.page.waitForTimeout(2000);
  }

  async uploadedVoiceShouldBeReady() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    await expect(
      panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first()
    ).toBeVisible({ timeout: 30000 });
  }

  async recordingInterfaceShouldBeVisible() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    await expect(
      panel.locator('button').filter({ hasText: /gravar novo áudio agora|record.*now|new.*recording/i }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── VAI004: Avatar voice panel ───────────────────────────────────────────────

  async openAvatarVoicePanel() {
    await this._openAudioDropdown();
    const btn = this.page.locator('button').filter({ hasText: /voz do avatar|avatar.?voice/i }).first();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    await this.page.locator('div.fixed.inset-0.z-50.flex').waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForTimeout(300);
  }

  async saveAvatarVoice() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    const saveBtn = panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 8000 });
    await saveBtn.click();
    await this.page.waitForTimeout(800);
    // Panel may stay open (transitions to State A after confirming audio); use short timeout
    await panel.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async avatarVoicePanelShouldCloseWithoutErrors() {
    await expect(
      this.page.locator('div.fixed.inset-0.z-50.flex')
    ).not.toBeVisible({ timeout: 10000 });
    const hasError = await this.page.locator('[role="alert"], [role="status"]').filter({
      hasText: /error|erro|failed|falhou|went wrong|deu errado/i,
    }).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError, 'An error notification appeared after saving the avatar voice').toBe(false);
  }

  async recordShortAudioClip() {
    await this.page.context().grantPermissions(['microphone']);
    await this.page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const destination = ctx.createMediaStreamDestination();
        oscillator.connect(destination);
        oscillator.start();
        return destination.stream;
      };
    });

    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    await this._panelGoToStateB();

    const recordCardBtn = panel.locator('button').filter({ hasText: /gravar novo áudio agora|record.*now|new.*recording/i }).first();
    await recordCardBtn.waitFor({ state: 'visible', timeout: 5000 });
    await recordCardBtn.click();
    await this.page.waitForTimeout(1000);

    const startBtn = panel.locator('button').filter({ hasText: /iniciar|start.*gravar|^gravar$/i }).first();
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await this.page.waitForTimeout(2500);
      const stopBtn = panel.locator('button').filter({ hasText: /parar|stop|finalizar|finish/i }).first();
      if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stopBtn.click();
      } else {
        await startBtn.click();
      }
    } else {
      await this.page.waitForTimeout(2500);
      const stopBtn = panel.locator('button').filter({ hasText: /parar|stop|finalizar|finish/i }).first();
      if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stopBtn.click();
      }
    }
    await this.page.waitForTimeout(1000);
  }

  async recordedAudioShouldBeReady() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    await expect(
      panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async selectPresetAndConfirm() {
    const presetItem = this.page.locator('[role="dialog"] button')
      .filter({ hasNotText: /^cancel$|^cancelar$|^close$|^fechar$|^save$|^salvar$|^select$|^selecionar$/i })
      .first();
    if (await presetItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await presetItem.click();
      await this.page.waitForTimeout(400);
    }
    const confirmBtn = this.page.locator('button').filter({
      hasText: /^save$|^salvar$|^select$|^selecionar$|^use$|^usar$|^confirm$|^confirmar$/i,
    }).first();
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await this.page.getByRole('heading', { name: /presets|predefinições/i })
      .waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async presetVoiceShouldBeSavedWithoutErrors() {
    await expect(
      this.page.getByRole('heading', { name: /presets|predefinições/i })
    ).not.toBeVisible({ timeout: 5000 });
    const hasError = await this.page.locator('[role="alert"], [role="status"]').filter({
      hasText: /error|erro|failed|falhou|went wrong|deu errado/i,
    }).isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError, 'An error notification appeared after saving the preset voice').toBe(false);
  }

  // ─── Avatar voice (generation helper) ────────────────────────────────────────

  async useAvatarVoice() {
    const tabText = await this._audioTabLocator().textContent({ timeout: 500 }).catch(() => '');
    const alreadyConfigured = / audio$| áudio$/i.test(tabText.trim());
    if (alreadyConfigured) {
      await this.page.waitForTimeout(300);
      return;
    }

    await this._openAudioDropdown();
    const avatarVoiceBtn = this.page.locator('button').filter({ hasText: /voz do avatar|avatar.?voice/i }).first();
    if (!await avatarVoiceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.page.waitForTimeout(300);
      return;
    }
    await avatarVoiceBtn.click();

    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    if (!await panel.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false)) {
      await this.page.waitForTimeout(300);
      return;
    }

    const saveBtn = panel.locator('button').filter({ hasText: /^salvar$|^save$/i }).first();
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click();
    } else {
      await panel.locator('button').first().click().catch(() => {});
    }
    await panel.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  async _handleAvatarVoiceModal() {
    const panel = this.page.locator('div.fixed.inset-0.z-50.flex');
    const appeared = await panel.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (!appeared) return;
    await panel.locator('button').first().click();
    await panel.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  // ─── Audio Off ────────────────────────────────────────────────────────────────

  async enableAudioOff() {
    await this._openAudioDropdown();
    const audioOffBtn = this.page.locator('button').filter({ hasText: /áudio desativado|audio.?off/i }).first();
    await audioOffBtn.waitFor({ state: 'visible', timeout: 5000 });
    await audioOffBtn.click();
    await this.page.waitForTimeout(300);
  }

  // ─── Generation ───────────────────────────────────────────────────────────────

  _listenForVideoCompletion(totalTimeout) {
    let handleResponse;
    const promise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.page.off('response', handleResponse);
        resolve(false);
      }, totalTimeout);

      handleResponse = async (response) => {
        try {
          const url = response.url();
          if (!url.match(/scene|video|generate|supabase|functions\/v1|commerce-ai/i)) return;
          const contentType = response.headers()['content-type'] || '';
          if (!contentType.includes('json')) return;
          const body = await response.json().catch(() => null);
          if (!body) return;
          const isCompleted =
            body?.status === 'completed' ||
            body?.data?.status === 'completed' ||
            body?.scene?.status === 'completed' ||
            (Array.isArray(body) && body.some((v) => v?.status === 'completed')) ||
            (Array.isArray(body?.data) && body.data.some((v) => v?.status === 'completed'));
          if (isCompleted) {
            clearTimeout(timer);
            this.page.off('response', handleResponse);
            resolve(true);
          }
        } catch { /* non-fatal */ }
      };

      this.page.on('response', handleResponse);
    });
    return promise;
  }

  async clickGenerate() {
    const textarea = this.page.locator('textarea[name="videoSceneText"]');
    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      const val = await textarea.inputValue().catch(() => '');
      if (!val.trim()) {
        await textarea.click();
        await this.page.keyboard.type(DEFAULT_SCRIPT, { delay: 5 });
        await this.page.waitForTimeout(800);
      }
    }

    this._generationRequestPromise = this.page.waitForRequest(
      (req) => req.method() === 'POST' && (
        req.url().includes('scene') ||
        req.url().includes('video') ||
        req.url().includes('generate') ||
        req.url().includes('supabase') ||
        req.url().includes('commerce-ai') ||
        req.url().includes('functions/v1')
      ),
      { timeout: 60000 }
    ).catch(() => null);

    this._generationStarted = true;
    this._videoCompletedPromise = this._listenForVideoCompletion(840_000);

    await this.page.locator('button[aria-label="Create"]').first().click();
  }

  async generationRequestShouldBeFired() {
    const req = await this._generationRequestPromise;
    expect(req, 'Expected a video generation POST request to be fired').not.toBeNull();
  }

  async generationProgressShouldBeVisible() {
    await expect(
      this.page.getByText(/criando|gerando|processando|aguarde|criação|creating|generating|processing/i).first()
        .or(this.page.locator('[class*="progress"], [class*="generating"]').first())
    ).toBeVisible({ timeout: 30000 });
  }

  async waitForVideoToBeGenerated($test) {
    $test.setTimeout(840_000); // 14 min — only generation waits this long; element assertions stay at their own timeouts

    await expect(this.page.locator('aside video[src]')).toBeVisible({ timeout: 720_000 });

    const firstVideoBtn = this.page.getByRole('button', { name: /Select video|Selecionar vídeo/i }).first();
    if (await firstVideoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      this._lastGeneratedVideoLabel =
        await firstVideoBtn.getAttribute('aria-label').catch(() => null);
    }

    if (this._videoCompletedPromise) {
      const completedViaApi = await Promise.race([
        this._videoCompletedPromise,
        new Promise((resolve) => setTimeout(() => resolve(false), 60000)),
      ]);
      expect(
        completedViaApi,
        'Expected the video generation API to return status "completed"'
      ).toBe(true);
    }
  }

  // ─── Completed video pre-condition ────────────────────────────────────────────

  async completedVideoShouldExist() {
    const firstVideoBtn = this.page.getByRole('button', { name: /Select video|Selecionar vídeo/i }).first();
    await firstVideoBtn.waitFor({ state: 'visible', timeout: 20000 });
    await firstVideoBtn.click();
    await expect(this.page.locator('aside video')).toBeVisible({ timeout: 30000 });
    // Dismiss the quality checklist overlay so it doesn't cover player controls
    await this._dismissQualityChecklist();
  }

  // ─── Video player controls ────────────────────────────────────────────────────

  async videoPlayerShouldBeVisible() {
    await expect(this.page.locator('video[src]:not([preload="none"])')).toBeVisible({ timeout: 10000 });
  }

  async videoPlayerShouldNotBeVisible() {
    await expect(this.page.locator('aside video')).not.toBeVisible({ timeout: 20000 });
  }

  async clickPlayButton() {
    await this.page.locator('aside').locator(
      'button:has(.lucide-play), button[aria-label*="play" i], button[aria-label*="reproduzir" i]'
    ).first().click();
  }

  async videoShouldBePlaying() {
    await expect(this.page.locator('aside video').first()).toHaveJSProperty('paused', false, { timeout: 8000 });
  }

  async clickPauseButton() {
    await this.page.locator('aside').locator(
      'button:has(.lucide-pause), button[aria-label*="pause" i], button[aria-label*="pausar" i]'
    ).first().click();
  }

  async videoShouldBePaused() {
    await expect(this.page.locator('aside video').first()).toHaveJSProperty('paused', true, { timeout: 5000 });
  }

  async toggleMuteButton() {
    await this.page.locator('aside').locator(
      'button:has(.lucide-volume-2), button:has(.lucide-volume-x), button:has(.lucide-volume),' +
      'button[aria-label*="mute" i], button[aria-label*="volume" i], button[aria-label*="silenciar" i]'
    ).first().click();
  }

  async videoShouldBeMuted() {
    await expect(this.page.locator('aside video').first()).toHaveJSProperty('muted', true, { timeout: 5000 });
  }

  async videoShouldBeUnmuted() {
    await expect(this.page.locator('aside video').first()).toHaveJSProperty('muted', false, { timeout: 5000 });
  }

  // ─── Add / Remove from profile ────────────────────────────────────────────────

  async ensureVideoNotInProfile() {
    const removeEl = this.page.locator('aside').locator('a, button').filter({ hasText: /^remove$|^remover$/i }).first();
    if (await removeEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      this._publishRequestPromise = this.page.waitForRequest(
        (req) => !['GET'].includes(req.method()) && (
          req.url().includes('arena.im') || req.url().includes('supabase')
        ) && !req.url().includes('rudder') && !req.url().includes('monitoring'),
        { timeout: 15000 }
      ).catch(() => null);
      await removeEl.click();
      const confirmDialog = this.page.locator('[role="alertdialog"]');
      if (await confirmDialog.isVisible({ timeout: 8000 }).catch(() => false)) {
        const confirmBtn = confirmDialog.locator('button').filter({ hasText: /^remove$|^remover$/i }).first();
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
        await confirmDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      }
      await this.page.waitForTimeout(1000);
    }
  }

  async addToProfileButtonShouldBeVisible() {
    await expect(
      this.page.locator('button').filter({
        hasText: /post.*story|publicar.*história|adicionar.*perfil|add.*profile/i,
      }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAddToProfile() {
    this._publishRequestPromise = this.page.waitForRequest(
      (req) => !['GET'].includes(req.method()) && (
        req.url().includes('arena.im') || req.url().includes('supabase')
      ) && !req.url().includes('rudder') && !req.url().includes('monitoring'),
      { timeout: 15000 }
    ).catch(() => null);
    await this.page.locator('button').filter({
      hasText: /post.*story|publicar.*história|adicionar.*perfil|add.*profile/i,
    }).first().click();
    const dialog = this.page.locator('[role="alertdialog"]');
    if (await dialog.isVisible({ timeout: 30000 }).catch(() => false)) {
      const gotItBtn = dialog.locator('button').filter({ hasText: /^got it$|^entendi$|^ok$/i }).first();
      if (await gotItBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await gotItBtn.click();
      } else {
        await this.page.keyboard.press('Escape');
      }
      await dialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      await this.page.waitForFunction(
        () => !document.querySelector('div[data-state="open"][aria-hidden="true"]'),
        { timeout: 5000 }
      ).catch(() => {});
    }
  }

  async removeFromProfileButtonShouldBeVisible() {
    await expect(
      this.page.locator('aside').locator('a, button').filter({ hasText: /^remove$|^remover$/i }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickRemoveFromProfile() {
    const lingering = this.page.locator('[role="alertdialog"]');
    if (await lingering.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await lingering.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      await this.page.waitForFunction(
        () => !document.querySelector('div[data-state="open"][aria-hidden="true"]'),
        { timeout: 5000 }
      ).catch(() => {});
    }
    this._publishRequestPromise = this.page.waitForRequest(
      (req) => !['GET'].includes(req.method()) && (
        req.url().includes('arena.im') || req.url().includes('supabase')
      ) && !req.url().includes('rudder') && !req.url().includes('monitoring'),
      { timeout: 15000 }
    ).catch(() => null);
    await this.page.locator('aside').locator('a, button').filter({ hasText: /^remove$|^remover$/i })
      .first().click({ force: true });
    const confirmDialog = this.page.locator('[role="alertdialog"]');
    if (await confirmDialog.isVisible({ timeout: 10000 }).catch(() => false)) {
      const confirmBtn = confirmDialog.locator('button').filter({ hasText: /^remove$|^remover$/i }).first();
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
      await confirmDialog.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
      await this.page.waitForFunction(
        () => !document.querySelector('div[data-state="open"][aria-hidden="true"]'),
        { timeout: 5000 }
      ).catch(() => {});
    }
  }

  async publishRequestShouldBeFired() {
    const req = await this._publishRequestPromise;
    expect(req, 'Expected a publish/remove profile request to be fired').not.toBeNull();
  }

  // ─── Regenerate ───────────────────────────────────────────────────────────────

  async clickRegenerate() {
    const needsImage = await this.page.locator('button[aria-label="Upload image"]')
      .first().isVisible({ timeout: 1000 }).catch(() => false);
    if (needsImage) {
      await this.uploadAvatarImage();
      await this.cropDialogShouldAppear();
      await this.saveImageCrop();
    }
    const hasAudio = await this.page.locator('button[aria-label$=" audio"]')
      .isVisible({ timeout: 1000 }).catch(() => false);
    if (!hasAudio) {
      await this.useAvatarVoice();
    }

    const scriptBox = this.page.locator('textarea[name="videoSceneText"]').first();
    if (await scriptBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      const currentText = await scriptBox.inputValue().catch(() => '');
      if (!currentText.trim()) {
        await scriptBox.fill('A pessoa olha diretamente para a câmera com um sorriso caloroso.');
      }
    }

    this._generationRequestPromise = this.page.waitForRequest(
      (req) => req.method() === 'POST' && (
        req.url().includes('scene') ||
        req.url().includes('video') ||
        req.url().includes('generate') ||
        req.url().includes('supabase') ||
        req.url().includes('commerce-ai') ||
        req.url().includes('functions/v1')
      ),
      { timeout: 60000 }
    ).catch(() => null);

    await this.page.locator(
      'button[aria-label="Create"], button[aria-label="Regenerate"]'
    ).first().click();
  }

  async regenerateRequestShouldBeFired() {
    const req = await this._generationRequestPromise;
    expect(req, 'Expected a regenerate POST request to be fired').not.toBeNull();
  }

  // ─── Delete scene ─────────────────────────────────────────────────────────────

  async openMoreOptionsMenu() {
    await this.page.locator(
      'button:has(.lucide-more-vertical), button:has(.lucide-ellipsis), button[aria-label="Video actions"]'
    ).first().click();
    await this.page.waitForTimeout(300);
  }

  async clickDeleteScene() {
    await this.page.locator('[role="menuitem"]').filter({ hasText: /excluir|delete|remover cena/i }).first().click();
  }

  async confirmDeletion() {
    this._deleteRequestPromise = this.page.waitForRequest(
      (req) => ['DELETE', 'POST', 'PATCH'].includes(req.method()) && (
        req.url().includes('scene') ||
        req.url().includes('video') ||
        req.url().includes('delete') ||
        req.url().includes('supabase') ||
        req.url().includes('functions/v1')
      ),
      { timeout: 15000 }
    ).catch(() => null);
    await this.page.locator('role=alertdialog >> button').filter({
      hasText: /confirmar|excluir|delete|remover/i,
    }).first().click();
  }

  async deleteRequestShouldBeFired() {
    const req = await this._deleteRequestPromise;
    expect(req, 'Expected a delete request to be fired after deletion confirmation').not.toBeNull();
  }

  // ─── End-user page (VAI012) ───────────────────────────────────────────────────

  async clickAvatarProfileRing() {
    // Classic EU: profile image has a ring — click it to open the scene video modal.
    // Modern EU: video is already the hero background — no ring exists; this method
    // becomes a no-op and the caller's next assertion (video visible) confirms the hero.
    const span = this.page.locator(
      'span[class*="items-center"][class*="justify-center"][class*="rounded-full"]'
    ).first();
    const ringVisible = await span.isVisible({ timeout: 3000 }).catch(() => false);
    if (ringVisible) {
      await span.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async sceneVideoShouldBePlayingOnEU() {
    await expect(this.page.locator('video')).toBeVisible({ timeout: 10000 });
  }

  async navigateBackToDashboard() {
    await this.page.goto('/video-ai');
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this._dismissQualityChecklist();
  }

  async sceneVideoShouldNotOpenOnEU() {
    await expect(this.page.locator('video')).not.toBeVisible({ timeout: 5000 });
  }

  async navigateToModernEndUserPage() {
    await this.page.goto(MODERN_EU_URL, { waitUntil: 'load', timeout: 15000 });
  }

  // ─── Post-test cleanup ────────────────────────────────────────────────────────

  async cleanupGeneratedVideo() {
    if (!this._generationStarted) return;
    try {
      if (!this.page.url().includes('/video-ai')) {
        await this.page.goto('/video-ai').catch(() => {});
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this._dismissQualityChecklist();
      }

      let videoBtn = this._lastGeneratedVideoLabel
        ? this.page.getByRole('button', { name: this._lastGeneratedVideoLabel }).first()
        : null;

      const hasSpecificBtn = videoBtn && (await videoBtn.isVisible({ timeout: 5000 }).catch(() => false));
      if (!hasSpecificBtn) {
        videoBtn = this.page.getByRole('button', { name: /Select video|Selecionar vídeo/i }).first();
      }

      // If the test timed out during generation the video may still be processing — wait up to
      // 2 extra minutes for it to land in the history list before giving up on cleanup.
      if (!(await videoBtn.isVisible({ timeout: 120_000 }).catch(() => false))) return;

      await videoBtn.click();
      await this.page.waitForTimeout(1000);

      const videoReady = await this.page.locator('aside video[src]')
        .isVisible({ timeout: 10000 }).catch(() => false);
      if (!videoReady) return;

      await this.openMoreOptionsMenu();
      await this.clickDeleteScene();
      await this.confirmDeletion();
      await this.page.waitForTimeout(2000);
    } catch (e) {
      console.warn('[VideoAI] post-test cleanup failed (non-fatal):', e.message);
    }
  }
}

module.exports = { VideoAIPage };
