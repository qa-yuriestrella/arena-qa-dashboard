const { expect } = require('@playwright/test');
const { ChatLogPage } = require('./ChatLogPage');
const { ensureModernAvatar } = require('../helpers/avatarHelper');

const MODERN_EU_URL = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';

class ModernChatLogPage extends ChatLogPage {
  // ─── Navigation ──────────────────────────────────────────────────────────────

  async visit() {
    await ensureModernAvatar(this.page);
    await this.page.goto('/chat-log');
    await this.page.waitForLoadState('load');

    await this.page.addLocatorHandler(
      this.page.getByRole('dialog').filter({ hasText: 'Avatar Quality' }),
      async () => {
        await this.page.mouse.click(10, 10);
        await this.page.waitForTimeout(300);
      }
    );

    await this._dismissOverlays();
  }

  // ─── EU helpers (Modern EU URL + button selector) ────────────────────────────

  async _openEuChatAndWaitForWelcome(page) {
    await page.goto(MODERN_EU_URL);
    await page.waitForLoadState('domcontentloaded');
    // Modern EU: aria-label "Chat with avatar" (not "Text")
    await page.getByRole('button', { name: /^(chat with avatar|chat)$/i }).click();

    const welcomeP = page.waitForResponse(
      res => this._euMessageResponseMatcher(res),
      { timeout: 30000 }
    ).catch(() => null);

    const input = page.locator(this._euInputSelector()).first();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await welcomeP;
    await page.waitForTimeout(500);
    return input;
  }

  // ─── CL009M: logged-in user — Modern EU page-level auth (no iframe) ──────────

  async sendMessageFromLoggedInEuUser(browser) {
    const { EndUserPage } = require('./EndUserPage');
    const displayName = `CLTest${Date.now()}`;
    this._loggedInUserMessage = 'Modern EU chat log test from logged-in user';
    this._loggedInUserName = displayName;

    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const euPage = new EndUserPage(page, MODERN_EU_URL);
      await euPage.visit();
      await euPage.clickProfileButton();
      await euPage.selectEmailSignup();

      const dlg = page.getByRole('dialog', { name: /create your account/i });
      const email = `cltest${Date.now()}@yopmail.com`;
      await dlg.getByLabel(/^email$/i).fill(email);
      await dlg.getByLabel(/^password$/i).fill('Test@1234Aa!');
      await dlg.getByLabel(/confirm password/i).fill('Test@1234Aa!');
      await dlg.getByRole('button', { name: /^create account$/i }).click();

      const nameInput = page.getByPlaceholder(/display name|your name|input your name/i);
      await nameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      if (await nameInput.isVisible()) {
        await nameInput.fill(displayName);
        const saveBtn = page.getByRole('button', { name: /^save$/i });
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await saveBtn.isVisible()) await saveBtn.click();
      }

      await expect(
        page.getByRole('dialog', { name: /create your account|welcome back/i })
      ).not.toBeVisible({ timeout: 20000 });

      const input = await this._openEuChatAndWaitForWelcome(page);
      await this._sendEuMessage(page, input, this._loggedInUserMessage);
    } finally {
      await context.close();
    }
  }

  // ─── CL010M: anonymous → signup — Modern EU page-level auth ──────────────────

  async sendAnonymousMessageFromEU(browser) {
    const displayName = `ChatBot${Date.now()}`;
    this._signedUpUserName = displayName;
    this._persistentEuContext = await browser.newContext();
    this._persistentEuPage = await this._persistentEuContext.newPage();

    const input = await this._openEuChatAndWaitForWelcome(this._persistentEuPage);
    await this._sendEuMessage(this._persistentEuPage, input, 'Modern EU chat log test: anonymous to named user');
    await this._persistentEuPage.waitForTimeout(1000);
  }

  async signUpAndSendFollowUpInEU() {
    const page = this._persistentEuPage;
    const displayName = this._signedUpUserName;
    try {
      // Modern EU: page-level "Log in" button (no iframe)
      await page.getByRole('button', { name: /^log\s*in$/i }).last().click();
      const dlg = page.getByRole('dialog', { name: /welcome back/i });
      await expect(dlg).toBeVisible({ timeout: 15000 });

      // Navigate from "Welcome back" to the email signup form
      const createAccountBtn = dlg.getByRole('button', { name: /create an account/i });
      if (await createAccountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createAccountBtn.click();
      }
      await page.getByRole('dialog', { name: /create your account/i })
        .getByRole('button', { name: /sign up with email/i })
        .click({ timeout: 10000 });

      const email = `chattest${Date.now()}@yopmail.com`;
      const signupDlg = page.getByRole('dialog', { name: /create your account/i });
      await signupDlg.getByLabel(/^email$/i).fill(email);
      await signupDlg.getByLabel(/^password$/i).fill('Test@1234Aa!');
      await signupDlg.getByLabel(/confirm password/i).fill('Test@1234Aa!');
      await signupDlg.getByRole('button', { name: /^create account$/i }).click();

      const nameInput = page.getByPlaceholder(/display name|your name|input your name/i);
      await nameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      if (await nameInput.isVisible()) {
        await nameInput.fill(displayName);
        const saveBtn = page.getByRole('button', { name: /^save$/i });
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await saveBtn.isVisible()) await saveBtn.click();
      }

      await expect(
        page.getByRole('dialog', { name: /create your account|welcome back/i })
      ).not.toBeVisible({ timeout: 20000 });

      const loggedInInput = page.locator(this._euInputSelector()).first();
      await loggedInInput.waitFor({ state: 'visible', timeout: 10000 });
      await loggedInInput.fill('Post-signup message to update display name');
      const sendBtn = page.locator('button[aria-label="Send message"]');
      await sendBtn.waitFor({ state: 'visible', timeout: 5000 });
      await sendBtn.click();
      await page.waitForTimeout(1500);
    } finally {
      await this._persistentEuContext.close();
      this._persistentEuContext = null;
      this._persistentEuPage = null;
    }
  }
}

module.exports = { ModernChatLogPage };
