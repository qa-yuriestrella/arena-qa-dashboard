const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { completeGoogleOAuth } = require('../helpers/oauthHelper');

const EU_URL        = process.env.EU_URL        || 'https://dev-avatar.arena.im/automation1arena';
const MODERN_EU_URL = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';

class EndUserPage {
  constructor(page, euUrl = null) {
    this.page = page;
    this._euUrl = euUrl || EU_URL;
    this._sessionRequestPromise = null;
    this._messageRequestPromise = null;
    this._callRequestPromise = null;
  }

  async visit() {
    const response = await this.page.goto(this._euUrl, { timeout: 30000 });
    if (response && response.status() === 404) {
      throw new Error(`End-user page returned 404 – avatar may not exist at ${this._euUrl}`);
    }
    await this.page.waitForLoadState('load', { timeout: 30000 });
  }

  // ─── Entry points ─────────────────────────────────────────────────────────────

  async clickProfileButton() {
    // Classic EU: auth dialog loads inside an iframe. Wait for it to be present in the
    // DOM before clicking so the component is initialised.
    // Modern EU: no iframe — skip the wait immediately.
    // Use a plain CSS locator (not frameLocator) to avoid CDP polling interference.
    const hasIframe = await this.page.locator('iframe').first()
      .waitFor({ state: 'attached', timeout: 5000 })
      .then(() => true).catch(() => false);
    if (hasIframe) {
      await this._authFrame().getByRole('dialog')
        .waitFor({ state: 'attached', timeout: 5000 })
        .catch(() => {});
    }
    // Classic: button name "Login"; Modern: aria-label "Log in" (with space).
    await this.page.getByRole('button', { name: /^log\s*in$/i }).first().click();
  }

  async clickSubscribeButton() {
    // Use anchored pattern so "Unsubscribe" (starts with "Un") does not match.
    await this.page.getByRole('button', { name: /^subscribe/i }).click();
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

    // Classic: "Text"; Modern: aria-label "Chat with avatar"
    await this.page.getByRole('button', { name: /^(chat with avatar|chat|text)$/i }).click();
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
    // Classic: "Call"; Modern: aria-label "Start voice with avatar"
    await this.page.getByRole('button', { name: /^(start voice with avatar|voice|call)$/i }).click();
  }

  async clickProfileIconInsideChat() {
    // The chat widget has its own login button (second ac-profile-dropdown-web-component).
    // Classic: "Login"; Modern: "Log in" (with space).
    await this.page.getByRole('button', { name: /^log\s*in$/i }).last().click();
  }

  // ─── Auth modal ───────────────────────────────────────────────────────────────

  // Auth modal renders inside an iframe (Classic EU) or directly in the page (Modern EU).
  _authFrame() {
    return this.page.frameLocator('iframe').first();
  }

  // Detect Modern EU by checking the CURRENT browser URL (reliable even when endUserPage
  // fixture is reused across both avatars on the same page object).
  _isModernEU() {
    const modernSlug = MODERN_EU_URL.split('/').pop(); // 'automation2arena'
    return this.page.url().includes(modernSlug);
  }

  // Returns a locator pointing at the open dialog — works in both implementations.
  async _authDialogLocator() {
    const iframeDialog = this._authFrame().getByRole('dialog');
    const inIframe = await iframeDialog.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    return inIframe ? iframeDialog : this.page.getByRole('dialog');
  }

  async authModalShouldBeVisible() {
    if (this._isModernEU()) {
      // Modern EU: auth dialog has aria-label "Welcome back". The chat panel also renders
      // as role="dialog" (aria-label "Chat"), so target the auth dialog specifically to
      // avoid Playwright strict-mode violation when both are present.
      await expect(
        this.page.getByRole('dialog', { name: /welcome back/i })
      ).toBeVisible({ timeout: 20000 });
    } else {
      // Classic EU: auth modal may render as a page-level dialog "Create your account"
      // or inside an iframe (backend feature flag). Accept either form.
      const pageModal  = this.page.getByRole('dialog', { name: /create your account/i });
      const iframeMenu = this._authFrame().getByRole('menuitem').first();
      const found = await Promise.race([
        pageModal.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
        iframeMenu.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false),
      ]);
      if (!found) throw new Error('Auth modal not visible (neither page-level dialog nor iframe content found)');
    }
  }

  async authModalShouldShowAllOptions() {
    if (this._isModernEU()) {
      // Modern EU: buttons inside the auth dialog (aria-label "Welcome back").
      // Target by name to avoid strict-mode violation if chat panel (role=dialog) is also open.
      const dlg = this.page.getByRole('dialog', { name: /welcome back/i });
      await expect(dlg.getByRole('button', { name: /continue with google/i })).toBeVisible({ timeout: 5000 });
      await expect(dlg.getByRole('button', { name: /continue with facebook/i })).toBeVisible({ timeout: 5000 });
      await expect(dlg.getByRole('button', { name: /continue with x/i })).toBeVisible({ timeout: 5000 });
      await expect(dlg.getByRole('button', { name: /continue with email/i })).toBeVisible({ timeout: 5000 });
    } else {
      // Classic EU: options may be in the page-level dialog ("Sign up with …")
      // or as menuitems inside an iframe ("Continue with …"). Check whichever is visible.
      const isPageModal = await this.page.getByRole('dialog', { name: /create your account/i })
        .isVisible().catch(() => false);
      if (isPageModal) {
        const dlg = this.page.getByRole('dialog', { name: /create your account/i });
        await expect(dlg.getByRole('button', { name: /sign up with google/i })).toBeVisible({ timeout: 5000 });
        await expect(dlg.getByRole('button', { name: /sign up with facebook/i })).toBeVisible({ timeout: 5000 });
        await expect(dlg.getByRole('button', { name: /sign up with x/i })).toBeVisible({ timeout: 5000 });
        await expect(dlg.getByRole('button', { name: /sign up with email/i })).toBeVisible({ timeout: 5000 });
      } else {
        const iframeDialog = this._authFrame().getByRole('dialog');
        await expect(iframeDialog.getByRole('menuitem', { name: /continue with google/i })).toBeVisible({ timeout: 5000 });
        await expect(iframeDialog.getByRole('menuitem', { name: /continue with facebook/i })).toBeVisible({ timeout: 5000 });
        await expect(iframeDialog.getByRole('menuitem', { name: /continue with x/i })).toBeVisible({ timeout: 5000 });
        await expect(iframeDialog.getByRole('menuitem', { name: /continue with email/i })).toBeVisible({ timeout: 5000 });
      }
    }
  }

  // ─── Email signup ─────────────────────────────────────────────────────────────

  async selectEmailSignup() {
    if (this._isModernEU()) {
      // Modern EU: two-step path to the email signup form.
      // Step 1 — "Welcome back" → "New here? Create an account"
      const createAccountBtn = this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('button', { name: /create an account/i });
      if (await createAccountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createAccountBtn.click();
      }
      // Step 2 — "Create your account" → "Sign up with email"
      await this.page.getByRole('dialog', { name: /create your account/i })
        .getByRole('button', { name: /sign up with email/i })
        .click({ timeout: 10000 });
    } else {
      // Classic: menuitem "Continue with email" inside the iframe dialog.
      await this._authFrame().getByRole('menuitem', { name: /continue with email/i }).click();
    }
  }

  async fillSignupFormWithNewUser() {
    const email = faker.internet.email({ provider: 'yopmail.com' });
    const password = `Test@${faker.number.int({ min: 1000, max: 9999 })}Aa!`;
    if (this._isModernEU()) {
      // Modern EU: "Create your account" dialog — labels "EMAIL", "PASSWORD", "CONFIRM PASSWORD"
      const dlg = this.page.getByRole('dialog', { name: /create your account/i });
      await dlg.getByLabel(/^email$/i).fill(email);
      await dlg.getByLabel(/^password$/i).fill(password);
      await dlg.getByLabel(/confirm password/i).fill(password);
    } else {
      const frame = this._authFrame();
      // Classic EU labels: "Email address*", "Password*", "Confirm password"
      await frame.getByLabel(/email address/i).fill(email);
      await frame.getByLabel(/^password\*/i).fill(password);
      await frame.getByLabel(/confirm password/i).fill(password);
    }
  }

  async clickCreateAccount() {
    if (this._isModernEU()) {
      await this.page.getByRole('dialog', { name: /create your account/i })
        .getByRole('button', { name: /^create account$/i }).click();
    } else {
      await this._authFrame().getByRole('button', { name: /create account/i }).click();
    }
  }

  async fillDisplayName() {
    // Classic: display name input is inside the auth iframe.
    const iframeInput = this._authFrame().getByPlaceholder(/display name|your name|input your name/i);
    const inIframe = await iframeInput.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (inIframe) {
      await iframeInput.fill(faker.person.firstName());
      return;
    }
    // Modern EU: display name input may appear in the page-level dialog after account creation.
    const pageInput = this.page.getByPlaceholder(/display name|your name|input your name/i);
    const inPage = await pageInput.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (inPage) {
      await pageInput.fill(faker.person.firstName());
    }
  }

  async clickSave() {
    // Classic: Save button is inside the auth iframe.
    const iframeBtn = this._authFrame().getByRole('button', { name: /^save$/i });
    const inIframe = await iframeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (inIframe) {
      await iframeBtn.click();
      return;
    }
    // Modern EU: Save button may appear in the page-level dialog.
    const pageBtn = this.page.getByRole('button', { name: /^save$/i });
    const inPage = await pageBtn.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
    if (inPage) {
      await pageBtn.click();
    }
  }

  // ─── Password toggles ─────────────────────────────────────────────────────────
  // Toggle buttons are named "Show password" (masked) or "Hide password" (revealed).
  // Checking button text is robust: toggling changes the input type between
  // "password" and "text", making input-type counts unreliable.

  async _inIframeAuth() {
    return this._authFrame().getByRole('button', { name: /show password|hide password/i }).first()
      .waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  }

  async passwordFieldShouldBeHidden() {
    if (await this._inIframeAuth()) {
      await expect(this._authFrame().getByRole('button', { name: /^show password$/i }).first()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.page.getByRole('button', { name: /^show password$/i }).first()).toBeVisible({ timeout: 5000 });
    }
  }

  async passwordFieldShouldBeVisible() {
    if (await this._inIframeAuth()) {
      await expect(this._authFrame().getByRole('button', { name: /^hide password$/i }).first()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.page.getByRole('button', { name: /^hide password$/i }).first()).toBeVisible({ timeout: 5000 });
    }
  }

  async clickPasswordToggle() {
    if (await this._inIframeAuth()) {
      await this._authFrame().getByRole('button', { name: /show password|hide password/i }).first().click();
    } else {
      await this.page.getByRole('button', { name: /show password|hide password/i }).first().click();
    }
  }

  async confirmPasswordFieldShouldBeHidden() {
    if (await this._inIframeAuth()) {
      await expect(this._authFrame().getByRole('button', { name: /^show password$/i }).last()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.page.getByRole('button', { name: /^show password$/i }).last()).toBeVisible({ timeout: 5000 });
    }
  }

  async confirmPasswordFieldShouldBeVisible() {
    if (await this._inIframeAuth()) {
      await expect(this._authFrame().getByRole('button', { name: /^hide password$/i }).last()).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.page.getByRole('button', { name: /^hide password$/i }).last()).toBeVisible({ timeout: 5000 });
    }
  }

  async clickConfirmPasswordToggle() {
    if (await this._inIframeAuth()) {
      await this._authFrame().getByRole('button', { name: /show password|hide password/i }).last().click();
    } else {
      await this.page.getByRole('button', { name: /show password|hide password/i }).last().click();
    }
  }

  // ─── Sign in ──────────────────────────────────────────────────────────────────

  async clickSignInLink() {
    if (this._isModernEU()) {
      // Modern EU: navigate from the signup form to a fresh sign-in form.
      // Rather than back-navigating through React dialogs (which leaves stale state that
      // prevents the email field from accepting input), close the current dialog and open
      // a new "Welcome back" sign-in flow directly.
      // Close the current auth dialog via the "Close" button.
      const closeBtn = this.page.locator('[role="dialog"] button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click();
        await this.page.waitForTimeout(500);
      }
      // Reopen auth dialog
      await this.page.getByRole('button', { name: /^log\s*in$/i }).first().click();
      await this.page.waitForTimeout(500);
      // Click "Continue with email" to reach the sign-in email form
      await this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('button', { name: /continue with email/i }).click();
      // Wait for the sign-in form's email input to be ready
      await this.page.locator('[role="dialog"][aria-label="Welcome back"] input[name="email"]')
        .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    } else {
      await this._authFrame().getByRole('link', { name: /sign in now/i }).click();
    }
  }

  async fillSigninEmail(email) {
    if (this._isModernEU()) {
      await this.page.locator('[role="dialog"][aria-label="Welcome back"] input[name="email"]')
        .fill(email);
    } else {
      await this._authFrame().getByPlaceholder(/email/i).fill(email);
    }
  }

  async fillSigninPassword(password) {
    if (this._isModernEU()) {
      // "Welcome back" sign-in form has exactly one password field (no confirm password)
      await this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('textbox', { name: /^password$/i }).fill(password);
    } else {
      await this._authFrame().getByPlaceholder(/password/i).fill(password);
    }
  }

  async clickSignIn() {
    if (this._isModernEU()) {
      await this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('button', { name: /^sign in$/i }).click();
    } else {
      await this._authFrame().getByRole('button', { name: /^login$/i }).click();
    }
  }

  // ─── Social login ─────────────────────────────────────────────────────────────

  async loginWithGoogle() {
    const popupPromise = this.page.waitForEvent('popup');
    if (this._isModernEU()) {
      await this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('button', { name: /continue with google/i }).click();
    } else {
      await this._authFrame().getByRole('menuitem', { name: /continue with google/i }).click();
    }
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
    if (this._isModernEU()) {
      // Modern EU: auth dialog is page-level (no iframe). The auth dialog ("Create your account"
      // for signup, "Welcome back" for sign-in) should close after successful login.
      await expect(
        this.page.getByRole('dialog', { name: /create your account|welcome back/i })
      ).not.toBeVisible({ timeout: 20000 });
    } else {
      // Classic EU: the iframe auth component does NOT reliably close its <dialog> element
      // after login (a persistent <dialog open> may remain in the DOM). Instead, verify
      // login by checking the page-level "Log in" button is replaced (i.e., no longer visible).
      await expect(
        this.page.getByRole('button', { name: /^log\s*in$/i }).first()
      ).not.toBeVisible({ timeout: 20000 });
    }
  }

  // ─── Voice call button visibility ────────────────────────────────────────────

  // Selector for the home-page call button.
  // Classic EU: aria-label "Call". Modern EU: aria-label "Start voice with avatar" (pill button).
  // Note: Modern EU also has a persistent "Start voice call" FAB (52px circle) that is always
  // rendered in the chat UI regardless of skill state — that is NOT the skill-controlled button.
  _homeVoiceCallButton() {
    if (this._isModernEU()) {
      return this.page.locator('button[aria-label="Start voice with avatar"]').first();
    }
    return this.page.getByRole('button', { name: /^(start voice with avatar|voice|call)$/i }).first();
  }

  // Selector for the in-chat voice call icon.
  // Modern EU: The skill-controlled button is "Start voice with avatar" (pill shape).
  //   There is also a "Start voice call" FAB — used only in the "not visible" assertion
  //   (voiceCallIconInChatShouldNotBeVisible) to catch cases where the FAB leaks through.
  // Classic EU: "Start call" button in the chat widget header.
  _inChatVoiceCallIcon() {
    if (this._isModernEU()) {
      return this.page.locator('button[aria-label="Start voice with avatar"]').first();
    }
    return this.page.locator(
      'button[aria-label="Start call"],' +
      'button[aria-label="Start voice call"],' +
      'button[aria-label*="voice call" i],' +
      'button[aria-label*="phone" i]'
    ).first();
  }

  async voiceCallButtonOnHomeShouldBeVisible() {
    const timeout = this._isModernEU() ? 15000 : 8000;
    const btn = this._homeVoiceCallButton();
    const found = await btn.isVisible({ timeout }).catch(() => false);
    if (!found && this._isModernEU()) {
      // Modern EU may serve a cached skill state on first load. Reload to get fresh data.
      await this.page.reload({ waitUntil: 'load' });
      await expect(this._homeVoiceCallButton()).toBeVisible({ timeout: 20000 });
    } else {
      await expect(btn).toBeVisible({ timeout });
    }
  }

  async voiceCallButtonOnHomeShouldNotBeVisible() {
    await expect(this._homeVoiceCallButton()).not.toBeVisible({ timeout: 5000 });
  }

  async voiceCallIconInChatShouldBeVisible() {
    await expect(this._inChatVoiceCallIcon()).toBeVisible({ timeout: 8000 });
  }

  async voiceCallIconInChatShouldNotBeVisible() {
    await expect(this._inChatVoiceCallIcon()).not.toBeVisible({ timeout: 5000 });
    if (this._isModernEU()) {
      // The "Start voice call" FAB must also be absent when the skill is disabled.
      await expect(
        this.page.locator('button[aria-label="Start voice call"]').first()
      ).not.toBeVisible({ timeout: 5000 });
    }
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

  // ─── Modern hero video ────────────────────────────────────────────────────────

  async videoHeroShouldBeVisible() {
    await expect(this.page.locator('video')).toBeVisible({ timeout: 10000 });
  }

  async videoHeroShouldNotBeVisible() {
    await expect(this.page.locator('video')).not.toBeVisible({ timeout: 5000 });
  }

  async clickVideoHeroPlayButton() {
    await this.page.getByRole('button', { name: /play video/i }).first().click();
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
    await this.page.waitForURL(url => url.href.includes(this._euUrl) || url.href.includes('arena.im'), { timeout: 15000 });
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

  // ─── User Profile Management ──────────────────────────────────────────────────

  async loginWithCredentials(email, password) {
    await this.clickProfileButton();
    if (this._isModernEU()) {
      // Modern EU: go directly to email sign-in without the signup detour
      const emailBtn = this.page.getByRole('dialog', { name: /welcome back/i })
        .getByRole('button', { name: /continue with email/i });
      await emailBtn.waitFor({ state: 'visible', timeout: 8000 });
      await emailBtn.click();
      await this.page.locator('[role="dialog"][aria-label="Welcome back"] input[name="email"]')
        .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await this.fillSigninEmail(email);
      await this.fillSigninPassword(password);
      await this.clickSignIn();
    } else {
      // Classic EU: go through signup flow → sign-in link
      await this.selectEmailSignup();
      await this.clickSignInLink();
      await this.fillSigninEmail(email);
      await this.fillSigninPassword(password);
      await this.clickSignIn();
    }
    await this.shouldBeLoggedIn();
  }

  async openProfileMenu() {
    // After login the "Log in" button is replaced by a profile/avatar menu trigger.
    // Try selectors from most to least specific.
    const candidates = [
      'button[aria-label*="open profile" i]',
      'button[aria-label*="profile menu" i]',
      'button[aria-label*="user menu" i]',
      'button[aria-label*="account" i]:not([aria-label*="create" i])',
      '[class*="profile-dropdown"] > button',
      '[class*="profileDropdown"] > button',
      '[class*="user-menu"] > button',
      '[class*="userMenu"] > button',
      'button[class*="avatar"]',
      'button[class*="profile-btn"]',
      'button[class*="profileBtn"]',
      // Buttons containing an avatar element (image or initials placeholder)
      'button:has([class*="avatar"]):not([aria-label*="chat" i]):not([aria-label*="voice" i]):not([aria-label*="subscribe" i])',
      // Header buttons with an img that are not action buttons
      'header button:has(img):not([aria-label*="chat" i]):not([aria-label*="voice" i]):not([aria-label*="play" i]):not([aria-label*="subscribe" i])',
      '[class*="header"] button:has(img):not([aria-label*="chat" i]):not([aria-label*="voice" i]):not([aria-label*="play" i])',
    ];

    for (const sel of candidates) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        return;
      }
    }

    throw new Error('Profile menu button not found after login — selectors may need updating for the current DOM');
  }

  async clickMyProfile() {
    // Classic EU: profile dropdown shows "My Profile"
    await this.page.getByRole('menuitem', { name: /my profile/i })
      .or(this.page.getByRole('link', { name: /my profile/i }))
      .or(this.page.getByRole('button', { name: /my profile/i }))
      .first()
      .click({ timeout: 5000 });
  }

  async clickViewProfile() {
    // Modern EU: profile dropdown shows "View Profile"
    await this.page.getByRole('menuitem', { name: /view profile/i })
      .or(this.page.getByRole('link', { name: /view profile/i }))
      .or(this.page.getByRole('button', { name: /view profile/i }))
      .first()
      .click({ timeout: 5000 });
  }

  async clickEditProfileButton() {
    // Classic EU: "My Profile" shows an Edit button that opens the editable form/modal
    await this.page.getByRole('button', { name: /^edit$/i })
      .or(this.page.getByRole('button', { name: /edit profile/i }))
      .first()
      .click({ timeout: 5000 });
  }

  async selectProfileTab(tabName) {
    // Profile modal/view has tabs: Profile, Settings, Subscription
    const tab = this.page.getByRole('tab', { name: new RegExp(`^${tabName}$`, 'i') })
      .or(this.page.locator('[class*="tab"], [class*="Tab"]')
        .filter({ hasText: new RegExp(`^${tabName}$`, 'i') }))
      .first();
    await tab.waitFor({ state: 'visible', timeout: 5000 });
    await tab.click();
  }

  async updateDisplayName(name) {
    const input = this.page.getByLabel(/display name/i)
      .or(this.page.getByPlaceholder(/display name/i))
      .or(this.page.locator('input[name*="displayName"], input[name*="display_name"]'))
      .first();
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.click({ clickCount: 3 });
    await input.pressSequentially(name, { delay: 50 });
  }

  async updateBio(text) {
    const bioField = this.page.getByLabel(/^bio$/i)
      .or(this.page.getByPlaceholder(/bio|about yourself|tell us about/i))
      .or(this.page.locator('textarea[name*="bio"], textarea[placeholder*="bio" i]'))
      .or(this.page.locator('textarea').first())
      .first();
    await bioField.waitFor({ state: 'visible', timeout: 5000 });
    await bioField.click({ clickCount: 3 });
    await bioField.pressSequentially(text, { delay: 30 });
  }

  async fillBioWithNCharacters(n) {
    await this.updateBio('A'.repeat(n));
    // Allow time for maxLength enforcement or character counter to update
    await this.page.waitForTimeout(500);
  }

  async saveProfile() {
    const saveBtn = this.page.getByRole('button', { name: /^save$|save changes/i })
      .or(this.page.getByRole('button', { name: /^update$/i }))
      .first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    if (!await saveBtn.isDisabled()) {
      await saveBtn.click({ timeout: 5000 });
      await this.page.waitForTimeout(1500);
    }
    // If Save is disabled the profile already holds the desired values — no action needed
  }

  async profileDisplayNameShouldBe(name) {
    await expect(
      this.page.getByText(name, { exact: false })
        .or(this.page.getByRole('button', { name: new RegExp(name, 'i') }))
        .or(this.page.getByRole('heading', { name: new RegExp(name, 'i') }))
        .first()
    ).toBeVisible({ timeout: 10000 });
  }

  async bioValueShouldNotExceed(maxLength) {
    const bioField = this.page.getByLabel(/^bio$/i)
      .or(this.page.getByPlaceholder(/bio|about yourself|tell us about/i))
      .or(this.page.locator('textarea[name*="bio"], textarea[placeholder*="bio" i]'))
      .or(this.page.locator('textarea').first())
      .first();
    const value = await bioField.inputValue();
    expect(
      value.length,
      `Bio has ${value.length} characters — expected at most ${maxLength}`
    ).toBeLessThanOrEqual(maxLength);
  }

  async clickShareProfileButton() {
    // Grant clipboard permission so the copy-to-clipboard action can succeed
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const named = this.page.getByRole('button', { name: /share.*profile|copy.*link/i }).first();
    if (await named.isVisible({ timeout: 2000 }).catch(() => false)) {
      await named.click();
      return;
    }
    // Icon-only share button is the only unnamed button following "Edit" in the same container
    const editBtn = this.page.getByRole('button', { name: /^edit$|edit profile/i }).first();
    await editBtn.locator('xpath=following-sibling::button').first().click({ timeout: 5000 });
  }

  async copiedNotificationShouldBeVisible() {
    await expect(
      this.page.getByText(/copied/i)
        .or(this.page.locator('[role="alert"]').filter({ hasText: /copied/i }))
        .or(this.page.locator('[class*="toast"], [class*="notification"], [class*="snack"], [class*="Tooltip"], [class*="tooltip"]')
          .filter({ hasText: /copied/i }))
        .or(this.page.locator('[class*="copy"], [class*="Copy"]').filter({ hasText: /copied/i }))
        .first()
    ).toBeVisible({ timeout: 8000 });
  }

  async createAvatarLinkShouldHaveCorrectUTMParams() {
    // Scope to dialog to avoid matching watermark links in the page body
    const dialog = this.page.getByRole('dialog').last();
    const link = dialog.locator('a[href*="utm_medium=profilemodal"]').first();
    await expect(link).toBeVisible({ timeout: 5000 });
    const href = await link.getAttribute('href');
    expect(href, 'Link missing utm_source=myavatar').toContain('utm_source=myavatar');
    expect(href, 'Link missing utm_medium=profilemodal').toContain('utm_medium=profilemodal');
    expect(href, 'Link missing utm_content=avatarchat').toContain('utm_content=avatarchat');
  }

  async changePasswordOptionShouldBeVisible() {
    // Button label is "Change" (not "Change Password") next to the Password section
    await expect(
      this.page.getByRole('button', { name: /^change$|change password/i }).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickChangePassword() {
    await this.page.getByRole('button', { name: /^change$|change password/i })
      .first()
      .click({ timeout: 5000 });
  }

  async changePasswordFormShouldBeVisible() {
    await expect(
      this.page.getByLabel(/current password|old password/i)
        .or(this.page.getByLabel(/new password/i))
        .or(this.page.getByPlaceholder(/current password|old password|new password/i))
        .first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickLogOutFromMenu() {
    await this.page.getByRole('menuitem', { name: /log out|logout|sign out/i })
      .or(this.page.getByRole('button', { name: /log out|logout|sign out/i }))
      .or(this.page.getByRole('link', { name: /log out|logout|sign out/i }))
      .first()
      .click({ timeout: 5000 });
  }

  async shouldBeLoggedOut() {
    // After logout, the "Log in" button reappears in place of the profile button
    await expect(
      this.page.getByRole('button', { name: /^log\s*in$/i }).first()
    ).toBeVisible({ timeout: 15000 });
  }
}

module.exports = { EndUserPage };
