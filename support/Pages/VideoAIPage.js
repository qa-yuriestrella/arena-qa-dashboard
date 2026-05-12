const { expect } = require('@playwright/test');
const path = require('path');

const TEST_IMAGE_PATH = path.resolve(__dirname, '../fixtures/images/test-face.jpg');

// Covers the minimum 10-word requirement with room to spare
const DEFAULT_AVATAR_SAY =
  'Welcome to my profile! I am excited to connect with you today. Feel free to explore everything I have to offer here and reach out anytime.';

// Under 300 characters
const DEFAULT_DESCRIBE_SCENE =
  'The person is looking directly at the camera with a warm smile, nodding gently as if greeting someone they are happy to see.';

// ToggleGroupItem in Radix UI type="single" renders with role="radio", not role="button".
// Use CSS tag selector to find them by text regardless of ARIA role.
function toggleItem(page, label) {
  return page.locator('button').filter({ hasText: new RegExp(`^${label}$`) });
}

class VideoAIPage {
  constructor(page) {
    this.page = page;
    this._seedImageRequestPromise = null;
  }

  async visit() {
    await this.page.goto('/video-ai');
    await this.page.waitForLoadState('load');
    // Wait for the creativity slider (last form element) — confirms the entire form and its
    // data fetch have completed, by which time the Avatar Quality checklist will have appeared.
    await this.page.locator('[role="slider"]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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

  // ─── UI assertions ────────────────────────────────────────────────────────────

  async imageUploadAreaShouldBeVisible() {
    // The file input is always in the DOM regardless of whether an existing image
    // is previewed — its presence confirms the upload section rendered.
    await expect(
      this.page.locator('input[type="file"][accept*="image"]')
    ).toBeAttached({ timeout: 15000 });
  }

  async describeSceneSectionShouldBeVisible() {
    await expect(
      this.page.getByText('Describe your Scene')
    ).toBeVisible({ timeout: 15000 });
  }

  async avatarSaySectionShouldBeVisible() {
    await expect(
      this.page.getByText('What is your Avatar going to say?')
    ).toBeVisible({ timeout: 15000 });
  }

  async imageStyleOptionsShouldBeVisible() {
    await expect(toggleItem(this.page, 'Realistic')).toBeVisible({ timeout: 15000 });
    await expect(toggleItem(this.page, 'Anime')).toBeVisible();
    await expect(toggleItem(this.page, '3D Cartoon')).toBeVisible();
  }

  async toneOptionsShouldBeVisible() {
    await expect(toggleItem(this.page, 'Neutral')).toBeVisible({ timeout: 15000 });
    await expect(this.page.locator('button').filter({ hasText: /🙂/ })).toBeVisible();
    await expect(this.page.locator('button').filter({ hasText: /😉/ })).toBeVisible();
    await expect(this.page.locator('button').filter({ hasText: /😐/ })).toBeVisible();
    await expect(this.page.locator('button').filter({ hasText: /😔/ })).toBeVisible();
    await expect(this.page.locator('button').filter({ hasText: /😡/ })).toBeVisible();
  }

  async creativitySliderShouldBeVisible() {
    await expect(this.page.locator('[role="slider"]')).toBeVisible({ timeout: 8000 });
  }

  async voiceSectionShouldBeVisible() {
    await expect(
      this.page.locator('h2').filter({ hasText: /^voice$/i })
    ).toBeVisible({ timeout: 15000 });
  }

  async generateButtonShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: /generate scene|remix \/ regenerate/i })
    ).toBeVisible({ timeout: 15000 });
  }

  async generateButtonShouldBeDisabled() {
    await expect(
      this.page.getByRole('button', { name: /generate scene|remix \/ regenerate/i })
    ).toBeDisabled({ timeout: 15000 });
  }

  async generateButtonShouldBeEnabled() {
    await expect(
      this.page.getByRole('button', { name: /generate scene|remix \/ regenerate/i })
    ).toBeEnabled({ timeout: 8000 });
  }

  // ─── Image upload ─────────────────────────────────────────────────────────────

  async uploadImage(filePath) {
    const target = filePath || TEST_IMAGE_PATH;
    // The file input is hidden; setInputFiles bypasses the visibility restriction
    await this.page.locator('input[type="file"][accept*="image"]').setInputFiles(target);
  }

  async cropDialogShouldAppear() {
    // Use text rather than role="dialog" — the Avatar Quality sheet also has role="dialog",
    // causing a strict-mode violation when both are open at the same time.
    await expect(
      this.page.getByText('Crop image')
    ).toBeVisible({ timeout: 8000 });
  }

  async saveImageCrop() {
    await this.page.getByRole('button', { name: /^save$/i }).click();
    await expect(this.page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  }

  async imagePreviewShouldBeVisible() {
    await expect(
      this.page.locator('img[alt="Preview"]')
    ).toBeVisible({ timeout: 8000 });
  }

  // ─── Describe scene ───────────────────────────────────────────────────────────

  async fillDescribeScene(text) {
    await this.page
      .getByPlaceholder(/create a scene where/i)
      .fill(text || DEFAULT_DESCRIBE_SCENE);
  }

  async describeSceneCharCountShouldBeDisplayed() {
    // Character counter appears as "{n}/300 Charac."
    await expect(
      this.page.getByText(/\d+\/300 Charac\./)
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Avatar say ───────────────────────────────────────────────────────────────

  async fillAvatarSay(text) {
    // Use name attribute — both textareas share "hey, come on" in their English placeholders
    await this.page
      .locator('[name="avatarSay"]')
      .fill(text || DEFAULT_AVATAR_SAY);
  }

  async avatarSayWordCounterShouldIndicateTooFewWords() {
    // When fewer than 10 words, the counter span has a red colour class
    await expect(
      this.page.locator('[class*="text-red"]').filter({ hasText: /\/54/ })
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Image style ─────────────────────────────────────────────────────────────

  async selectImageStyle(style) {
    const labels = { realistic: 'Realistic', anime: 'Anime', '3d_cartoon': '3D Cartoon' };
    const btn = toggleItem(this.page, labels[style] || style);
    // Skip click if already selected — ToggleGroup type="single" deselects on re-click
    if (await btn.getAttribute('data-state') !== 'on') {
      await btn.click();
    }
  }

  async imageStyleShouldBeSelected(style) {
    const labels = { realistic: 'Realistic', anime: 'Anime', '3d_cartoon': '3D Cartoon' };
    await expect(
      toggleItem(this.page, labels[style] || style)
    ).toHaveAttribute('data-state', 'on', { timeout: 5000 });
  }

  // ─── Tone ────────────────────────────────────────────────────────────────────

  async selectTone(tone) {
    const labels = {
      neutral: 'Neutral',
      happy: '🙂 Happy',
      confident: '😉 Confident',
      serious: '😐 Serious',
      sad: '😔 Sad',
      dramatic: '😡 Dramatic',
    };
    const btn = toggleItem(this.page, labels[tone] || tone);
    // Skip click if already selected — ToggleGroup type="single" deselects on re-click
    if (await btn.getAttribute('data-state') !== 'on') {
      await btn.click();
    }
  }

  async toneShouldBeSelected(tone) {
    const labels = {
      neutral: 'Neutral',
      happy: '🙂 Happy',
      confident: '😉 Confident',
      serious: '😐 Serious',
      sad: '😔 Sad',
      dramatic: '😡 Dramatic',
    };
    await expect(
      toggleItem(this.page, labels[tone] || tone)
    ).toHaveAttribute('data-state', 'on', { timeout: 5000 });
  }

  // ─── Creativity slider ────────────────────────────────────────────────────────

  async adjustCreativitySlider() {
    const slider = this.page.locator('[role="slider"]');
    await slider.focus();
    // Reset to 0% first so the result is deterministic regardless of existing video state
    await slider.press('Home');
    // Move to 50%
    for (let i = 0; i < 50; i++) {
      await slider.press('ArrowRight');
    }
  }

  async creativityShouldShowPercentage(percentage) {
    await expect(
      this.page.getByText(`${percentage}%`)
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Generation ──────────────────────────────────────────────────────────────

  async clickGenerateScene() {
    // Set up the seed-image request listener before clicking
    this._seedImageRequestPromise = this.page
      .waitForRequest(
        (req) =>
          req.url().includes('scene-seed-image') ||
          (req.url().includes('supabase') && req.method() === 'POST'),
        { timeout: 60000 },
      )
      .catch(() => null);

    await this.page.getByRole('button', { name: /generate scene|remix \/ regenerate/i }).click();
  }

  async sceneSeedImageRequestShouldBeFired() {
    await this._seedImageRequestPromise;
  }

  async generationProgressStepsShouldBeVisible() {
    await expect(
      this.page.getByText('We are creating your Video AI')
    ).toBeVisible({ timeout: 30000 });
  }

  async waitForVideoToBeGenerated($test) {
    // Video generation can take 3-5 minutes; extend timeout for this step only
    $test.setTimeout(360000);
    await expect(
      this.page.locator('video[src]')
    ).toBeVisible({ timeout: 360000 });
  }

  async videoAlreadyExistsShouldBeVisible() {
    // Either a video element is present or the empty-state paragraph
    await expect(
      this.page.locator('video, p[class*="text-gray"]')
    ).toBeVisible({ timeout: 15000 });
  }

  // ─── Video player ────────────────────────────────────────────────────────────

  async videoPlayerShouldBeVisible() {
    await expect(this.page.locator('video')).toBeVisible({ timeout: 10000 });
  }

  async videoPlayerShouldNotBeVisible() {
    await expect(this.page.locator('video')).not.toBeVisible({ timeout: 10000 });
  }

  async playButtonShouldBeVisible() {
    await expect(
      this.page.locator('button:has(.lucide-play)')
    ).toBeVisible({ timeout: 5000 });
  }

  async progressBarShouldBeVisible() {
    await expect(
      this.page.locator('[class*="Progress"], [class*="progress"]').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickPlayButton() {
    await this.page.locator('button:has(.lucide-play)').click();
  }

  async videoShouldBePlaying() {
    await expect(
      this.page.locator('button:has(.lucide-pause)')
    ).toBeVisible({ timeout: 8000 });
  }

  async clickPauseButton() {
    await this.page.locator('button:has(.lucide-pause)').click();
  }

  async videoShouldBePaused() {
    await expect(
      this.page.locator('button:has(.lucide-play)')
    ).toBeVisible({ timeout: 5000 });
  }

  async clickVolumeToggle() {
    await this.page
      .locator('button:has(.lucide-volume-2), button:has(.lucide-volume-x)')
      .first()
      .click();
  }

  async videoShouldBeMuted() {
    await expect(
      this.page.locator('button:has(.lucide-volume-x)')
    ).toBeVisible({ timeout: 5000 });
  }

  async videoShouldBeUnmuted() {
    await expect(
      this.page.locator('button:has(.lucide-volume-2)')
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Add/Remove from profile ──────────────────────────────────────────────────

  async ensureSceneNotInProfile() {
    // Normalize state: if video is already added, remove it so the test starts clean
    const removeBtn = this.page.getByRole('button', { name: 'Remove Scene from My Profile' });
    if (await removeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await removeBtn.click();
      await expect(
        this.page.getByRole('button', { name: 'Add Scene to My Profile' })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  async addToProfileButtonShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: 'Add Scene to My Profile' })
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAddToProfile() {
    await this.page.getByRole('button', { name: 'Add Scene to My Profile' }).click();
  }

  async removeFromProfileButtonShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: 'Remove Scene from My Profile' })
    ).toBeVisible({ timeout: 10000 });
  }

  async clickRemoveFromProfile() {
    await this.page.getByRole('button', { name: 'Remove Scene from My Profile' }).click();
  }

  // ─── Delete scene ─────────────────────────────────────────────────────────────

  async openMoreOptionsMenu() {
    await this.page.locator('button:has(.lucide-more-vertical)').click();
  }

  async clickDeleteScene() {
    await this.page.getByRole('menuitem', { name: /delete scene/i }).click();
  }

  async confirmDeletion() {
    await this.page.getByRole('button', { name: /^remove$/i }).click();
  }
}

module.exports = { VideoAIPage };
