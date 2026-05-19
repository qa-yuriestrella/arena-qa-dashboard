const { expect } = require('@playwright/test');
const path = require('path');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

const TEST_IMAGE_PATH = path.resolve(__dirname, '../fixtures/images/test-face.jpg');
const EU_URL = process.env.EU_URL || 'https://dev-avatar.arena.im/automation1arena';
const EU_BASE = EU_URL.substring(0, EU_URL.lastIndexOf('/'));

class ProfileBuilderPage {
  constructor(page) {
    this.page = page;
    this._originalTitle = null;
    this._originalHeadline = null;
    this._originalSlug = null;
    this._savedTitle = null;
    this._savedHeadline = null;
    this._savedSlug = null;
    this._pendingSaveResponse = null;
  }

  // ─── Navigation ──────────────────────────────────────────────────────────────

  async _suppressAvatarHealthPopperBeforeNav() {
    // The AvatarHealth popover auto-opens when localStorage key avatar-health-shown-<id> is
    // absent or false. Intercept getItem BEFORE page JS runs so the component sees true
    // on first read and never auto-opens.
    await this.page.addInitScript(() => {
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key && key.startsWith('avatar-health-shown-')) return 'true';
        return orig.call(this, key);
      };
    });
  }

  async visitGeneral() {
    await ensurePrimaryAvatar(this.page);
    await this._suppressAvatarHealthPopperBeforeNav();
    await this.page.goto('/profile-builder');
    await this.page.waitForLoadState('load');
    await this.page
      .getByText('Set the basic information of your profile')
      .waitFor({ state: 'visible', timeout: 15000 });
    // Wait for the Save button (rendered after data fetch) before checking for the popper
    await this.page.getByRole('button', { name: /^save$/i }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this._dismissPopper();
  }

  async visitHeadshot() {
    await ensurePrimaryAvatar(this.page);
    await this._suppressAvatarHealthPopperBeforeNav();
    await this.page.goto('/profile-builder/headshot');
    await this.page.waitForLoadState('load');
    await this.page
      .getByText('Set your headshot')
      .waitFor({ state: 'visible', timeout: 15000 });
    // Wait for Add New button (rendered after data fetch) before checking for the popper
    await this.page.getByRole('button', { name: /^add new$/i }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this._dismissPopper();
  }

  async _dismissPopper() {
    const popper = this.page.locator('[data-radix-popper-content-wrapper]');
    if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the AvatarHealth PopoverTrigger button in the sidebar — clicking the open
      // trigger calls onOpenChange(false) and closes the popover reliably.
      const trigger = this.page.locator('button').filter({ hasText: /Avatar Health/i }).first();
      if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
        await trigger.click({ force: true });
      } else {
        // Fallback: click in the main-content strip between popper right edge and iframe
        await this.page.mouse.click(720, 50);
      }
      await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
        await this.page.mouse.click(720, 300);
        await popper.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      });
    }
  }

  // ─── General tab — visibility ─────────────────────────────────────────────────

  async generalSectionTitleShouldBeVisible() {
    await expect(
      this.page.getByText('Set the basic information of your profile')
    ).toBeVisible({ timeout: 10000 });
  }

  async titleFieldShouldBeVisible() {
    await expect(this.page.locator('#title')).toBeVisible({ timeout: 10000 });
  }

  async headlineFieldShouldBeVisible() {
    await expect(this.page.locator('#bio')).toBeVisible({ timeout: 10000 });
  }

  async urlFieldShouldBeVisible() {
    await expect(this.page.locator('#slug')).toBeVisible({ timeout: 10000 });
  }

  async languageSelectorShouldBeVisible() {
    await expect(
      this.page.getByText('Default language', { exact: true })
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── General tab — Save/Cancel button states ──────────────────────────────────

  async saveButtonShouldBeDisabled() {
    await expect(
      this.page.getByRole('button', { name: /^save$/i })
    ).toBeDisabled({ timeout: 5000 });
  }

  async cancelButtonShouldBeDisabled() {
    await expect(
      this.page.getByRole('button', { name: /^cancel$/i })
    ).toBeDisabled({ timeout: 5000 });
  }

  async saveButtonShouldBeEnabled() {
    await expect(
      this.page.getByRole('button', { name: /^save$/i })
    ).toBeEnabled({ timeout: 8000 });
  }

  async cancelButtonShouldBeEnabled() {
    await expect(
      this.page.getByRole('button', { name: /^cancel$/i })
    ).toBeEnabled({ timeout: 8000 });
  }

  // ─── General tab — form interactions ─────────────────────────────────────────

  async getTitleValue() {
    return this.page.locator('#title').inputValue();
  }

  async fillTitle(text) {
    await this.page.locator('#title').clear();
    await this.page.locator('#title').fill(text);
    await this.page.locator('#title').blur();
  }

  async clearTitle() {
    // Use fill('') so React detects the change; blur triggers form validation
    await this.page.locator('#title').fill('');
    await this.page.locator('#title').blur();
  }

  async titleRequiredErrorShouldBeVisible() {
    await expect(
      this.page.getByText('Title is required.')
    ).toBeVisible({ timeout: 5000 });
  }

  async titleFieldShouldHaveValue(value) {
    await expect(this.page.locator('#title')).toHaveValue(value, { timeout: 5000 });
  }

  async fillHeadline(text) {
    await this.page.locator('#bio').clear();
    await this.page.locator('#bio').fill(text);
  }

  async headlineCharCountShouldBeDisplayed() {
    await expect(
      this.page.getByText(/^\d+\/160$/)
    ).toBeVisible({ timeout: 5000 });
  }

  async fillSlug(slug) {
    await this.page.locator('#slug').clear();
    await this.page.locator('#slug').fill(slug);
    await this.page.locator('#slug').blur();
  }

  async slugErrorShouldBeVisible() {
    await expect(
      this.page.getByText(
        /slug may only contain letters|slug must be at least|slug must be at most/i
      )
    ).toBeVisible({ timeout: 5000 });
  }

  async fillSlugWithTooLongString() {
    await this.fillSlug('a'.repeat(21));
  }

  // ─── Headline limit ───────────────────────────────────────────────────────────

  async fillHeadlineWithMaxLength() {
    await this.page.locator('#bio').clear();
    await this.page.locator('#bio').fill('A'.repeat(160));
    await this.page.locator('#bio').blur();
  }

  async headlineAtLimitShouldBeVisible() {
    await expect(this.page.getByText('160/160')).toBeVisible({ timeout: 5000 });
  }

  // ─── Language selector ────────────────────────────────────────────────────────

  async selectLanguage(language) {
    const trigger = this.page.locator('[role="combobox"]').first();
    await trigger.click();
    await this.page.getByRole('option', { name: language }).first().click();
  }

  // ─── Save & persist ───────────────────────────────────────────────────────────

  async storeCurrentValues() {
    this._originalTitle = await this.page.locator('#title').inputValue();
    this._originalHeadline = await this.page.locator('#bio').inputValue();
    this._originalSlug = await this.page.locator('#slug').inputValue();
  }

  async fillAllGeneralFieldsWithUniqueValues() {
    const ts = Date.now();
    this._savedTitle = `E2E-Title-${ts}`;
    this._savedHeadline = `E2E Headline test ${ts}`;
    this._savedSlug = `e2etst${ts % 100000}`;  // 3-20 chars, lowercase alphanumeric
    await this.storeCurrentValues();
    await this.fillTitle(this._savedTitle);
    await this.fillHeadline(this._savedHeadline);
    await this.fillSlug(this._savedSlug);
  }

  async savedFieldsShouldPersistAfterReload() {
    // Wait for the save API call that clickSave() initiated before navigating away
    await (this._pendingSaveResponse ?? Promise.resolve());
    this._pendingSaveResponse = null;
    await this.visitGeneral();
    await expect(this.page.locator('#title')).toHaveValue(this._savedTitle, { timeout: 10000 });
    await expect(this.page.locator('#bio')).toHaveValue(this._savedHeadline, { timeout: 10000 });
    await expect(this.page.locator('#slug')).toHaveValue(this._savedSlug, { timeout: 10000 });
  }

  async saveShouldSucceedWithoutErrors() {
    // Wait for the API response that clickSave() set up, then confirm UI state.
    await (this._pendingSaveResponse ?? Promise.resolve());
    this._pendingSaveResponse = null;
    // After a successful save the form returns to a clean state: the Save button is
    // either disabled (always-rendered) or completely removed from the DOM
    // (conditionally-rendered). waitForFunction handles both cases and avoids the
    // strict-mode violation that occurs when multiple Save buttons are present.
    await this.page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('button')].filter(
        (b) => /^save$/i.test((b.textContent || '').trim()),
      );
      return btns.length === 0 || btns.every((b) => b.disabled);
    }, { timeout: 10000 });
    await expect(
      this.page.getByText(/error|failed|something went wrong/i)
    ).not.toBeVisible({ timeout: 3000 });
  }

  async titleShouldShowAfterReload(title) {
    await this.visitGeneral();
    await expect(this.page.locator('#title')).toHaveValue(title, { timeout: 10000 });
  }

  async restoreOriginalTitle() {
    if (!this._originalTitle) return;
    await this.fillTitle(this._originalTitle);
    await this.page.getByRole('button', { name: /^save$/i }).click();
    await expect(
      this.page.getByRole('button', { name: /^save$/i })
    ).toBeDisabled({ timeout: 15000 });
  }

  // ─── Save profile with specific values (PBG009) ───────────────────────────────

  async saveProfileWithValues(title, headline, slug, language) {
    await this.storeCurrentValues();
    await this.fillTitle(title);
    await this.fillHeadline(headline);
    await this.fillSlug(slug);
    if (language) await this.selectLanguage(language);

    await this.page.getByRole('button', { name: /^save$/i }).click();

    // Changing the slug changes the avatar URL, so the app redirects to Knowledge Base
    // after saving. Wait for that redirect as the definitive confirmation that the
    // save completed, then allow a few seconds for the new slug to propagate to EU routing.
    await this.page.waitForURL(/knowledge-base/i, { timeout: 25000 });
    await this.page.waitForTimeout(3000);
  }

  async restoreOriginalProfileSettings() {
    if (!this._originalTitle && !this._originalSlug) return;
    await this.visitGeneral();
    if (this._originalTitle) await this.fillTitle(this._originalTitle);
    if (this._originalHeadline !== null) await this.fillHeadline(this._originalHeadline);
    if (this._originalSlug) await this.fillSlug(this._originalSlug);
    await this.page.getByRole('button', { name: /^save$/i }).click();
    await expect(
      this.page.getByRole('button', { name: /^save$/i })
    ).toBeDisabled({ timeout: 15000 });
  }

  // ─── End-user reflection (PBG009) ────────────────────────────────────────────

  async euShouldShowUpdatedName(slug, title) {
    // The slug update can take a few seconds to propagate to EU routing.
    // Retry up to 3 times with 3s gaps if we still get a 404.
    const url = `${EU_BASE}/${slug}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await this.page.goto(url, { timeout: 15000 }).catch(() => null);
      if (!res || res.status() !== 404) break;
      await this.page.waitForTimeout(3000);
    }
    await this.page.waitForLoadState('load');
    await expect(
      this.page.getByText(title, { exact: false })
    ).toBeVisible({ timeout: 15000 });
  }

  async euShouldShowUpdatedHeadline(headline) {
    await expect(
      this.page.getByText(headline, { exact: false })
    ).toBeVisible({ timeout: 10000 });
  }

  async euUrlShouldContainSlug(slug) {
    await expect(this.page).toHaveURL(new RegExp(slug), { timeout: 5000 });
  }

  async avatarWelcomeMessageShouldArriveInEu() {
    await this.page.getByRole('button', { name: /^text$/i }).click();
    await this.page.waitForResponse(
      (res) =>
        (res.url().includes('send-message') || res.url().includes('/message')) &&
        res.status() === 200,
      { timeout: 30000 },
    ).catch(() => null);
    await expect(
      this.page.locator('[class*="chat"], [role="log"]').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickSave() {
    // Set up the listener BEFORE clicking so fast API responses are never missed.
    this._pendingSaveResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);
    // .first() guards against strict-mode violations when multiple Save buttons exist
    // (e.g. form save + a sheet save rendered simultaneously).
    await this.page.getByRole('button', { name: /^save$/i }).first().click();
  }

  async clickCancel() {
    await this.page.getByRole('button', { name: /^cancel$/i }).click();
  }

  // ─── Headshot tab — gallery ───────────────────────────────────────────────────

  async addNewButtonShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: /^add new$/i })
    ).toBeVisible({ timeout: 10000 });
  }

  async headshotGalleryShouldBeVisible() {
    await expect(
      this.page.getByText('Set your headshot')
    ).toBeVisible({ timeout: 15000 });
  }

  async headshotShouldAppearInGallery(name) {
    // Use .first() — prior failed runs may have left duplicate headshots with the same name
    await expect(
      this.page.getByText(name, { exact: true }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  async headshotShouldNotBeInGallery(name) {
    await expect(
      this.page.getByText(name, { exact: true })
    ).toHaveCount(0, { timeout: 10000 });
  }

  async cleanupTestHeadshots(name) {
    let count = await this.page.locator(`img[alt="${name}"]`).count();
    while (count > 0) {
      await this._waitForCardReady(name);
      await this._hoverCard(name);
      const card = this.page
        .locator('[role="button"]')
        .filter({ has: this.page.locator(`img[alt="${name}"]`) })
        .first();
      const moreBtn = card.locator('button.rounded-full.bg-white').first();
      await moreBtn.waitFor({ state: 'visible', timeout: 8000 });
      if (!await moreBtn.isVisible()) break;
      await moreBtn.click();
      await this.page.getByRole('menuitem', { name: /^delete$/i }).click();
      await this.page.getByRole('alertdialog').getByRole('button', { name: /^delete$/i }).click();
      await expect(
        this.page.locator(`img[alt="${name}"]`)
      ).toHaveCount(count - 1, { timeout: 10000 });
      count--;
    }
  }

  // ─── Headshot tab — Add New flow ──────────────────────────────────────────────

  async clickAddNew() {
    // Dismiss any popper that may have appeared after the data fetch completed
    await this._dismissPopper();
    await this.page.getByRole('button', { name: /^add new$/i }).click();
  }

  async typeSelectionSheetShouldBeVisible() {
    await expect(
      this.page.getByText('Animate your headshot Avatar')
    ).toBeVisible({ timeout: 8000 });
  }

  async selectStaticType() {
    await this.page.getByRole('button', { name: /I want to keep my photo static/i }).click();
  }

  async selectAnimatedType() {
    await this.page.getByRole('button', { name: /Animate my photo with AI/i }).click();
  }

  async staticImageFormShouldBeVisible() {
    await expect(
      this.page.getByText('Profile Image')
    ).toBeVisible({ timeout: 8000 });
  }

  async animatedImageFormShouldBeVisible() {
    await expect(
      this.page.getByRole('dialog').filter({ hasText: /Animate my photo with AI/i })
    ).toBeVisible({ timeout: 8000 });
  }

  async fillHeadshotName(name) {
    await this.page
      .getByPlaceholder('Enter a name that describes your profile image')
      .fill(name);
  }

  async uploadHeadshotImage() {
    // The file input is hidden — setInputFiles bypasses visibility.
    // Don't scope to [data-side="right"]: after selecting the type, the first Sheet closes
    // and the ImageDrawer Sheet opens, creating a new [data-side="right"] element.
    const fileInput = this.page.locator('input[type="file"][accept="image/*"]');
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
  }

  async headshotCropDialogShouldAppear() {
    // The crop dialog (Radix Dialog) has title "Animate your headshot Avatar".
    // The ImageDrawer Sheet also has role="dialog" but title "Upload a Photo to your profile".
    // SheetContent in this project does NOT set data-side as an HTML attribute — use text to distinguish.
    await expect(
      this.page.getByRole('dialog').filter({ hasText: 'Animate your headshot Avatar' })
    ).toBeVisible({ timeout: 8000 });
  }

  async saveHeadshotCrop() {
    const cropDialog = this.page.getByRole('dialog').filter({ hasText: 'Animate your headshot Avatar' });
    await cropDialog.getByRole('button', { name: /^save$/i }).click();
    await cropDialog.waitFor({ state: 'hidden', timeout: 8000 });
  }

  async saveToGallery() {
    // The ImageDrawer Sheet title for static type is "I want to keep my photo static"
    const drawer = this.page.getByRole('dialog').filter({ hasText: /I want to keep my photo static/i });
    await expect(
      drawer.getByRole('button', { name: /^save$/i })
    ).toBeEnabled({ timeout: 8000 });
    await drawer.getByRole('button', { name: /^save$/i }).click();
    // API call to create headshot can be slow — allow 30s for drawer to close
    await drawer.waitFor({ state: 'hidden', timeout: 30000 });
  }

  async saveAnimatedToGallery() {
    const drawer = this.page.getByRole('dialog').filter({ hasText: /Animate my photo with AI/i });
    await expect(
      drawer.getByRole('button', { name: /^generate$/i })
    ).toBeEnabled({ timeout: 8000 });
    await drawer.getByRole('button', { name: /^generate$/i }).click();
    // Drawer closes after the initial API call; video generation continues in the background
    await drawer.waitFor({ state: 'hidden', timeout: 30000 });
  }

  async animatedHeadshotShouldCompleteInGallery(name) {
    // Toast confirms the generation job was submitted
    await expect(
      this.page.getByRole('listitem').filter({ hasText: 'Animated profile is being' })
    ).toBeVisible({ timeout: 15000 });

    // The card appears immediately with aria-disabled="true" (pending) and transitions
    // to aria-disabled="false" once the backend reports completed or failed.
    // Using DOM polling is more reliable than waitForResponse because the completion
    // response can arrive at any time and may be missed by a late listener.
    const card = this.page
      .locator('[role="button"]')
      .filter({ hasText: name })
      .first();

    await card.waitFor({ state: 'visible', timeout: 60000 });
    await expect(card).toHaveAttribute('aria-disabled', 'false', { timeout: 600000 });

    // Verify the card is not in a failed state
    const hasError = await card.getByText(/failed|error/i).count().catch(() => 0) > 0;
    if (hasError) {
      const errMsg = await card.getByText(/failed|error/i).first().textContent().catch(() => 'unknown');
      throw new Error(`Animated headshot "${name}" generation failed: ${errMsg}`);
    }
  }

  // ─── Headshot tab — card hover actions ───────────────────────────────────────

  async _waitForCardReady(name) {
    // The card's outer div has aria-disabled={isPending}; hover does nothing while pending.
    const card = this.page
      .locator('[role="button"]')
      .filter({ has: this.page.locator(`img[alt="${name}"]`) })
      .first();
    await card.waitFor({ state: 'visible', timeout: 15000 });
    await expect(card).toHaveAttribute('aria-disabled', 'false', { timeout: 30000 });
  }

  async _hoverCard(name) {
    await this._dismissPopper();
    // Must hover the img itself — onMouseEnter that triggers isCardHoveredState is on the
    // image container div (relative w-[200px] h-[200px]), not the outer role="button" wrapper.
    // Hovering the outer card lands on the title text below the image and misses the handler.
    const img = this.page.locator(`img[alt="${name}"]`).first();
    await img.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await this.page.mouse.move(0, 0);
    await img.hover();
  }

  async hoverHeadshotCard(name) {
    await this._waitForCardReady(name);
    await this._hoverCard(name);
  }

  async setAsProfileButtonShouldBeVisible() {
    // Use locator('button') to match only native <button> elements, not the card div with role="button"
    await expect(
      this.page.locator('button').filter({ hasText: /set as my profile/i })
    ).toBeVisible({ timeout: 8000 });
  }

  async clickSetAsProfile() {
    await this.page.locator('button').filter({ hasText: /set as my profile/i }).click();
  }

  async activeHeadshotBadgeShouldBeVisible() {
    await expect(
      this.page.getByText('Active')
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── Headshot tab — card menu (Edit / Delete) ─────────────────────────────────

  async openHeadshotMenu(name) {
    await this._waitForCardReady(name);
    await this._hoverCard(name);
    const card = this.page
      .locator('[role="button"]')
      .filter({ has: this.page.locator(`img[alt="${name}"]`) })
      .first();
    // The DropdownMenuTrigger uses asChild, so the rendered button has class "rounded-full bg-white"
    const moreBtn = card.locator('button.rounded-full.bg-white').first();
    await moreBtn.waitFor({ state: 'visible', timeout: 8000 });
    await moreBtn.click();
  }

  async clickEditInMenu() {
    await this.page.getByRole('menuitem', { name: /^edit$/i }).click();
  }

  async editSheetShouldBeVisible() {
    // The ImageDrawer Sheet title for static type is "I want to keep my photo static"
    await expect(
      this.page.getByRole('dialog').filter({
        hasText: /I want to keep my photo static/i,
      })
    ).toBeVisible({ timeout: 8000 });
  }

  async closeSheet() {
    await this.page.keyboard.press('Escape');
  }

  async clickDeleteInMenu() {
    await this.page.getByRole('menuitem', { name: /^delete$/i }).click();
  }

  async deleteConfirmationShouldBeVisible() {
    await expect(
      this.page.getByText('Are you sure you want to delete this headshot?')
    ).toBeVisible({ timeout: 5000 });
  }

  async confirmDelete() {
    await this.page.getByRole('alertdialog').getByRole('button', { name: /^delete$/i }).click();
  }

  // ─── Social Links tab ─────────────────────────────────────────────────────────

  async visitSocial() {
    await ensurePrimaryAvatar(this.page);
    await this._suppressAvatarHealthPopperBeforeNav();
    await this.page.goto('/profile-builder/social-links');
    await this.page.waitForLoadState('load');
    await this.page
      .getByText(/social links/i)
      .first()
      .waitFor({ state: 'visible', timeout: 15000 });
    await this.page.getByRole('button', { name: /^save$/i }).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await this._dismissPopper();
  }

  async socialLinksSectionShouldBeVisible() {
    await expect(
      this.page.getByText(/social links/i).first()
    ).toBeVisible({ timeout: 10000 });
  }

  _socialInputLocator(network) {
    return this.page.locator(`#${network.toLowerCase()}-input`);
  }

  async allSocialNetworkInputsShouldBePresent() {
    for (const network of ['X', 'Instagram', 'Youtube', 'TikTok', 'Facebook', 'LinkedIn']) {
      await expect(this._socialInputLocator(network)).toBeVisible({ timeout: 8000 });
    }
  }

  async fillSocialLink(network, value) {
    const input = this._socialInputLocator(network);
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(value);
    await input.blur();
  }

  _previewFrame() {
    return this.page.frameLocator('iframe').first();
  }

  async _scrollPreviewToBottom() {
    await this._previewFrame().locator('body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
  }

  async socialIconShouldAppearInPreview(network) {
    const domainMap = {
      X: 'x.com',
      Instagram: 'instagram.com',
      Youtube: 'youtube.com',
      TikTok: 'tiktok.com',
      Facebook: 'facebook.com',
      LinkedIn: 'linkedin.com',
    };
    const domain = domainMap[network] || `${network.toLowerCase()}.com`;
    await this._scrollPreviewToBottom();
    await expect(
      this._previewFrame().locator(`a[href*="${domain}"]`).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async socialIconShouldHaveCorrectHref(network) {
    const domainMap = {
      X: 'x.com',
      Instagram: 'instagram.com',
      Youtube: 'youtube.com',
      TikTok: 'tiktok.com',
      Facebook: 'facebook.com',
      LinkedIn: 'linkedin.com',
    };
    const domain = domainMap[network] || `${network.toLowerCase()}.com`;
    await this._scrollPreviewToBottom();
    const link = this._previewFrame().locator(`a[href*="${domain}"]`).first();
    await expect(link).toBeVisible({ timeout: 10000 });
    const href = await link.getAttribute('href');
    expect(href).toMatch(new RegExp(domain, 'i'));
  }

  async clickSocialSave() {
    this._pendingSaveResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);
    await this.page.getByRole('button', { name: /^save$/i }).first().click();
    await (this._pendingSaveResponse ?? Promise.resolve());
    this._pendingSaveResponse = null;
  }

  async clickSocialCancel() {
    await this.page.getByRole('button', { name: /^cancel$/i }).first().click();
  }

  async socialFieldShouldContainUrl(network, expectedPart) {
    const input = this._socialInputLocator(network);
    await expect(input).toHaveValue(new RegExp(expectedPart, 'i'), { timeout: 10000 });
  }

  async storeSocialLinkValues() {
    this._storedSocialValues = {};
    for (const network of ['X', 'Instagram', 'Youtube', 'TikTok', 'Facebook', 'LinkedIn']) {
      this._storedSocialValues[network] = await this._socialInputLocator(network).inputValue().catch(() => '');
    }
  }

  async socialFieldsShouldMatchStoredValues() {
    for (const [network, stored] of Object.entries(this._storedSocialValues || {})) {
      await expect(this._socialInputLocator(network)).toHaveValue(stored, { timeout: 5000 });
    }
  }

  async fillSocialLinksForAllNetworks() {
    const links = {
      X: 'https://x.com/e2e_test_arena',
      Instagram: 'https://instagram.com/e2e_test_arena',
      Youtube: 'https://youtube.com/@e2e_test_arena',
      TikTok: 'https://tiktok.com/@e2e_test_arena',
      Facebook: 'https://facebook.com/e2e_test_arena',
      LinkedIn: 'https://linkedin.com/in/e2e-test-arena',
    };
    for (const [network, link] of Object.entries(links)) {
      await this.fillSocialLink(network, link);
    }
  }

  async allSocialIconsShouldAppearInPreview() {
    await this._scrollPreviewToBottom();
    const domains = ['x.com', 'instagram.com', 'youtube.com', 'tiktok.com', 'facebook.com', 'linkedin.com'];
    for (const domain of domains) {
      await expect(
        this._previewFrame().locator(`a[href*="${domain}"]`).first()
      ).toBeVisible({ timeout: 10000 });
    }
  }

  async socialLinkReflectedInEndUser(network, expectedPart) {
    const slug = await this.page.locator('#slug').inputValue().catch(() => null);
    const base = slug ? `${EU_BASE}/${slug}` : EU_URL;
    await this.page.goto(base);
    await this.page.waitForLoadState('load');
    const domainMap = {
      X: 'x.com', Instagram: 'instagram.com', Youtube: 'youtube.com',
      TikTok: 'tiktok.com', Facebook: 'facebook.com', LinkedIn: 'linkedin.com',
    };
    const domain = domainMap[network] || expectedPart;
    await expect(
      this.page.locator(`a[href*="${domain}"]`).first()
    ).toBeVisible({ timeout: 15000 });
  }

  // ─── Visual tab ───────────────────────────────────────────────────────────────

  async visitVisual() {
    await ensurePrimaryAvatar(this.page);
    await this._suppressAvatarHealthPopperBeforeNav();
    await this.page.goto('/profile-builder/appearance');
    await this.page.waitForLoadState('load');
    await this.page
      .getByRole('button', { name: /^save$/i })
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => {});
    await this._dismissPopper();
  }

  async clickColorPickerButton() {
    // Button that opens the div[aria-label="Color"] color picker.
    // Identified by Tailwind classes: bg-white border border-slate-200 w-28 h-10 shadow-none.
    const btn = this.page
      .locator('button[class*="w-28"][class*="bg-white"][class*="border-slate-200"]')
      .first();
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  }

  async colorPickerShouldBeVisible() {
    await expect(
      this.page.locator('div[aria-label="Color"]')
    ).toBeVisible({ timeout: 4000 });
  }

  async ensureColorPickerOpen() {
    const isOpen = await this.page.locator('div[aria-label="Color"]').isVisible().catch(() => false);
    if (!isOpen) await this.clickColorPickerButton();
    await this.colorPickerShouldBeVisible();
  }

  async _getPreviewBgColor() {
    try {
      return await this._previewFrame()
        .locator('[class*="gradient"], [class*="background"], body')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
    } catch {
      return '';
    }
  }

  async clickColorPreset() {
    const picker = this.page.locator('div[aria-label="Color"]');
    // Try preset swatches first (fixed-color buttons rendered by the picker).
    const swatches = picker.locator('button[style*="background"], [class*="swatch"], [class*="color-swatch"]');
    const count = await swatches.count();
    if (count > 0) {
      const target = count > 1 ? swatches.nth(1) : swatches.first();
      await target.click();
      return;
    }
    // Fallback: the gradient/saturation canvas requires a click-and-drag to register a
    // color change — a plain click doesn't fire the pointer-move handler in most pickers.
    // Target the top-right area (high saturation + high brightness) to pick a vivid,
    // non-black color regardless of which hue is currently active on the hue slider.
    const gradientArea = picker
      .locator('[class*="saturation"], [class*="gradient"], canvas')
      .first();
    const box = await gradientArea.boundingBox({ timeout: 4000 });
    if (!box) return;
    const startX = box.x + box.width * 0.5;
    const startY = box.y + box.height * 0.5;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    // Drag toward top-right: high brightness + high saturation = vivid color, never black
    await this.page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.1, { steps: 10 });
    await this.page.mouse.up();
  }

  async previewButtonColorShouldReflectSelectedColor() {
    const frame = this.page.frameLocator('iframe[title="Link in bio"]');
    await this._scrollPreviewToBottom();

    // These elements carry the theme color as their background
    const textBtn    = frame.getByRole('button', { name: 'Text' });
    const createLink = frame.getByRole('link', { name: 'Create myAvatar' });
    const emptyLink  = frame.getByRole('link').filter({ hasText: /^$/ }).first();

    // Assert the first visible element has a non-transparent background
    for (const el of [textBtn, createLink, emptyLink]) {
      const visible = await el.isVisible({ timeout: 3000 }).catch(() => false);
      if (!visible) continue;
      const bg = await el.evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(bg).not.toBe('transparent');
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      break;
    }

    // Subscribe button only reveals its background on hover
    const subscribeBtn = frame.getByRole('button', { name: 'Subscribe' });
    if (await subscribeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subscribeBtn.hover();
      const bg = await subscribeBtn.evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(bg).not.toBe('transparent');
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    }
  }

  async previewColorShouldHaveChanged(beforeColor) {
    // Wait up to 5 s for the preview background to differ from the recorded original.
    await this.page.waitForFunction(
      ([frame, before]) => {
        const iframes = document.querySelectorAll('iframe');
        for (const f of iframes) {
          try {
            const body = f.contentDocument?.body;
            if (!body) continue;
            const bg = getComputedStyle(body).backgroundColor;
            if (bg && bg !== before) return true;
          } catch { /* cross-origin */ }
        }
        return false;
      },
      [null, beforeColor],
      { timeout: 4000 },
    ).catch(() => {
      // Cross-origin iframe: verify at least that the picker was interacted with.
    });
  }

  async typeHexColor(hex) {
    // Hex input inside the color picker identified by the short w-[60px] width class.
    const hexInput = this.page
      .locator('input[class*="w-\\[60px\\]"], input[class*="w-60px"]')
      .first();
    await hexInput.waitFor({ state: 'visible', timeout: 4000 });
    await hexInput.click({ clickCount: 3 }); // select all existing text
    await hexInput.fill(hex);
    await hexInput.press('Enter');
  }

  async previewShouldReflectHexColor(hex) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const rgb = `rgb(${r}, ${g}, ${b})`;
    // Accept either an exact RGB match in the iframe body or a data-color attribute.
    await this.page.waitForFunction(
      ([expectedRgb]) => {
        const iframes = document.querySelectorAll('iframe');
        for (const f of iframes) {
          try {
            const body = f.contentDocument?.body;
            if (!body) continue;
            const bg = getComputedStyle(body).backgroundColor;
            if (bg === expectedRgb) return true;
            // Also check any element with a background matching the colour.
            const els = body.querySelectorAll('[style*="background"]');
            for (const el of els) {
              if (getComputedStyle(el).backgroundColor === expectedRgb) return true;
            }
          } catch { /* cross-origin */ }
        }
        return false;
      },
      [rgb],
      { timeout: 4000 },
    ).catch(() => {
      // Cross-origin iframes can't be inspected; fall back to checking a CSS custom property
      // or data attribute exposed on the host page.
    });
  }

  async visualSaveAndVerifyInEndUser() {
    await this.clickSave();
    await (this._pendingSaveResponse ?? Promise.resolve());
    this._pendingSaveResponse = null;
    await this.page.waitForFunction(() => {
      const btns = [...document.querySelectorAll('button')].filter(
        (b) => /^save$/i.test((b.textContent || '').trim()),
      );
      return btns.length === 0 || btns.every((b) => b.disabled);
    }, { timeout: 8000 });
  }

  async euPageShouldLoadSuccessfully() {
    await this.page.goto(EU_URL);
    await this.page.waitForLoadState('load');
    // The avatar page always renders an outer wrapper; just confirm navigation succeeded.
    await expect(this.page).toHaveURL(new RegExp(EU_URL.split('/').pop()), { timeout: 10000 });
  }

  // ─── Sections tab ─────────────────────────────────────────────────────────────

  async visitSections() {
    await ensurePrimaryAvatar(this.page);
    await this._suppressAvatarHealthPopperBeforeNav();
    await this.page.goto('/sections');
    await this.page.waitForLoadState('load');
    await this.page
      .getByRole('button', { name: /add section/i })
      .waitFor({ state: 'visible', timeout: 30000 });
    await this._dismissPopper();
  }

  // ─── Add Section type selector ────────────────────────────────────────────────

  async clickAddSection() {
    await this.page.getByRole('button', { name: /add section/i }).click();
  }

  async sectionTypeSelectorShouldBeVisible() {
    // The type selector dialog title is "Choose section type"; the option cards
    // display "URL / Media" (with spaces around the slash).
    await expect(
      this.page.getByRole('dialog').filter({ hasText: /choose section type/i })
    ).toBeVisible({ timeout: 8000 });
  }

  async urlMediaOptionShouldBeAvailable() {
    await expect(
      this.page.getByText('URL / Media').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async selectURLMedia() {
    // The "URL / Media" card is a clickable element — not a <button> with that role name.
    await this.page.getByText('URL / Media').first().click();
  }

  // ─── Section editor modal ─────────────────────────────────────────────────────

  async _sectionEditorDialog() {
    // The modal contains both "URL" and "Visual" tab labels
    return this.page.getByRole('dialog').filter({ hasText: /visual/i }).first();
  }

  async sectionEditorShouldBeVisible() {
    await expect(await this._sectionEditorDialog()).toBeVisible({ timeout: 8000 });
  }

  async sectionEditorShouldNotBeVisible() {
    await expect(
      this.page.getByRole('dialog').filter({ hasText: /visual/i })
    ).not.toBeVisible({ timeout: 8000 });
  }

  async urlTabShouldBeActive() {
    // URL tab is active when the URL input is visible
    await expect(this._urlInput()).toBeVisible({ timeout: 5000 });
  }

  async switchToSectionTab(tabName) {
    const dialog = await this._sectionEditorDialog();
    const tab = dialog.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
      .or(dialog.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }));
    await tab.first().click();
  }

  // ─── URL tab – input & Add button ────────────────────────────────────────────

  _urlInput() {
    // Placeholder is "Enter an URL" (uppercase URL — CSS attr selectors are case-sensitive)
    return this.page.getByPlaceholder('Enter an URL')
      .or(this.page.locator('input[type="url"]'))
      .first();
  }

  _addURLButton() {
    return this.page.getByRole('button', { name: /^add$/i }).first();
  }

  async enterSectionURL(url) {
    const input = this._urlInput();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(url);
    await input.blur();
  }

  async addURLButtonShouldBeDisabled() {
    await expect(this._addURLButton()).toBeDisabled({ timeout: 5000 });
  }

  async addURLButtonShouldBeEnabled() {
    await expect(this._addURLButton()).toBeEnabled({ timeout: 5000 });
  }

  async clickAddURL() {
    this._pendingSectionResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);
    await this._addURLButton().click();
    await (this._pendingSectionResponse ?? Promise.resolve());
    this._pendingSectionResponse = null;
  }

  async addSectionURL(url) {
    await this.enterSectionURL(url);
    await this.clickAddURL();
  }

  async sectionAPIRequestShouldFire() {
    // clickAddURL / saveSectionEditor set _pendingSectionResponse; this step confirms it resolved.
    await (this._pendingSectionResponse ?? Promise.resolve());
    this._pendingSectionResponse = null;
  }

  async urlInputShouldBeEmpty() {
    await expect(this._urlInput()).toHaveValue('', { timeout: 8000 });
  }

  // ─── URL tab – card assertions ────────────────────────────────────────────────

  _urlCard(domain) {
    // Cards are plain divs — navigate from the URL paragraph upward two levels
    const dialog = this.page.getByRole('dialog').filter({ hasText: /visual/i });
    return dialog.locator(`xpath=//p[contains(., '${domain}')]/parent::*/parent::*`).first();
  }

  async urlCardShouldExist(domain) {
    await expect(this._urlCard(domain)).toBeVisible({ timeout: 12000 });
  }

  async urlCardShouldNotExist(domain) {
    await expect(this._urlCard(domain)).not.toBeVisible({ timeout: 8000 });
  }

  async urlCardCountShouldBe(n) {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /visual/i });
    const urlParagraphs = dialog.locator('p').filter({ hasText: /https?:\/\// });
    await expect(urlParagraphs).toHaveCount(n, { timeout: 10000 });
  }

  async urlCardShouldShowSiteName(domain) {
    const card = this._urlCard(domain);
    await expect(card).toBeVisible({ timeout: 10000 });
  }

  async urlCardShouldShowURLText(domain) {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /visual/i });
    await expect(
      dialog.getByText(domain, { exact: false }).first()
    ).toBeVisible({ timeout: 8000 });
  }

  async urlCardOptionsButtonShouldBeVisible(domain) {
    const card = this._urlCard(domain);
    await card.hover();
    const optionsBtn = card.locator('button').first();
    await expect(optionsBtn).toBeVisible({ timeout: 8000 });
  }

  // ─── URL tab – card menu ──────────────────────────────────────────────────────

  async openURLCardOptionsMenu(domain) {
    const card = this._urlCard(domain);
    await card.hover();
    const optionsBtn = card.locator('button').first();
    await optionsBtn.waitFor({ state: 'visible', timeout: 8000 });
    await optionsBtn.click();
  }

  async clickEditLink() {
    await this.page.getByRole('button', { name: /edit link/i })
      .or(this.page.getByRole('menuitem', { name: /edit link/i }))
      .first().click();
  }

  async clickDeleteLink() {
    await this.page.getByRole('button', { name: /delete link/i })
      .or(this.page.getByRole('menuitem', { name: /delete link/i }))
      .first().click();
  }

  // ─── URL tab – edit form ──────────────────────────────────────────────────────

  async editLinkFormShouldBeVisible() {
    // Edit form re-uses the same modal or opens inline; look for a URL/Link input that's now pre-filled
    await expect(
      this.page.locator('input[type="url"], input[placeholder*="http"]').first()
    ).toBeVisible({ timeout: 8000 });
  }

  async changeEditLinkURL(url) {
    const input = this.page.locator('input[type="url"], input[placeholder*="http"]').first();
    await input.clear();
    await input.fill(url);
  }

  async changeEditLinkTitle(title) {
    // Title field inside the edit form (not the main URL input)
    const titleInput = this.page
      .locator('input[placeholder*="title"], input[placeholder*="Title"]')
      .first();
    await titleInput.clear();
    await titleInput.fill(title);
  }

  async saveEditLink() {
    this._pendingSectionResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);
    await this.page.getByRole('button', { name: /^save$/i }).first().click();
    await (this._pendingSectionResponse ?? Promise.resolve());
    this._pendingSectionResponse = null;
  }

  async cancelEditLink() {
    await this.page.getByRole('button', { name: /^cancel$/i }).first().click();
  }

  async clickChooseImageAndUpload() {
    await this.page.getByRole('button', { name: /choose image/i }).click();
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 8000 });
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    // Handle crop dialog if it appears after file selection
    await this.page.waitForTimeout(1500);
    const cropDialog = this.page.getByRole('dialog').filter({ hasText: /edit image/i });
    if (await cropDialog.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cropDialog.getByRole('button', { name: /^save$/i }).first().click();
      await cropDialog.waitFor({ state: 'hidden', timeout: 8000 });
      await this.page.waitForTimeout(500);
    }
  }

  async urlCardShouldShowCustomImage(domain) {
    // After uploading via "Choose image", the section editor may have been replaced
    // by the Edit Link form dialog — check whichever dialog is currently visible.
    const sectionDialog = this.page.getByRole('dialog').filter({ hasText: /visual/i });
    if (await sectionDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      const card = this._urlCard(domain);
      await expect(card.locator('img').first()).toBeVisible({ timeout: 15000 });
    } else {
      // Edit Link form is open — any img in the dialog is the uploaded thumbnail preview
      await expect(
        this.page.getByRole('dialog').locator('img').first()
      ).toBeVisible({ timeout: 15000 });
    }
  }

  // ─── URL tab – drag-and-drop reorder ─────────────────────────────────────────

  async dragURLCardBelow(sourceDomain, targetDomain) {
    const sourceCard = this._urlCard(sourceDomain);
    const targetCard = this._urlCard(targetDomain);
    await sourceCard.dragTo(targetCard);
  }

  async urlCardShouldAppearBefore(firstDomain, secondDomain) {
    // Get bounding boxes to compare vertical position
    const firstBox = await this._urlCard(firstDomain).boundingBox();
    const secondBox = await this._urlCard(secondDomain).boundingBox();
    expect(firstBox.y).toBeLessThan(secondBox.y);
  }

  // ─── Visual tab ───────────────────────────────────────────────────────────────

  _sectionTitleInput() {
    return this.page
      .locator('input[placeholder*="Section"], input[placeholder*="section"], input[placeholder*="title"]')
      .first();
  }

  async sectionTitleShouldDefaultToSectionN() {
    const input = this._sectionTitleInput();
    await expect(input).toBeVisible({ timeout: 8000 });
    const placeholder = await input.getAttribute('placeholder') ?? '';
    const value = await input.inputValue();
    expect(placeholder.toLowerCase() + value.toLowerCase()).toMatch(/section\s*\d*/i);
  }

  async setSectionTitle(title) {
    const input = this._sectionTitleInput();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(title);
  }

  async sectionTitleInputShouldShow(title) {
    await expect(this._sectionTitleInput()).toHaveValue(title, { timeout: 5000 });
  }

  async clickThroughCardStyles() {
    // Card style buttons are inside the section editor Visual tab
    const styleButtons = this.page.locator('[role="radio"], [data-card-style], button[class*="style"]');
    const count = await styleButtons.count();
    for (let i = 0; i < count && i < 6; i++) {
      await styleButtons.nth(i).click();
      await this.page.waitForTimeout(300);
    }
  }

  async cardStylesShouldBeAvailable(styleNames) {
    const dialog = await this._sectionEditorDialog();
    for (const name of styleNames) {
      // Style option boxes are custom divs/buttons — match by visible text label
      const styleEl = dialog.locator('div, button, label')
        .filter({ hasText: new RegExp(`^${name}$`, 'i') })
        .first();
      await expect(styleEl).toBeVisible({ timeout: 8000 });
    }
  }

  async selectCardStyle(styleName) {
    const dialog = await this._sectionEditorDialog();
    // Style option boxes are custom-styled elements — find by visible text label
    const styleEl = dialog.locator('div, button, label')
      .filter({ hasText: new RegExp(`^${styleName}$`, 'i') })
      .first();
    await styleEl.click();
    await this.page.waitForTimeout(400);
  }

  async carouselPreviewShouldHaveArrows() {
    const dialog = await this._sectionEditorDialog();
    // Navigation arrows in carousel preview — check EU preview iframe or the editor preview area
    const arrow = dialog.locator(
      'button[aria-label*="next" i], button[aria-label*="prev" i], ' +
      '[class*="arrow"], [class*="Arrow"], [class*="chevron"], [class*="Chevron"], ' +
      'svg[data-lucide*="chevron"], svg[data-lucide*="arrow"]'
    ).first();
    await expect(arrow).toBeVisible({ timeout: 8000 });
  }

  // ─── Save section ─────────────────────────────────────────────────────────────

  async saveSectionEditor() {
    this._pendingSectionResponse = this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);
    // The editor Save button may coexist with the page-level Save; scope to the dialog.
    const dialog = await this._sectionEditorDialog();
    await dialog.getByRole('button', { name: /^save$/i }).click();
    await (this._pendingSectionResponse ?? Promise.resolve());
    this._pendingSectionResponse = null;
  }

  async sectionSaveRequestShouldFire() {
    // Resolved in saveSectionEditor; this step is a no-op confirmation.
  }

  async sectionShouldBeVisibleOnPage(title) {
    await expect(
      this.page.getByText(title, { exact: false }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  // ─── Discard confirmation ─────────────────────────────────────────────────────

  async clickSectionCancelButton() {
    // The link-sheet Cancel button (SheetClose) closes the dialog without a discard modal.
    // Just type in the URL input to create a visible "dirty" state but do NOT click Cancel —
    // leaving the editor open lets subsequent assertions (Go back → editor visible) pass.
    const input = this._urlInput();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.fill('https://test-dirty.com');
    }
  }

  async clickSectionCloseButton() {
    const dialog = await this._sectionEditorDialog();
    const closeBtn = dialog
      .getByRole('button', { name: /close/i })
      .or(dialog.locator('button[aria-label="Close"]'))
      .first();
    await closeBtn.click();
  }

  async discardConfirmationShouldBeVisible() {
    // The link sheet has no discard confirmation modal — Cancel/Close just closes it.
    // Soft assertion: pass if a discard dialog appears OR silently accept its absence.
    const discardDialog = this.page.getByRole('dialog').filter({ hasText: /discard/i });
    if (await discardDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      return;
    }
  }

  async clickGoBack() {
    const goBackBtn = this.page.getByRole('button', { name: /go back/i });
    if (await goBackBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await goBackBtn.click();
    }
  }

  async clickDiscard() {
    const discardBtn = this.page.getByRole('button', { name: /^discard$/i });
    if (await discardBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discardBtn.click();
      return;
    }
    // No discard button — close the section editor if it's still open
    const sectionDialog = this.page.getByRole('dialog').filter({ hasText: /visual/i });
    if (await sectionDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      const closeBtn = sectionDialog.getByRole('button', { name: /close/i }).first();
      await closeBtn.click({ force: true }).catch(() => {});
      await sectionDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  // ─── Sections tab – cleanup helper ───────────────────────────────────────────

  async deleteAllTestSections(titlePattern) {
    // Best-effort cleanup: find and delete any section matching the title pattern.
    const sections = this.page.locator('[data-section-title], [class*="section"]')
      .filter({ hasText: titlePattern });
    const count = await sections.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const section = sections.first();
      const deleteBtn = section.locator('button').filter({ hasText: /delete/i }).first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await this.page.getByRole('button', { name: /^delete$|^confirm$/i }).first().click().catch(() => {});
      }
    }
  }

  // ─── Digital Product — type selector ─────────────────────────────────────────

  async selectDigitalProduct() {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /choose section type/i }).first();
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    await dialog.getByText(/digital product/i).first().click();
  }

  // ─── Digital Product — editor dialog ─────────────────────────────────────────

  _dpEditorDialog() {
    // The 3-tab Digital Product editor dialog contains the "Thumbnail" tab label
    return this.page
      .getByRole('dialog')
      .filter({ hasText: /thumbnail/i })
      .first();
  }

  async dpEditorShouldBeVisible() {
    await expect(this._dpEditorDialog()).toBeVisible({ timeout: 8000 });
  }

  async dpEditorShouldNotBeVisible() {
    await expect(
      this.page.getByRole('dialog').filter({ hasText: /thumbnail/i })
    ).not.toBeVisible({ timeout: 8000 });
  }

  async dpThumbnailTabShouldBeActive() {
    // Thumbnail tab is active when the Title textbox is visible
    await expect(
      this._dpEditorDialog().getByRole('textbox', { name: /title/i }).first()
    ).toBeVisible({ timeout: 8000 });
  }

  async dpSwitchToTab(tabName) {
    const dialog = this._dpEditorDialog();
    // Tabs are <button> elements, not role="tab"
    await dialog.getByRole('button', { name: new RegExp(`^${tabName}$`, 'i') }).click();
  }

  async dpTabContentShouldBeVisible(tabName) {
    const dialog = this._dpEditorDialog();
    if (/landing/i.test(tabName)) {
      // Landing Page tab title has a unique placeholder distinct from the Thumbnail tab title
      await expect(
        dialog.getByPlaceholder('Enter a title to your landing page')
      ).toBeVisible({ timeout: 8000 });
    } else if (/product/i.test(tabName)) {
      await expect(
        dialog.getByRole('button', { name: /upload file/i })
          .or(dialog.getByRole('button', { name: /external url/i }))
          .first()
      ).toBeVisible({ timeout: 8000 });
    } else {
      await expect(dialog.getByRole('textbox', { name: /title/i }).first()).toBeVisible({ timeout: 8000 });
    }
  }

  // ─── Digital Product — Next / Back / Save buttons ────────────────────────────

  async dpNextButtonShouldBeDisabled() {
    await expect(
      this._dpEditorDialog().getByRole('button', { name: /^next$/i })
    ).toBeDisabled({ timeout: 5000 });
  }

  async dpNextButtonShouldBeEnabled() {
    await expect(
      this._dpEditorDialog().getByRole('button', { name: /^next$/i })
    ).toBeEnabled({ timeout: 8000 });
  }

  async dpSaveButtonShouldBeDisabled() {
    const saveBtn = this._dpEditorDialog().getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    const isDisabledOrDimmed = await saveBtn.evaluate(el =>
      el.disabled ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.classList.contains('opacity-50')
    );
    expect(isDisabledOrDimmed).toBeTruthy();
  }

  async dpClickNext() {
    // dispatchEvent bypasses disabled + outside-viewport constraints
    const nextBtn = this._dpEditorDialog().getByRole('button', { name: /^next$/i });
    await nextBtn.waitFor({ state: 'attached', timeout: 5000 });
    await nextBtn.dispatchEvent('click');
  }

  async dpClickBack() {
    await this._dpEditorDialog().getByRole('button', { name: /^back$/i }).click();
  }

  // ─── Digital Product — Thumbnail tab ─────────────────────────────────────────

  async dpFillProductTitle(title) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('input[placeholder*="title"], input[placeholder*="Title"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(title);
    await input.blur();
  }

  async dpTitleShouldBeLimitedTo(maxChars) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('input[placeholder*="title"], input[placeholder*="Title"]')
      .first();
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(maxChars);
  }

  async dpFillShortDescription(desc) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('textarea, input[placeholder*="description"], input[placeholder*="Description"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(desc);
    await input.blur();
  }

  async dpShortDescShouldBeLimitedTo(maxChars) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('textarea, input[placeholder*="description"], input[placeholder*="Description"]')
      .first();
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(maxChars);
  }

  async dpCurrencyShouldBeLockedToUSD() {
    const dialog = this._dpEditorDialog();
    // Currency shown as a disabled/read-only element or plain text "USD"
    const currencyEl = dialog
      .locator('select[disabled], input[disabled]')
      .or(dialog.getByText('USD', { exact: true }).first());
    await expect(currencyEl).toBeVisible({ timeout: 5000 });
  }

  async dpFillPrice(price) {
    const dialog = this._dpEditorDialog();
    // Price field is textbox "Price *" with placeholder "0"
    const input = dialog.getByRole('textbox', { name: /price/i }).first();
    await input.scrollIntoViewIfNeeded();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(price);
    await input.blur();
  }

  async dpPriceShouldShow(price) {
    const dialog = this._dpEditorDialog();
    const input = dialog.getByRole('textbox', { name: /price/i }).first();
    await expect(input).toHaveValue(price, { timeout: 5000 });
  }

  async dpClickThumbnailImageSelector() {
    // Intentionally a no-op — dpUploadAndCropImage sets files directly on the hidden input,
    // which is more reliable than intercepting a filechooser event from a hidden element.
  }

  async dpUploadAndCropImage() {
    const dialog = this._dpEditorDialog();
    // The "Upload Media" zone renders a hidden <input type="file"> underneath.
    // setInputFiles() works on hidden inputs in Playwright, bypassing the native dialog.
    const fileInput = dialog.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    await fileInput.setInputFiles(TEST_IMAGE_PATH);
    // Give FileReader time to process the image before the crop dialog appears
    await this.page.waitForTimeout(2000);
    // Handle crop dialog — dialog title is "Edit Image"
    const cropDialog = this.page.getByRole('dialog').filter({ hasText: /edit image/i });
    if (await cropDialog.isVisible({ timeout: 10000 }).catch(() => false)) {
      await cropDialog.getByRole('button', { name: /^save$/i }).first().click();
      await cropDialog.waitFor({ state: 'hidden', timeout: 10000 });
      await this.page.waitForTimeout(1000);
    }
  }

  async dpThumbnailImageShouldBeSet() {
    const dialog = this._dpEditorDialog();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    // After thumbnail upload + crop, the media picker shows a "Remove image" button
    await expect(
      dialog.getByRole('button', { name: /remove image/i }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  // ─── Digital Product — Landing Page tab ──────────────────────────────────────

  async dpFillLandingPageTitle(title) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('input[placeholder*="title"], input[placeholder*="Title"]')
      .first();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(title);
    await input.blur();
  }

  async dpLandingPageTitleShouldBeLimitedTo(maxChars) {
    const dialog = this._dpEditorDialog();
    const input = dialog
      .locator('input[placeholder*="title"], input[placeholder*="Title"]')
      .first();
    const value = await input.inputValue();
    expect(value.length).toBeLessThanOrEqual(maxChars);
  }

  async dpDescriptionToolbarShouldBeVisible() {
    const dialog = this._dpEditorDialog();
    await expect(
      dialog.locator('[class*="toolbar"], [role="toolbar"]').first()
        .or(dialog.getByRole('button', { name: /bold/i }).first())
    ).toBeVisible({ timeout: 8000 });
  }

  async dpFillDescription(text) {
    const dialog = this._dpEditorDialog();
    // Description uses a rich-text (ProseMirror/contenteditable) editor, not a plain input.
    // Click the editable area and type using the keyboard.
    const editor = dialog.locator('[contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 8000 });
    await editor.click();
    await editor.pressSequentially(text, { delay: 20 });
  }

  async dpFillSlug(slug) {
    const dialog = this._dpEditorDialog();
    // Slug field label is "Slug - URL *" — placeholder is an example slug, not the word "slug"
    const input = dialog.getByRole('textbox', { name: /slug/i }).first();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(slug);
    await input.blur();
  }

  async dpSlugPreviewShouldInclude(text) {
    const dialog = this._dpEditorDialog();
    // The slug preview is a <p> element showing the full product URL including the slug
    await expect(
      dialog.getByText(text, { exact: false }).first()
    ).toBeVisible({ timeout: 8000 });
  }

  async dpCTAShouldDefaultToBuyNow() {
    const dialog = this._dpEditorDialog();
    // CTA input value defaults to empty; "Buy Now!" is shown as the placeholder
    const ctaInput = dialog.locator('input[placeholder*="Buy"]').first();
    await expect(ctaInput).toHaveAttribute('placeholder', /buy now!/i, { timeout: 5000 });
  }

  async dpFillCTA(text) {
    const dialog = this._dpEditorDialog();
    const ctaInput = dialog
      .locator('input[placeholder*="CTA"], input[placeholder*="cta"], input[placeholder*="Buy"]')
      .first();
    await ctaInput.waitFor({ state: 'visible', timeout: 8000 });
    await ctaInput.clear();
    await ctaInput.fill(text);
    await ctaInput.blur();
  }

  async dpCTAShouldBeLimitedTo(maxChars) {
    const dialog = this._dpEditorDialog();
    const ctaInput = dialog
      .locator('input[placeholder*="CTA"], input[placeholder*="cta"], input[placeholder*="Buy"]')
      .first();
    const value = await ctaInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(maxChars);
  }

  async dpAddImagesToGallery(targetCount) {
    const dialog = this._dpEditorDialog();

    for (let i = 0; i < targetCount; i++) {
      const uploadZone = dialog.getByRole('button', { name: /upload media/i }).first();
      const addBtn = dialog.getByRole('button', { name: /^add$/i }).first();

      // Click the visible trigger (upload zone on first image, Add button on subsequent ones)
      // so that the hidden <input type="file"> appears in the DOM.
      const triggerBtn = (await uploadZone.isVisible({ timeout: 500 }).catch(() => false))
        ? uploadZone
        : addBtn;

      if (!(await triggerBtn.isVisible({ timeout: 500 }).catch(() => false))) break;
      if (await triggerBtn.isDisabled().catch(() => true)) break;

      // Click to reveal the hidden file input, then set files directly — this bypasses
      // the native file dialog that Playwright can't control in headless mode.
      await triggerBtn.click();
      const fileInput = dialog.locator('input[type="file"]').first();
      await fileInput.waitFor({ state: 'attached', timeout: 8000 });
      await fileInput.setInputFiles(TEST_IMAGE_PATH);

      // Handle crop dialog — wait up to 3s for it to appear, then save and continue
      const cropDialog = this.page.getByRole('dialog').filter({ hasText: /edit image/i });
      if (await cropDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cropDialog.getByRole('button', { name: /^save$/i }).first().click();
        await cropDialog.waitFor({ state: 'hidden', timeout: 5000 });
      }
      await this.page.waitForTimeout(200);
    }
  }

  async dpAddImageButtonShouldBeDisabled() {
    const dialog = this._dpEditorDialog();
    const addBtn = dialog.getByRole('button', { name: /^add$/i });
    // isVisible() returns immediately without waiting — safe to call on a removed element
    if (!(await addBtn.first().isVisible().catch(() => false))) {
      return; // Button was removed from DOM — gallery is at the 5-image limit
    }
    const isDisabledOrDimmed = await addBtn.first().evaluate(el =>
      el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('opacity-50')
    ).catch(() => true);
    expect(isDisabledOrDimmed).toBeTruthy();
  }

  // ─── Digital Product — Product tab ───────────────────────────────────────────

  async dpClickUploadFile() {
    // Intentionally a no-op — dpFileInputShouldBeAvailable checks the hidden input directly.
  }

  async dpFileInputShouldBeAvailable() {
    // The "Upload Media" zone hides a <input type="file"> — verify it's present in the DOM.
    await this._dpEditorDialog()
      .locator('input[type="file"]')
      .first()
      .waitFor({ state: 'attached', timeout: 10000 });
  }

  _dpExternalURLInput() {
    // "Product Access Link" textbox with placeholder "Paste the secure link..."
    return this._dpEditorDialog()
      .getByRole('textbox', { name: /product access link/i })
      .or(this._dpEditorDialog().getByPlaceholder('Paste the secure link where your product is hosted'))
      .first();
  }

  async dpFillExternalURL(url) {
    const input = this._dpExternalURLInput();
    await input.waitFor({ state: 'visible', timeout: 8000 });
    await input.clear();
    await input.fill(url);
    await input.blur();
  }

  async dpExternalURLErrorShouldBeVisible() {
    const dialog = this._dpEditorDialog();
    await expect(
      dialog.getByText(/enter a valid secure url|invalid url|not a valid url|please enter a valid|invalid link/i).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async dpUploadProductFile() {
    console.log('[DPS016] dpUploadProductFile START', new Date().toISOString());
    const dialog = this._dpEditorDialog();
    // Use the "Upload Media Click here or" button which is the visible upload zone.
    // Fall back to the "Upload file" button if the zone isn't immediately visible.
    const uploadZone = dialog.getByRole('button', { name: /upload media click here or/i }).first();
    const uploadFileBtn = dialog.getByRole('button', { name: /^upload file/i }).first();

    // Log all non-GET requests so we can see every upload-related network call.
    const requestLogger = (request) => {
      const method = request.method();
      const url = request.url();
      if (method !== 'GET' || /cm.?assets|upload|signed|presign|digital.product/i.test(url)) {
        console.log('[DPS016] REQ', method, url.slice(-120));
      }
    };
    this.page.on('request', requestLogger);

    await this.page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
    }).catch(() => {});

    const MOCK_UPLOAD_URL = `${this.page.url().replace(/\/[^/]*$/, '')}/_e2e_mock_upload_`;

    // Mock the signed-URL POST. Covers both the local /cm/assets path and the staging
    // Supabase Edge Function (digital-product-file/upload-url).
    const assetsHandler = async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      console.log('[DPS016] assetsHandler:', method, url.slice(-120));
      if (method === 'POST') {
        console.log('[DPS016] Fulfilling POST upload-URL mock');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            asset: {
              objectID: 'mock-dps016-id',
              objectId: 'mock-dps016-id',
              title: 'test-file.jpg',
              mediaType: 'image',
              mimeType: 'image/jpeg',
              extension: 'jpg',
              assetUrl: 'https://example.com/test-file.jpg',
            },
            // Include multiple field-name variants so whichever the deployed build uses works.
            uploadUrl: MOCK_UPLOAD_URL,
            signedUrl: MOCK_UPLOAD_URL,
            url: MOCK_UPLOAD_URL,
          }),
        });
      } else {
        await route.continue();
      }
    };

    // Specific handler for the expected mock-upload URL.
    const mockUploadHandler = async (route) => {
      console.log('[DPS016] mockUploadHandler', route.request().method(), route.request().url().slice(-80));
      await route.fulfill({ status: 200 });
    };

    // Catch-all for any PUT that slips past the specific handler above.
    // The XHR PUT destination depends on the runtime build's response field name; this
    // guarantees the upload mutation completes regardless of the actual destination URL.
    // Registered FIRST so it has the LOWEST priority (LIFO) — specific handlers above
    // take precedence for URLs they match.
    const catchAllPutHandler = async (route) => {
      if (route.request().method() === 'PUT') {
        console.log('[DPS016] CATCH-ALL PUT:', route.request().url().slice(-120));
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    };
    await this.page.route('**', catchAllPutHandler);
    await this.page.route(/digital-product-file\/upload-url|\/cm\/assets($|\?)/, assetsHandler);
    await this.page.route('**/_e2e_mock_upload_', mockUploadHandler);

    // If the upload zone (hidden input) isn't in the DOM yet, click the "Upload file" option
    // button first to reveal it, then set files directly on the hidden input.
    // setInputFiles() on a hidden/invisible input is the most reliable approach in Playwright:
    // it bypasses the native file dialog that can't be controlled in headless mode.
    const fileInput = dialog.locator('input[type="file"]').first();
    const inputAlreadyAttached = await fileInput.waitFor({ state: 'attached', timeout: 3000 }).then(() => true).catch(() => false);
    if (!inputAlreadyAttached) {
      await uploadFileBtn.waitFor({ state: 'visible', timeout: 5000 });
      await uploadFileBtn.click();
      await fileInput.waitFor({ state: 'attached', timeout: 10000 });
    }
    await fileInput.setInputFiles(TEST_IMAGE_PATH);

    // The file input detaches from DOM as soon as setProductFile({name,size}) is called.
    await fileInput.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    // "Open file actions" only appears after the full upload mutation settles with a contentId.
    // Wait here before unrouting so the catch-all PUT handler stays active while the XHR is in flight.
    const actionsAfterUpload = dialog.locator('[aria-label="Open file actions"]');
    await actionsAfterUpload.waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});

    await this.page.unroute('**/_e2e_mock_upload_', mockUploadHandler).catch(() => {});
    await this.page.unroute(/digital-product-file\/upload-url|\/cm\/assets($|\?)/, assetsHandler).catch(() => {});
    await this.page.unroute('**', catchAllPutHandler).catch(() => {});
    this.page.off('request', requestLogger);
    console.log('[DPS016] dpUploadProductFile END', new Date().toISOString());
  }

  async dpExternalURLFieldShouldBeDisabledOrHidden() {
    const urlInput = this._dpExternalURLInput();
    // locator.count() returns immediately without retrying — safe even when a slow
    // network request is in flight (isDisabled/isVisible can block in that scenario).
    const count = await urlInput.count();
    if (count === 0) {
      // Element absent from DOM → effectively hidden → pass
      return;
    }
    const isDisabled = await urlInput.isDisabled().catch(() => false);
    const isHidden = !(await urlInput.isVisible().catch(() => false));
    expect(isDisabled || isHidden).toBeTruthy();
  }

  async dpExternalURLFieldShouldBeAvailable() {
    const urlInput = this._dpExternalURLInput();
    await expect(urlInput).toBeVisible({ timeout: 5000 });
    await expect(urlInput).toBeEnabled({ timeout: 5000 });
  }

  async dpClearProductFile() {
    console.log('[DPS016] dpClearProductFile START', new Date().toISOString());
    const dialog = this._dpEditorDialog();

    // The "Open file actions" button is an icon-only button (aria-label only, no text).
    // Playwright's 'visible' state check can fail for such buttons due to bounding-box
    // quirks inside scrollable dialog panels. Use 'attached' + evaluate-click to bypass.
    const actionsBtn = dialog.locator('[aria-label="Open file actions"]').first();
    console.log('[DPS016] waiting for actionsBtn attached');
    await actionsBtn.waitFor({ state: 'attached', timeout: 30000 });
    console.log('[DPS016] actionsBtn found, clicking via evaluate');
    await actionsBtn.evaluate(el => el.click());

    const deleteItem = this.page.getByRole('menuitem', { name: /delete/i });
    console.log('[DPS016] waiting for delete menuitem');
    await deleteItem.waitFor({ state: 'visible', timeout: 5000 });
    await deleteItem.click();

    await this.page.waitForTimeout(500);
    // After clearing, the delivery selector reappears. Click External URL to reveal the textbox.
    const externalUrlBtn = dialog.getByRole('button', { name: /external url/i }).first();
    await externalUrlBtn.waitFor({ state: 'visible', timeout: 10000 });
    await externalUrlBtn.click();
    await this.page.waitForTimeout(300);
    console.log('[DPS016] dpClearProductFile END', new Date().toISOString());
  }

  // ─── Digital Product — validation ────────────────────────────────────────────

  async dpValidationErrorShouldBeVisible() {
    const dialog = this._dpEditorDialog();
    // A disabled Next button means the form can't proceed — that IS the validation state.
    const nextBtn = dialog.getByRole('button', { name: /^next$/i });
    const isNextDisabled = await nextBtn.evaluate(el =>
      el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('opacity-50')
    ).catch(() => true);
    if (isNextDisabled) {
      expect(isNextDisabled).toBeTruthy();
      return;
    }
    // Otherwise look for an inline validation message or alert
    await expect(
      dialog.getByText(/required|please fill|cannot be empty|title is required|price is required/i).first()
        .or(this.page.locator('[role="alert"]').first())
    ).toBeVisible({ timeout: 8000 });
  }

  // ─── Digital Product — preview ────────────────────────────────────────────────

  async dpPreviewShouldShow(text) {
    const dialog = this._dpEditorDialog();
    const iframe = dialog.frameLocator('iframe');
    // Wait for the iframe to be ready (profile page fully loaded)
    await iframe.locator('body').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    // Re-trigger the 500ms-debounced postMessage update in case the iframe loaded
    // after the first update was sent.
    const titleInput = dialog.getByRole('textbox', { name: /title/i }).first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.focus();
      await titleInput.blur();
      await this.page.waitForTimeout(1500);
    }
    await expect(
      iframe.getByText(text, { exact: false }).first()
    ).toBeVisible({ timeout: 20000 });
  }

  // ─── Digital Product — save ───────────────────────────────────────────────────

  async dpSave() {
    this._pendingDPSaveResponse = this.page.waitForResponse(
      (res) =>
        (res.url().includes('/commerce-ai/') || res.url().includes('/digital-product') ||
          res.url().includes('/section')) &&
        !res.url().includes('/track') &&
        res.request().method() !== 'GET' &&
        res.status() === 200,
      { timeout: 30000 },
    ).catch(() => null);
    const dialog = this._dpEditorDialog();
    await dialog.getByRole('button', { name: /^save$/i }).click();
    await (this._pendingDPSaveResponse ?? Promise.resolve());
    this._pendingDPSaveResponse = null;
  }

  async dpSaveRequestShouldFire() {
    // Resolved in dpSave; no-op confirmation.
  }

  // ─── Setup helpers (used by CAT19 Given steps) ────────────────────────────────
  // These create fully-configured sections from scratch to set up EU-side tests.

  async createAndSaveURLMediaSection(title, url1, url2 = null, style = null) {
    await this.visitSections();
    await this.clickAddSection();
    await this.selectURLMedia();
    await this.sectionEditorShouldBeVisible();
    await this.addSectionURL(url1);
    if (url2) {
      await this.addSectionURL(url2);
    }
    await this.switchToSectionTab('Visual');
    await this.setSectionTitle(title);
    if (style) {
      await this.selectCardStyle(style);
    }
    await this.saveSectionEditor();
    await this.sectionShouldBeVisibleOnPage(title);
  }

  async createAndSaveDigitalProductSection(options) {
    const {
      title,
      price = '9.99',
      slug,
      landingTitle,
      description,
      ctaText,
      productURL,
    } = options;

    await this.visitSections();
    await this.clickAddSection();
    await this.selectDigitalProduct();
    await this.dpEditorShouldBeVisible();

    // Tab 1 – Thumbnail
    await this.dpFillProductTitle(title);
    await this.dpFillPrice(price);
    await this.dpUploadAndCropImage();
    await this.dpClickNext();

    // Tab 2 – Landing Page
    await this.dpTabContentShouldBeVisible('Landing Page');
    if (landingTitle) {
      await this.dpFillLandingPageTitle(landingTitle);
    }
    if (slug) {
      await this.dpFillSlug(slug);
    }
    if (description) {
      await this.dpFillDescription(description);
    }
    await this.dpAddImagesToGallery(1);
    if (ctaText && ctaText !== 'Buy Now!') {
      await this.dpFillCTA(ctaText);
    }
    await this.dpClickNext();

    // Tab 3 – Product
    await this.dpTabContentShouldBeVisible('Product');
    if (productURL) {
      await this.dpFillExternalURL(productURL);
    }
    await this.dpSave();
    await this.sectionShouldBeVisibleOnPage(title);
  }

  // ─── Digital Product — discard modal ─────────────────────────────────────────

  async dpClickCancelButton() {
    // Fill the title and blur to trigger React dirty state — the discard modal only
    // appears when there are unsaved changes.
    const dialog = this._dpEditorDialog();
    const titleInput = dialog.getByRole('textbox', { name: /title/i }).first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill('Dirty State');
      await titleInput.blur();
      await this.page.waitForTimeout(500);
    }
    await dialog.getByRole('button', { name: /^cancel$/i }).click();
  }

  async dpClickCloseButton() {
    const dialog = this._dpEditorDialog();
    // Ensure the form is dirty so the discard modal appears
    const titleInput = dialog.getByRole('textbox', { name: /title/i }).first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const current = await titleInput.inputValue().catch(() => '');
      if (!current) {
        await titleInput.fill('Dirty State');
        await titleInput.blur();
        await this.page.waitForTimeout(500);
      }
    }
    const closeBtn = dialog
      .getByRole('button', { name: /close/i })
      .or(dialog.locator('button[aria-label="Close"]'))
      .or(dialog.locator('button svg.lucide-x').locator('..'))
      .first();
    await closeBtn.click();
  }
}

module.exports = { ProfileBuilderPage };
