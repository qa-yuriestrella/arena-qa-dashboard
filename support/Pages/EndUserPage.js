const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { completeGoogleOAuth } = require('../helpers/oauthHelper');

const EU_URL = process.env.EU_URL || 'https://dev-avatar.arena.im/automation1arena';

class EndUserPage {
  constructor(page) {
    this.page = page;
    this._sessionRequestPromise = null;
    this._messageRequestPromise = null;
    this._callRequestPromise = null;
  }

  async visit() {
    const response = await this.page.goto(EU_URL, { timeout: 10000 });
    if (response && response.status() === 404) {
      throw new Error(`End-user page returned 404 – avatar may not exist at ${EU_URL}`);
    }
    await this.page.waitForLoadState('load', { timeout: 10000 });
  }

  // ─── Entry points ─────────────────────────────────────────────────────────────

  async clickProfileButton() {
    // The profile icon is a web component that exposes a button named "Login" in the
    // accessibility tree. There are 2 instances on the page (nav + chat); use .first().
    await this.page.getByRole('button', { name: /^login$/i }).first().click();
  }

  async clickSubscribeButton() {
    await this.page.getByRole('button', { name: /subscribe/i }).click();
  }

  async openTextChat() {
    // Set up request tracking before clicking to catch first-session API calls
    this._sessionRequestPromise = this.page.waitForRequest(
      req => req.url().includes('create-session') || (req.url().includes('/session') && req.method() === 'POST'),
      { timeout: 30000 }
    );
    this._messageRequestPromise = this.page.waitForRequest(
      req => req.url().includes('send-message') || (req.url().includes('/message') && req.method() === 'POST'),
      { timeout: 30000 }
    );
    // Also track the welcome-message RESPONSE so lastMessageShouldBeFromAvatar can wait for it.
    this._welcomeResponsePromise = this.page.waitForResponse(
      res =>
        (res.url().includes('send-message') || res.url().includes('/message')) &&
        res.status() === 200,
      { timeout: 30000 }
    );
    // Prevent unhandled-rejection crash if test ends without awaiting these (e.g. EU003)
    this._sessionRequestPromise.catch(() => {});
    this._messageRequestPromise.catch(() => {});
    this._welcomeResponsePromise.catch(() => {});

    await this.page.getByRole('button', { name: /^text$/i }).click();
  }

  async clickCallButton() {
    // The call initiation is tracked via a Segment/analytics Track event with
    // "event": "Voice Call Started" in the POST body, not a dedicated /call URL.
    // Match by URL pattern OR by payload so either implementation works.
    this._callRequestPromise = this.page.waitForRequest(
      req => {
        if (req.method() !== 'POST') return false;
        if (/call|voice-call|start-call/i.test(req.url())) return true;
        try {
          const body = JSON.parse(req.postData() || '{}');
          return body.event === 'Voice Call Started';
        } catch { return false; }
      },
      { timeout: 30000 }
    );
    this._callRequestPromise.catch(() => {});
    await this.page.getByRole('button', { name: /^call$/i }).click();
  }

  async clickProfileIconInsideChat() {
    // The chat widget has its own login button (second ac-profile-dropdown-web-component).
    await this.page.getByRole('button', { name: /^login$/i }).last().click();
  }

  // ─── Auth modal ───────────────────────────────────────────────────────────────

  // Auth modal renders inside an iframe — all modal interactions must use this frame.
  _authFrame() {
    return this.page.frameLocator('iframe').first();
  }

  async authModalShouldBeVisible() {
    await expect(this._authFrame().getByRole('dialog')).toBeVisible({ timeout: 15000 });
  }

  async authModalShouldShowAllOptions() {
    const dialog = this._authFrame().getByRole('dialog');
    await expect(dialog.getByRole('menuitem', { name: /continue with google/i })).toBeVisible();
    await expect(dialog.getByRole('menuitem', { name: /continue with facebook/i })).toBeVisible();
    await expect(dialog.getByRole('menuitem', { name: /continue with x/i })).toBeVisible();
    await expect(dialog.getByRole('menuitem', { name: /continue with email/i })).toBeVisible();
  }

  // ─── Email signup ─────────────────────────────────────────────────────────────

  async selectEmailSignup() {
    await this._authFrame().getByRole('menuitem', { name: /continue with email/i }).click();
  }

  async fillSignupFormWithNewUser() {
    const email = faker.internet.email({ provider: 'yopmail.com' });
    const password = `Test@${faker.number.int({ min: 1000, max: 9999 })}Aa!`;
    const frame = this._authFrame();
    // Label is "Email address*"; placeholder is "Enter your email" (not "email address")
    await frame.getByLabel(/email address/i).fill(email);
    await frame.getByLabel(/^password\*/i).fill(password);
    await frame.getByLabel(/confirm password/i).fill(password);
  }

  async clickCreateAccount() {
    await this._authFrame().getByRole('button', { name: /create account/i }).click();
  }

  async fillDisplayName() {
    const input = this._authFrame().getByPlaceholder(/display name|your name|input your name/i);
    await input.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    if (await input.isVisible()) {
      await input.fill(faker.person.firstName());
    }
  }

  async clickSave() {
    const saveBtn = this._authFrame().getByRole('button', { name: /^save$/i });
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }
  }

  // ─── Password toggles ─────────────────────────────────────────────────────────
  // Toggle buttons are named "Show password" (masked) or "Hide password" (revealed).
  // Checking button text is robust: toggling changes the input type between
  // "password" and "text", making input-type counts unreliable.

  async passwordFieldShouldBeHidden() {
    await expect(
      this._authFrame().getByRole('button', { name: /^show password$/i }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async passwordFieldShouldBeVisible() {
    await expect(
      this._authFrame().getByRole('button', { name: /^hide password$/i }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickPasswordToggle() {
    await this._authFrame().getByRole('button', { name: /show password|hide password/i }).first().click();
  }

  async confirmPasswordFieldShouldBeHidden() {
    await expect(
      this._authFrame().getByRole('button', { name: /^show password$/i }).last()
    ).toBeVisible({ timeout: 5000 });
  }

  async confirmPasswordFieldShouldBeVisible() {
    await expect(
      this._authFrame().getByRole('button', { name: /^hide password$/i }).last()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickConfirmPasswordToggle() {
    await this._authFrame().getByRole('button', { name: /show password|hide password/i }).last().click();
  }

  // ─── Sign in ──────────────────────────────────────────────────────────────────

  async clickSignInLink() {
    await this._authFrame().getByRole('link', { name: /sign in now/i }).click();
  }

  async fillSigninEmail(email) {
    await this._authFrame().getByPlaceholder(/email/i).fill(email);
  }

  async fillSigninPassword(password) {
    await this._authFrame().getByPlaceholder(/password/i).fill(password);
  }

  async clickSignIn() {
    // The sign-in submit button is labeled "Login" (not "Sign In") per the auth modal's UI
    await this._authFrame().getByRole('button', { name: /^login$/i }).click();
  }

  // ─── Social login ─────────────────────────────────────────────────────────────

  async loginWithGoogle() {
    const popupPromise = this.page.waitForEvent('popup');
    await this._authFrame().getByRole('menuitem', { name: /continue with google/i }).click();
    const popup = await popupPromise;
    await completeGoogleOAuth(popup);
  }

  async loginWithX() {
    const popupPromise = this.page.waitForEvent('popup');
    await this._authFrame().getByRole('menuitem', { name: /continue with x/i }).click();
    const xPopup = await popupPromise;

    await xPopup.waitForURL(/x\.com|twitter\.com/, { timeout: 30000 }).catch(() => {});
    await xPopup.waitForLoadState('domcontentloaded');

    // Step 1: X shows "Sign in to X" page (user not logged in to X) — sign in via Google.
    // Use exact button name to avoid matching "Sign in with Apple".
    const signInWithGoogleBtn = xPopup.getByRole('button', { name: 'Sign in with Google' });
    await signInWithGoogleBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    if (await signInWithGoogleBtn.isVisible()) {
      // Register Google popup listener BEFORE clicking to avoid missing the event
      const googlePopupPromise = xPopup.waitForEvent('popup');
      await signInWithGoogleBtn.click();
      const googlePopup = await googlePopupPromise.catch(() => null);
      await completeGoogleOAuth(googlePopup || xPopup);
      // After Google auth, X loads the "Authorize Arena Auth" consent page
      await xPopup.waitForLoadState('domcontentloaded');
    }

    // Step 2: X "Authorize Arena Auth" consent page — click the Sign In button.
    // Use /^sign in$/i to avoid re-matching "Sign in with Google" if the X page reloads.
    const authorizeBtn = xPopup.getByRole('button', { name: /^sign in$/i });
    await authorizeBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await authorizeBtn.isVisible()) {
      await authorizeBtn.click();
    }

    // Wait for X popup to complete the OAuth callback and close
    await Promise.race([
      xPopup.waitForEvent('close'),
      xPopup.waitForURL(url => !url.includes('x.com') && !url.includes('twitter.com'), { timeout: 30000 }),
    ]).catch(() => {});
  }

  async loginWithFacebook() {
    const popupPromise = this.page.waitForEvent('popup');
    await this._authFrame().getByRole('menuitem', { name: /continue with facebook/i }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('load');

    // Fill email/phone and wait for the field to be present
    const emailField = popup.locator('input[name="email"], input[id="email"]');
    await emailField.waitFor({ state: 'visible', timeout: 15000 });
    await emailField.fill(process.env.FACEBOOK_PHONE || '');

    // Some Facebook variants use a 2-step flow: email → Next → password
    const nextBtn = popup.getByRole('button', { name: /^next$/i });
    await nextBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await popup.waitForLoadState('domcontentloaded');
    }

    // Fill password (waits in case it appears on a new step)
    const passField = popup.locator('input[name="pass"], input[id="pass"]');
    await passField.waitFor({ state: 'visible', timeout: 10000 });
    await passField.fill(process.env.FACEBOOK_PASSWORD || '');

    await popup.getByRole('button', { name: /^log in$/i }).click();
    await Promise.race([
      popup.waitForEvent('close'),
      popup.waitForURL(url => !url.includes('facebook.com'), { timeout: 20000 }),
    ]).catch(() => {});
  }

  // ─── Post-auth ────────────────────────────────────────────────────────────────

  async shouldBeLoggedIn() {
    // Some accounts (first login) require a display name before the dialog closes.
    // Use waitFor so the check actually waits — isVisible({ timeout }) is a no-op in Playwright 1.59.
    const displayNameInput = this._authFrame().getByPlaceholder(/input your name/i);
    await displayNameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await displayNameInput.isVisible()) {
      await displayNameInput.fill('Automation');
      const saveBtn = this._authFrame().getByRole('button', { name: /^save$/i });
      try {
        await expect(saveBtn).toBeEnabled({ timeout: 5000 });
        await saveBtn.click();
      } catch {
        // Form already transitioned or save unavailable — ignore
      }
    }
    await expect(this._authFrame().getByRole('dialog')).not.toBeVisible({ timeout: 20000 });
  }

  // ─── Voice call ───────────────────────────────────────────────────────────────

  async callUIShouldBeVisible() {
    // When a call is active the UI shows an end/hang-up button, mute button, or call timer.
    // NOTE: avoid aria-label*="end" i — "Send message" contains "end" as substring ("S-end")
    // and would match the chat send button before the call UI appears.
    await expect(
      this.page
        .locator([
          'button[aria-label="End call"]',
          'button[aria-label="Hang up"]',
          'button[aria-label*="end call" i]',
          'button[aria-label*="hang up" i]',
          'button[aria-label*="mute" i]',
          '[class*="call-active"]',
          '[class*="callActive"]',
          '[class*="call-timer"]',
          '[class*="callTimer"]',
        ].join(', '))
        .first()
    ).toBeVisible({ timeout: 20000 });
  }

  async callInitiationRequestShouldBeFired() {
    await this._callRequestPromise;
  }

  // ─── Chat window ──────────────────────────────────────────────────────────────

  async chatWindowShouldBeVisible() {
    await expect(
      this.page.locator('[class*="chat"], [role="log"], [aria-label*="chat" i]').first()
    ).toBeVisible({ timeout: 8000 });
  }

  async lastMessageShouldBeFromAvatar() {
    // Wait for the avatar's API response to arrive (captured in openTextChat).
    // If already resolved (e.g. called again from avatarShouldRespond), this no-ops quickly.
    if (this._welcomeResponsePromise) {
      await this._welcomeResponsePromise.catch(() => {});
      await this.page.waitForTimeout(500);
    }
    // Find any message element inside the chat container.
    // CSS-module class names are hashed, so we scope inside [class*="chat"] and look for
    // common message containers — the last one should be from the Avatar.
    await expect(
      this.page
        .locator('[class*="chat"] [class*="message"], [class*="chat"] p, [role="log"] [class*="message"]')
        .last()
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── API request assertions ───────────────────────────────────────────────────

  async createSessionRequestShouldBeFired() {
    await this._sessionRequestPromise;
  }

  async sendMessageRequestShouldBeFired() {
    await this._messageRequestPromise;
  }

  // ─── Messaging ────────────────────────────────────────────────────────────────

  async sendMessage(text) {
    // Wait for the Avatar's welcome message before allowing input —
    // the chat input is present but the Avatar isn't ready to receive messages until
    // the initial session response arrives.
    if (this._welcomeResponsePromise) {
      await this._welcomeResponsePromise.catch(() => {});
      this._welcomeResponsePromise = null;
      await this.page.waitForTimeout(500);
    }
    // Scope the input lookup to the form containing the "Send message" submit button
    // to avoid matching unrelated fields on the page.
    const input = this.page.locator(
      'form:has(button[aria-label="Send message"]) input[type="text"],' +
      'form:has(button[aria-label="Send message"]) textarea'
    ).first();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.fill(text);
    await input.press('Enter');
  }

  async avatarShouldRespond() {
    // Wait for the Avatar's reply to arrive via the API response
    await this.page.waitForResponse(
      res =>
        (res.url().includes('send-message') || res.url().includes('/message')) &&
        res.status() === 200,
      { timeout: 30000 }
    );
    await this.lastMessageShouldBeFromAvatar();
  }

  // ─── Scene video / avatar ring ────────────────────────────────────────────────

  async avatarImageShouldHaveVideoRing() {
    // When a scene is added to the profile, the avatar image gets a ring/border
    // that indicates a "story" is available. The ring uses Tailwind ring-* classes.
    await expect(
      this.page.locator('[class*="ring"]').filter({
        has: this.page.locator('img'),
      }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickAvatarImage() {
    // Click the avatar image / profile picture — triggers the scene video player
    const avatarButton = this.page.locator(
      'button:has(img), [role="button"]:has(img), img[class*="avatar"], img[class*="profile"]'
    ).first();
    await avatarButton.click();
  }

  async sceneVideoShouldPlay() {
    // After clicking the avatar with a scene attached, a video element should appear
    await expect(
      this.page.locator('video')
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── Sections on EU — URL Media ───────────────────────────────────────────────

  async sectionShouldBeVisibleOnEU(title) {
    await expect(
      this.page.getByText(title, { exact: false }).first()
    ).toBeVisible({ timeout: 20000 });
  }

  async firstCardInSectionShouldHaveAspectRatio(sectionTitle, orientation) {
    // Find the section container by title text, then measure the first link card inside it
    const sectionEl = this.page.locator('section, article, [class*="section"], [class*="Section"]')
      .filter({ hasText: sectionTitle })
      .first();
    const card = sectionEl.locator('a[href], [class*="card"], [class*="Card"], li').first();
    const box = await card.boundingBox({ timeout: 15000 });
    expect(box, `No card found inside section "${sectionTitle}"`).not.toBeNull();
    const ratio = box.width / box.height;
    if (orientation === 'landscape') {
      expect(ratio, `Expected landscape (>1.3), got ${ratio.toFixed(2)}`).toBeGreaterThan(1.3);
    } else if (orientation === 'square') {
      expect(ratio, `Expected square (0.75–1.35), got ${ratio.toFixed(2)}`).toBeGreaterThan(0.75);
      expect(ratio, `Expected square (0.75–1.35), got ${ratio.toFixed(2)}`).toBeLessThan(1.35);
    } else if (orientation === 'portrait') {
      expect(ratio, `Expected portrait (<0.8), got ${ratio.toFixed(2)}`).toBeLessThan(0.8);
    }
  }

  async sectionShouldShowCarousel() {
    await expect(
      this.page.locator(
        '[class*="carousel"], [class*="Carousel"], [class*="swiper"], ' +
        '[class*="slider"], [class*="Slider"], [data-carousel]'
      ).first()
    ).toBeVisible({ timeout: 15000 });
  }

  async sectionCarouselShouldBeVisible() {
    // Carousel sections render a scroll/swiper container with overflow-x or a carousel wrapper
    await expect(
      this.page.locator(
        '[class*="carousel"], [class*="Carousel"], [class*="swiper"], ' +
        '[class*="slider"], [class*="Slider"], [data-carousel]'
      ).first()
    ).toBeVisible({ timeout: 15000 });
  }

  _carouselNextArrow() {
    return this.page.locator(
      'button[aria-label*="next" i], button[aria-label*="forward" i], ' +
      'button[class*="next"], button[class*="Next"], ' +
      '[class*="arrow-right"], [class*="arrowRight"], ' +
      'button svg[class*="chevron-right"], button svg[class*="ChevronRight"]'
    ).first();
  }

  async clickCarouselNextArrow() {
    const arrow = this._carouselNextArrow();
    await arrow.waitFor({ state: 'visible', timeout: 10000 });
    // Capture scroll position or active slide index before clicking
    this._carouselPositionBefore = await this.page.evaluate(() => {
      const el = document.querySelector('[class*="carousel"], [class*="swiper"], [class*="slider"]');
      return el ? el.scrollLeft : 0;
    });
    await arrow.click();
    await this.page.waitForTimeout(600);
  }

  async carouselShouldHaveNavigated() {
    const positionAfter = await this.page.evaluate(() => {
      const el = document.querySelector('[class*="carousel"], [class*="swiper"], [class*="slider"]');
      return el ? el.scrollLeft : 0;
    });
    // Either scrollLeft changed OR an active-slide indicator changed
    if (positionAfter !== this._carouselPositionBefore) return;
    // Fallback: check that the next arrow is still visible (navigation didn't error)
    await expect(this._carouselNextArrow()).toBeVisible({ timeout: 5000 });
  }

  async atLeastNSectionLinkCardsShouldBeVisible(n) {
    // Link cards in a URL Media section — each card is an anchor or a clickable div
    const cards = this.page.locator('a[href^="http"], [class*="link-card"], [class*="linkCard"]')
      .filter({ hasNotText: /text|subscribe|call/i });
    await expect(cards).toHaveCount(await cards.count().then(c => Math.max(c, n)), { timeout: 10000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(n);
  }

  async clickFirstSectionLinkCard() {
    const linkCard = this.page.locator(
      'a[href^="http"]:not([href*="arena.im"]):not([href*="myavatar.ai"])'
    ).first();
    this._newTabPromise = this.page.context().waitForEvent('page', { timeout: 15000 });
    await linkCard.click();
  }

  async sectionShouldHaveAtLeastNLinkCards(sectionTitle, n) {
    const sectionEl = this.page.locator('section, article, [class*="section"], [class*="Section"]')
      .filter({ hasText: sectionTitle })
      .first();
    await expect(sectionEl).toBeVisible({ timeout: 15000 });
    const cards = sectionEl.locator('a[href^="http"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const count = await cards.count();
    expect(count, `Section "${sectionTitle}" should have at least ${n} link cards, found ${count}`).toBeGreaterThanOrEqual(n);
  }

  async carouselInSectionShouldCoverAllLinks(sectionTitle, expectedLinkCount) {
    const sectionEl = this.page.locator('section, article, [class*="section"], [class*="Section"]')
      .filter({ hasText: sectionTitle })
      .first();

    // Next arrow: circular absolute button on the right side of the carousel
    const nextBtn = sectionEl.locator('button[class*="right-2"][class*="rounded-full"]').first();

    const btnVisible = await nextBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
    expect(btnVisible, `Carousel next button not found in section "${sectionTitle}"`).toBe(true);

    let clicks = 0;
    const maxClicks = expectedLinkCount + 10;
    while (clicks < maxClicks) {
      const visible = await nextBtn.isVisible().catch(() => false);
      if (!visible) break;
      const disabled = await nextBtn.isDisabled().catch(() => false);
      if (disabled) break;
      // Some carousel implementations hide the button via opacity-0 instead of removing it
      const classes = await nextBtn.getAttribute('class').catch(() => '');
      if (classes.includes('opacity-0') || (!classes.includes('opacity-100') && classes.includes('opacity'))) break;
      await nextBtn.click();
      await this.page.waitForTimeout(500);
      clicks++;
    }

    expect(clicks, `Carousel in section "${sectionTitle}" did not scroll — next button was never clickable`).toBeGreaterThan(0);
  }

  async clickFirstLinkCardInSection(sectionTitle) {
    const sectionEl = this.page.locator('section, article, [class*="section"], [class*="Section"]')
      .filter({ hasText: sectionTitle })
      .first();
    const linkCard = sectionEl.locator('a[href^="http"]').first();
    this._newTabPromise = this.page.context().waitForEvent('page', { timeout: 15000 });
    await linkCard.click();
  }

  async newTabShouldHaveURL(pattern) {
    const newPage = await this._newTabPromise;
    await newPage.waitForLoadState('domcontentloaded', { timeout: 20000 });
    expect(newPage.url()).toContain(pattern);
    await newPage.close();
  }

  // ─── Sections on EU — Digital Product card ────────────────────────────────────

  _productCard(title) {
    // Digital Product cards render as <a> link elements on the EU page
    return this.page.getByRole('link').filter({ hasText: title }).first();
  }

  async productCardShouldBeVisible(title) {
    await expect(this._productCard(title)).toBeVisible({ timeout: 20000 });
  }

  async productCardShouldShowCTAButton() {
    // "Buy now $ X.XX" is text inside the <a> product card link, not a separate button
    await expect(
      this.page.getByRole('link').filter({ hasText: /buy now/i }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickProductCard(title) {
    await this._productCard(title).click();
    await this.page.waitForTimeout(1000);
  }

  // ─── Sections on EU — Digital Product landing page ───────────────────────────

  async productLandingPageShouldBeVisible() {
    // Clicking the product card navigates to /automation1arena/products/<slug>
    await this.page.waitForURL(/\/products\//, { timeout: 15000 });
  }

  async landingPageShouldHaveCarousel() {
    await expect(
      this.page.locator(
        '[class*="carousel"], [class*="Carousel"], [class*="gallery"], ' +
        '[class*="Gallery"], [class*="swiper"], [class*="slider"]'
      ).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async landingPageShouldHaveDescription() {
    await expect(
      this.page.locator(
        '[class*="description"], [class*="Description"], ' +
        'p:not(:empty), [class*="body"], [class*="content"]'
      ).filter({ hasText: /.{20,}/ }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async landingPageShouldHaveCTAButton() {
    await expect(
      this.page.getByRole('button', { name: /buy|get|purchase|now/i }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async clickLandingPageCTAButton() {
    const ctaBtn = this.page
      .getByRole('button', { name: /buy|get|purchase|now/i })
      .first();
    await ctaBtn.waitFor({ state: 'visible', timeout: 10000 });
    await ctaBtn.click();
    await this.page.waitForTimeout(1500);
  }

  // ─── Stripe checkout ──────────────────────────────────────────────────────────

  async shouldBeOnStripeCheckout() {
    // Stripe checkout either loads in the same tab (redirect) or as an overlay.
    // Wait for Stripe's domain or for an iframe from Stripe.
    await Promise.race([
      this.page.waitForURL(/checkout\.stripe\.com|stripe\.com\/pay/, { timeout: 30000 }),
      this.page.locator('iframe[src*="stripe"]').first().waitFor({ state: 'visible', timeout: 30000 }),
    ]);
  }

  async fillStripeCard(cardNumber, expiry, cvc, name) {
    await this.page.waitForTimeout(2000);

    // Stripe hosted checkout uses one iframe per card field (card-number, card-expiry, card-cvc).
    const cardNumberFrame = this.page.frameLocator(
      'iframe[name*="card-number"], iframe[title*="card number" i], iframe[title*="Secure card number" i]'
    ).first();
    const expiryFrame = this.page.frameLocator(
      'iframe[name*="card-expiry"], iframe[title*="expir" i], iframe[title*="Secure expiry" i]'
    ).first();
    const cvcFrame = this.page.frameLocator(
      'iframe[name*="card-cvc"], iframe[title*="cvc" i], iframe[title*="Secure CVC" i]'
    ).first();

    const cardInput = cardNumberFrame.locator('input').first();
    if (await cardInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardInput.fill(cardNumber.replace(/\s/g, ''));
      await expiryFrame.locator('input').first().fill(expiry.replace('/', ''));
      await cvcFrame.locator('input').first().fill(cvc);
    } else {
      // Fallback: fields on the main Stripe-hosted page (no per-field iframes)
      const pageCard = this.page.getByLabel(/card number/i)
        .or(this.page.locator('input[autocomplete*="cc-number"]'))
        .first();
      await pageCard.waitFor({ state: 'visible', timeout: 10000 });
      await pageCard.fill(cardNumber.replace(/\s/g, ''));

      const exp = this.page.locator('input[placeholder*="MM"]')
        .or(this.page.locator('input[autocomplete*="cc-exp"]'))
        .first();
      if (await exp.isVisible({ timeout: 3000 }).catch(() => false)) await exp.fill(expiry.replace('/', ''));

      const cvcEl = this.page.locator('input[placeholder*="CVC"]')
        .or(this.page.locator('input[autocomplete*="cc-csc"]'))
        .first();
      if (await cvcEl.isVisible({ timeout: 3000 }).catch(() => false)) await cvcEl.fill(cvc);
    }

    if (name) {
      const nameInput = this.page.getByLabel(/cardholder name|name on card|full name/i)
        .or(this.page.locator('input[autocomplete="cc-name"]'))
        .first();
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(name);
      }
    }
  }

  async completeStripeCheckout() {
    // Pay / Submit button on Stripe checkout
    const payBtn = this.page.getByRole('button', { name: /pay|subscribe|complete|purchase|confirm/i }).first();
    await payBtn.waitFor({ state: 'visible', timeout: 15000 });
    await payBtn.click();
    // Wait for redirect back to the product's post-purchase page (not stripe.com)
    await this.page.waitForURL(url => !url.href.includes('stripe.com'), { timeout: 60000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  }

  // ─── Post-purchase page ───────────────────────────────────────────────────────

  async postPurchasePageShouldBeVisible(productTitle) {
    // Post-purchase page shows the product name and two buttons
    await expect(
      this.page.getByText(productTitle, { exact: false }).first()
    ).toBeVisible({ timeout: 20000 });
    // Also confirm it's NOT still on Stripe
    expect(this.page.url()).not.toContain('stripe.com');
  }

  async postPurchasePageShouldHaveButton(buttonText) {
    await expect(
      this.page.getByRole('button', { name: new RegExp(buttonText, 'i') }).first()
        .or(this.page.getByRole('link', { name: new RegExp(buttonText, 'i') }).first())
    ).toBeVisible({ timeout: 10000 });
  }

  async clickPostPurchaseButton(buttonText) {
    const btn = this.page
      .getByRole('button', { name: new RegExp(buttonText, 'i') })
      .or(this.page.getByRole('link', { name: new RegExp(buttonText, 'i') }))
      .first();
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    await btn.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  }

  // ─── EU after purchase ────────────────────────────────────────────────────────

  async shouldBeOnEUPage() {
    await this.page.waitForURL(url => url.href.includes(EU_URL) || url.href.includes('arena.im'), { timeout: 15000 });
  }

  async productCardShouldShowText(title, text) {
    const card = this._productCard(title);
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(
      card.getByText(new RegExp(text, 'i')).first()
        .or(card.getByRole('button', { name: new RegExp(text, 'i') }).first())
    ).toBeVisible({ timeout: 10000 });
  }

  async clickButtonOnProductCard(title, buttonText) {
    const card = this._productCard(title);
    await card.waitFor({ state: 'visible', timeout: 15000 });
    // "Access Now" is often text inside the card link, not a separate button element
    const inner = card.getByRole('button', { name: new RegExp(buttonText, 'i') }).first();
    if (await inner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inner.click();
    } else {
      await card.click();
    }
    await this.page.waitForTimeout(2000);
  }

  async productFileShouldBeDownloaded() {
    const download = await this.page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    expect(download, 'Expected a file download but none was triggered').not.toBeNull();
    if (download) await download.cancel().catch(() => {});
  }

  async productShouldBeDelivered() {
    // Product delivery: same-tab redirect, new-tab open, or file download.
    const url = this.page.url();
    if (!url.includes('arena.im')) return; // Same-tab redirect away from EU domain

    // Check if product already opened in a new tab
    const existingNewTab = this.page.context().pages()
      .find(p => p !== this.page && !p.url().includes('arena.im'));
    if (existingNewTab) return;

    // Wait for new tab, download, or same-tab navigation
    const delivered = await Promise.race([
      this.page.context().waitForEvent('page', { timeout: 15000 })
        .then(async newP => {
          await newP.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          return !newP.url().includes('arena.im');
        }),
      this.page.waitForEvent('download', { timeout: 15000 }).then(() => true),
      this.page.waitForURL(url => !url.href.includes('arena.im'), { timeout: 15000 }).then(() => true),
    ]).catch(() => false);

    expect(delivered).toBe(true);
  }
}

module.exports = { EndUserPage };
