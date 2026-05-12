const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { completeGoogleOAuth } = require('../helpers/oauthHelper');

const EU_URL = process.env.EU_URL || 'https://dev-avatar.arena.im/arena-automation';

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
      { timeout: 15000 }
    );
    this._messageRequestPromise = this.page.waitForRequest(
      req => req.url().includes('send-message') || (req.url().includes('/message') && req.method() === 'POST'),
      { timeout: 15000 }
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
    // Set up call request tracking before clicking — the request fires after login completes,
    // so we need the listener in place early.
    this._callRequestPromise = this.page.waitForRequest(
      req => /call|voice-call|start-call/i.test(req.url()) && req.method() === 'POST',
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
}

module.exports = { EndUserPage };
