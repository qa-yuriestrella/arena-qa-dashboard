const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

class OnboardingPage {
  constructor(page) {
    this.page = page;
    this._lastSlug = null;
  }

  // ─── Background setup ─────────────────────────────────────────────────────────

  async signUpAndStart() {
    const { SignupPage } = require('./SignupPage');
    const sp = new SignupPage(this.page);
    await sp.visit();
    await sp.fillForm();
    await sp.clickSignUp();
    await this.page.waitForURL(/\/setup\//, { timeout: 20000 });
  }

  // ─── Step navigation ──────────────────────────────────────────────────────────
  // Each goTo* method goes through ALL previous steps in order.
  // Direct page.goto() is intentionally avoided because the app enforces a
  // server-side cookie guard (avatar-onboarding-step) that redirects users
  // to earlier steps when they try to skip ahead.

  async goToSlugStep() {
    // After signup the browser is already at /setup/username; just wait for the input.
    this._currentStep = 'username';
    await this.page.waitForURL(/\/setup\/username/, { timeout: 15000 });
    await this.page.waitForSelector('#slug', { state: 'visible' });
  }

  async goToLifelikeStep() {
    // username → submit slug → lifelike
    this._currentStep = 'lifelike';
    await this.goToSlugStep();
    const slug = `slug${Date.now().toString().slice(-6)}`;
    this._lastSlug = slug;
    await this.enterSlug(slug);
    await this.submitSlug();
    await this.page.waitForURL(/\/setup\/lifelike/, { timeout: 15000 });
  }

  // username → lifelike (skip) → personalize
  // requestedSlug is used as-is with a timestamp suffix appended.
  async goToPersonalizeStep(requestedSlug) {
    const suffix = Date.now().toString().slice(-6);
    const slug = requestedSlug ? `${requestedSlug}${suffix}` : `slug${suffix}`;
    this._lastSlug = slug;

    await this.goToSlugStep();
    await this.enterSlug(slug);
    await this.submitSlug();
    await this.page.waitForURL(/\/setup\/lifelike/, { timeout: 15000 });
    await this._clickSkip();
    await this.page.waitForURL(/\/setup\/personalize/, { timeout: 10000 });
  }

  // username → lifelike (skip) → personalize → Next Step → social
  async goToSocialStep() {
    await this.goToPersonalizeStep();
    await this.page.getByRole('button', { name: /next step/i }).click();
    await this.page.waitForURL(/\/setup\/social/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
  }

  // … → social → Next Step → checkout
  async goToCheckoutStep() {
    this._currentStep = 'checkout';
    await this.goToSocialStep();
    await this.page.getByRole('button', { name: /next step/i }).click();
    await this.page.waitForURL(/\/setup\/checkout/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
  }

  // … → checkout → fill payment → Start Trial → visual
  async goToVisualStep() {
    await this.goToCheckoutStep();
    await this._completeCheckoutAndAdvance();
  }

  // Advances from /setup/social to /setup/visual without restarting the flow.
  // Used when the test has already navigated to the social step and added
  // accounts; calling goToVisualStep() from social would restart from scratch.
  async goToVisualStepFromSocial() {
    await this.page.getByRole('button', { name: /next step/i }).click();
    await this.page.waitForURL(/\/setup\/checkout/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
    await this._completeCheckoutAndAdvance();
  }


  async fillPaymentFormWithValidData() {
    // Chargebee hosted fields use dynamic ids (e.g. card-number-<uuid>), so match by prefix.
    // fill() bypasses keyboard events that Chargebee relies on; use pressSequentially instead.
    await this.page.waitForSelector('iframe[src*="chargebee"]', { timeout: 20000 });
    const fillCardField = async (idPrefix, inputSelector, value) => {
      const frame = this.page.frameLocator(`div[id^="${idPrefix}"] iframe`);
      const input = frame.locator(inputSelector);
      await input.waitFor({ state: 'visible', timeout: 15000 });
      await input.click();
      await input.pressSequentially(value, { delay: 40 });
    };
    await fillCardField('card-number', 'input[autocomplete="cc-number"]', '4111111111111111');
    await fillCardField('card-expiry', 'input[autocomplete="cc-exp"]', '12/28');
    await fillCardField('card-cvv', 'input[autocomplete="cc-csc"][name="cvv"]', '123');
  }


  async _completeCheckoutAndAdvance() {
    await this.fillPaymentFormWithValidData();
    await this.page.getByRole('button', { name: /start trial/i }).click();
    await this.page.waitForURL(/\/setup\/visual/, { timeout: 30000 });
    await this.page.waitForLoadState('load');
  }

  // ─── Step 1: Slug / Username ──────────────────────────────────────────────────

  async enterSlug(slug) {
    await this.page.locator('#slug').fill(slug);
  }

  async submitSlug() {
    // Arrow-right icon button next to the slug input (no text, no aria-label)
    await this.page.locator('button:has(svg.lucide-arrow-right)').click();
  }

  async slugErrorShouldContain(message) {
    // Error renders in a <p data-visible="true"> element
    await expect(
      this.page.locator('p[data-visible="true"]')
    ).toContainText(message, { timeout: 8000 });
  }

  async slugErrorShouldIndicateTaken() {
    await expect(
      this.page.locator('p[data-visible="true"]')
    ).toContainText(/unavailable|already taken/i, { timeout: 8000 });
  }

  async shouldHaveAdvancedFromCurrentStep() {
    const step = this._currentStep || 'username';
    await expect(this.page).not.toHaveURL(
      new RegExp(`/setup/${step}`),
      { timeout: 15000 }
    );
  }

  // ─── Step 2: Lifelike avatar (data usage permission) ─────────────────────────

  async _clickSkip() {
    await this.page.getByRole('button', { name: 'Skip' }).click();
  }

  async proceedWithoutChangingToggle() {
    // Default state is unchecked → button shows "Skip"
    await this._clickSkip();
  }

  async toggleDataUsageOn() {
    const toggle = this.page.getByRole('switch', { name: /lifelike/i });
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      await toggle.click();
    }
  }

  async toggleDataUsageOff() {
    const toggle = this.page.getByRole('switch', { name: /lifelike/i });
    if ((await toggle.getAttribute('data-state')) === 'checked') {
      await toggle.click();
    }
  }

  async toggleShouldBeOff() {
    await expect(
      this.page.getByRole('switch', { name: /lifelike/i })
    ).toHaveAttribute('data-state', 'unchecked', { timeout: 5000 });
  }

  async shouldAdvanceToNextStep(currentStepSlug) {
    await expect(this.page).not.toHaveURL(
      new RegExp(`/setup/${currentStepSlug}`),
      { timeout: 15000 }
    );
  }

  // ─── Step 3: Profile info (personalize) ──────────────────────────────────────

  async titleFieldShouldContain(text) {
    // The title is set from the slug (hyphens → spaces, capitalized words).
    // Use toContain so a timestamp-suffixed slug like "yuri-gomes123456" still works.
    const value = await this.page.locator('#title').inputValue();
    expect(value.toLowerCase()).toContain(text.toLowerCase());
  }

  async titleFieldShouldContainSignupName() {
    const fixturePath = path.join(__dirname, '../../fixtures/user.json');
    const { name } = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const value = await this.page.locator('#title').inputValue();
    expect(value.toLowerCase()).toContain(name.toLowerCase());
  }

  async typeHeadline(charCount) {
    await this.page.locator('textarea#bio, #bio').fill('a'.repeat(charCount));
  }

  async headlineLengthShouldBeAtMost(max) {
    const value = await this.page.locator('textarea#bio, #bio').inputValue();
    expect(value.length).toBeLessThanOrEqual(max);
  }

  async selectLanguage(language) {
    // shadcn Select renders the trigger as role="combobox"
    await this.page.getByRole('combobox').click();
    await this.page.getByRole('option', { name: language }).click();
  }

  async languageShouldBeSelected(language) {
    await expect(this.page.getByRole('combobox')).toContainText(language, { timeout: 5000 });
  }

  // ─── Step 4: Social accounts ──────────────────────────────────────────────────

  _socialInputId(platform) {
    const map = {
      Instagram: 'instagram-input',
      X: 'x-input',
      Youtube: 'youtube-input',
      TikTok: 'tiktok-input',
      LinkedIn: 'linkedin-input',
      Facebook: 'facebook-input',
    };
    return map[platform] || `${platform.toLowerCase()}-input`;
  }

  async addSocialAccount(platform, value) {
    const id = this._socialInputId(platform);
    await this.page.locator(`#${id}`).fill(value);
    await this.page.locator(`#${id}`).press('Tab');
  }

  async socialAccountShouldBeSaved(platform) {
    const id = this._socialInputId(platform);
    await expect(this.page.locator(`#${id}`)).not.toHaveValue('', { timeout: 5000 });
  }

  async addAllSocialAccountsAndClickNext() {
    const accounts = [
      { platform: 'Instagram', value: 'https://instagram.com/mazzola' },
      { platform: 'X', value: '@opovo' },
      { platform: 'Youtube', value: 'https://youtube.com/@diogodefante' },
      { platform: 'TikTok', value: '@mazzola' },
      { platform: 'Facebook', value: 'https://facebook.com/igaounderground' },
      { platform: 'LinkedIn', value: 'https://linkedin.com/in/caito-maia' },
    ];
    for (const { platform, value } of accounts) {
      await this.addSocialAccount(platform, value);
    }
    const responsePromise = this.page.waitForResponse(
      res => res.url().includes('update-link-in-bio') && res.request().method() === 'PUT',
      { timeout: 15000 }
    );
    await this.page.getByRole('button', { name: /next step/i }).click();
    const response = await responsePromise;
    this._lastSocialLinksBody = await response.json();
  }

  async socialLinksShouldBeSubmittedCorrectly() {
    const stripWww = url => (url || '').replace(/^(https?:\/\/)www\./, '$1');
    const socialLinks = this._lastSocialLinksBody?.links?.socialLinks ?? [];
    const expected = [
      { id: 'instagram-input', value: 'https://instagram.com/mazzola' },
      { id: 'x-input', value: 'https://x.com/opovo' },
      { id: 'youtube-input', value: 'https://youtube.com/@diogodefante' },
      { id: 'tiktok-input', value: 'https://tiktok.com/@mazzola' },
      { id: 'facebook-input', value: 'https://facebook.com/igaounderground' },
      { id: 'linkedin-input', value: 'https://linkedin.com/in/caito-maia' },
    ];
    for (const exp of expected) {
      const found = socialLinks.find(l => l.id === exp.id);
      expect(found, `Expected social link entry for ${exp.id}`).toBeTruthy();
      expect(stripWww(found?.value)).toBe(exp.value);
    }
  }

  async proceedFromSocialStep() {
    const responsePromise = this.page.waitForResponse(
      res => res.url().includes('update-link-in-bio') && res.request().method() === 'PUT',
      { timeout: 15000 }
    );
    await this.page.getByRole('button', { name: /next step/i }).click();
    const response = await responsePromise;
    this._lastSocialLinksBody = await response.json();
  }

  async profileImageShouldBeSourcedFrom(platform) {
    const domainPatterns = {
      Youtube: ['ytimg', 'youtube', 'yt3.ggpht'],
      Instagram: ['cdninstagram', 'igcdn', 'instagram'],
      X: ['pbs.twimg', 'twimg'],
      TikTok: ['tiktok'],
      Facebook: ['fbcdn', 'facebook'],
      LinkedIn: ['licdn', 'linkedin'],
    };
    const patterns = domainPatterns[platform] || [platform.toLowerCase()];
    const body = this._lastSocialLinksBody;
    // The API response includes the resolved defaultImage URL; the image is not shown on screen
    const defaultImage =
      body?.defaultImage ||
      body?.links?.defaultImage ||
      body?.data?.defaultImage ||
      '';
    const matched = patterns.some(p => defaultImage.toLowerCase().includes(p));
    expect(
      matched,
      `Expected profile image to be from ${platform}. Got defaultImage: "${defaultImage}"`
    ).toBe(true);
  }

  // ─── Step 5: Payment / Checkout ───────────────────────────────────────────────

  async startTrialShouldBeDisabled() {
    await expect(
      this.page.getByRole('button', { name: /start trial/i })
    ).toBeDisabled({ timeout: 10000 });
  }

  async startTrialShouldBeEnabled() {
    await expect(
      this.page.getByRole('button', { name: /start trial/i })
    ).not.toBeDisabled({ timeout: 10000 });
  }



  async applyCouponCode(code) {
    const couponInput = this.page.getByRole('textbox', { name: /coupon code/i });

    if (!(await couponInput.isVisible().catch(() => false))) {
      const haveCouponBtn = this.page.getByRole('button', { name: 'Have a coupon?' });
      await haveCouponBtn.click();
      await expect(couponInput).toBeVisible();
    }

    await couponInput.click();
    await couponInput.press('Control+A');
    await couponInput.press('Backspace');

    await couponInput.fill(code);

    await this.page.getByRole('button', { name: /apply/i }).click();
  }

  async couponErrorShouldBeVisible() {
    await expect(
      this.page.locator('.text-red-600').first()
    ).toBeVisible({ timeout: 8000 });
  }

  async discountShouldShowPercent(discount) {
    const pct = discount.replace('%', '').trim();
    await expect(
      this.page.getByText(new RegExp(`${pct}.*off|${pct}%`, 'i')).first()
    ).toBeVisible({ timeout: 8000 });
  }

  async toggleBillingToYearly() {
    // The toggle is a <button> with w-11 and rounded-full sitting between Monthly/Yearly labels
    await this.page.locator('button[class*="w-11"][class*="rounded-full"]').click();
  }

  async toggleBillingToMonthly() {
    await this.page.locator('button[class*="w-11"][class*="rounded-full"]').click();
  }

  async priceShouldShowDiscount() {
    // When yearly is selected the toggle knob shifts to translate-x-6
    await expect(
      this.page.locator('span[class*="translate-x-6"]').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async priceShouldNotShowDiscount() {
    // When monthly is selected the knob is at translate-x-1 (no translate-x-6)
    await expect(
      this.page.locator('span[class*="translate-x-6"]').first()
    ).not.toBeVisible({ timeout: 5000 });
  }

  async openPlanSelector() {
    await this.page.getByRole('button', { name: /change plan/i }).first().click();
  }

  async choosePlan(planName) {
    // Click the plan Card to set it as the viewing plan
    await this.page.locator('[class*="cursor-pointer"]').filter({ hasText: planName }).first().click();
  }

  async confirmPlanSelection() {
    // Button text is "Choose this plan"
    await this.page.getByRole('button', { name: /choose.*plan/i }).first().click();
  }

  async choosePlanButtonShouldBeDisabledFor(_planName) {
    // "Choose this plan" is disabled when the viewing plan is already the selected plan
    await expect(
      this.page.getByRole('button', { name: /choose.*plan/i }).first()
    ).toBeDisabled({ timeout: 5000 });
  }

  async planShouldBeActive(planName) {
    // Active plan card gets border-black
    await expect(
      this.page.locator('[class*="border-black"]').filter({ hasText: planName }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickStartTrial() {
    await this.page.getByRole('button', { name: /start trial/i }).click();
  }

  // ─── Step 6: Avatar / Visual ──────────────────────────────────────────────────

  async avatarShouldShowProfileImage() {
    // The profile image renders as img[alt="Cropped"] inside the size-[120px] avatar circle.
    // This element only exists when croppedImage (defaultImage from the server) is truthy.
    const avatarCircle = this.page.locator('div[class*="size-[120px]"]').first();
    const profileImg = avatarCircle.locator('img[alt="Cropped"]');
    await expect(profileImg).toBeVisible({ timeout: 10000 });
    const src = await profileImg.getAttribute('src');
    expect(src).toBeTruthy();
  }

  async avatarShouldNotShowProfileImage() {
    // When no social accounts were added the avatar circle contains no "Cropped" image.
    const avatarCircle = this.page.locator('div[class*="size-[120px]"]').first();
    await expect(avatarCircle.locator('img[alt="Cropped"]')).not.toBeVisible({ timeout: 5000 });
  }

  async uploadCustomImage() {
    const testImagePath = path.join(__dirname, '../fixtures/images/test-face.jpg');
    await this.page.setInputFiles('input[type="file"][accept*="image"]', testImagePath);
    // Wait for the image cropper dialog to appear, then save
    await this.page.waitForTimeout(800);
    const saveBtn = this.page.getByRole('button', { name: /save/i });
    if (await saveBtn.count() > 0 && await saveBtn.first().isVisible()) {
      await saveBtn.first().click();
      await this.page.waitForTimeout(500);
    }
  }

  async avatarShouldShowUploadedImage() {
    await expect(
      this.page.locator('img[src^="blob:"], img[src^="data:"], img[src*="supabase"]').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAvatarColorButton() {
    // The color picker trigger is a button containing an inline background-color swatch span
    await this.page.locator('button').filter({
      has: this.page.locator('span[style*="background-color"]'),
    }).click();
  }

  async avatarColorPickerShouldBeVisible() {
    // Wait for Radix Popover to open
    const popover = this.page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover).toBeVisible({ timeout: 5000 });

    // HEX input is the only text input with maxlength="7" in the picker
    const hexInput = popover.locator('input[maxlength="7"]');

    // Change color 3 times to exercise the picker without causing an application error
    for (const color of ['#FF5733', '#3366FF', '#33CC66']) {
      await hexInput.fill(color);
      await this.page.waitForTimeout(300);
    }

    // Close the popover
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    // Trigger button should now reflect the last applied color
    const triggerHex = await this.page.locator('button').filter({
      has: this.page.locator('span[style*="background-color"]'),
    }).locator('span.text-slate-900').textContent();
    expect(triggerHex?.trim()).toBe('#33CC66');
  }

  // ─── Step 7: Complete flow ─────────────────────────────────────────────────────

  async finishOnboarding() {
    // Set up interceptors BEFORE clicking so we don't miss fast events
    this._animatingResponsePromise = this.page.waitForResponse(
      res => res.url().includes('animated-profile-image-'),
      { timeout: 60000 }
    );
    this._toastPromise = this.page.waitForSelector(
      ':text("being animated")',
      { state: 'visible', timeout: 30000 }
    );
    await this.page.locator('button').filter({ hasText: /finish/i }).first().click();
  }

  async animatedProfileRequestShouldFire() {
    await this._animatingResponsePromise;
  }

  async avatarAnimatingToastShouldBeVisible() {
    // Promise was registered before clicking Finish; resolves when toast DOM element is visible
    await this._toastPromise;
  }

  async shouldBeOnKnowledgePage() {
    await this.page.waitForURL(/\/knowledge-base/, { timeout: 30000 });
  }
}

module.exports = { OnboardingPage };
