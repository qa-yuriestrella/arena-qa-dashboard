const { expect } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

const EU_URL = process.env.EU_URL || 'https://dev-avatar.arena.im/automation1arena';

class ChatLogPage {
  constructor(page) {
    this.page = page;
    this._prevConversationCount = 0;
    this._persistentEuContext = null;
    this._persistentEuPage = null;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
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

  async _dismissOverlays() {
    try {
      const qualityDialog = this.page.getByRole('dialog').filter({ hasText: 'Avatar Quality' });
      if (await qualityDialog.count() > 0) {
        await this.page.mouse.click(10, 10);
        await this.page.waitForTimeout(400);
      }
    } catch { }

    try {
      const btn = this.page.getByRole('button', { name: /avatar health/i });
      if (await btn.count() > 0 && (await btn.getAttribute('aria-expanded')) === 'true') {
        await btn.click();
        await this.page.waitForTimeout(400);
      }
    } catch { }
  }

  // ─── UI assertions ────────────────────────────────────────────────────────────

  async titleShouldBeVisible() {
    // SPA has an initial "Loading..." splash; allow extra time for it to clear
    await expect(this.page.getByRole('heading', { name: 'Chat Log' })).toBeVisible({ timeout: 20000 });
  }

  async refreshButtonShouldBeVisible() {
    await expect(this.page.getByRole('button', { name: 'Refresh' })).toBeVisible({ timeout: 8000 });
  }

  async searchInputShouldBeVisible() {
    await expect(this.page.locator('input[type="search"]')).toBeVisible({ timeout: 8000 });
  }

  async datePickerShouldBeVisible() {
    await expect(this.page.locator('button#date')).toBeVisible({ timeout: 8000 });
  }

  async clearFilterButtonShouldBeVisible() {
    await expect(this.page.getByRole('button', { name: 'Clear filter' })).toBeVisible({ timeout: 8000 });
  }

  // ─── Conversation list ────────────────────────────────────────────────────────

  _conversationCards() {
    // Conversation cards are <button type="button"> inside the first overflow-y-auto container.
    // The second overflow-y-auto on the page belongs to the Avatar Quality sidebar overlay.
    return this.page.locator('div[class*="overflow-y-auto"]').first().locator('button[type="button"]');
  }

  async noteConversationCount() {
    // Wait for the initial API response before noting the count so we don't
    // capture 0 while the list is still loading.
    await this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        res.url().includes('/chat-log') &&
        res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);
    await this.page.waitForTimeout(1000);
    this._prevConversationCount = await this._conversationCards().count();
  }

  async clickFirstConversation() {
    await this._conversationCards().first().click();
  }

  async messageThreadShouldBeVisible() {
    // After selecting a conversation the details panel renders a <header> with the user name
    await expect(
      this.page.locator('header[class*="px-8"]')
    ).toBeVisible({ timeout: 10000 });
  }

  async noMatchingResultsShouldBeVisible() {
    await expect(this.page.getByText('No matching results')).toBeVisible({ timeout: 8000 });
  }

  async noMatchingResultsShouldNotBeVisible() {
    await expect(this.page.getByText('No matching results')).not.toBeVisible({ timeout: 8000 });
  }

  async conversationCountShouldHaveIncreased() {
    const prev = this._prevConversationCount;
    await expect(async () => {
      const count = await this._conversationCards().count();
      expect(count).toBeGreaterThan(prev);
    }).toPass({ timeout: 15000, intervals: [1000] });
  }

  async firstConversationShouldShowAnonymous(name = 'Anonymous') {
    await expect(
      this._conversationCards().first().getByText(name, { exact: false })
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── Search ───────────────────────────────────────────────────────────────────

  async searchFor(term) {
    const input = this.page.locator('input[type="search"]');
    await input.fill(term);
    await this.page.waitForTimeout(700); // 500 ms debounce + buffer
  }

  async clearSearch() {
    await this.page.locator('input[type="search"]').clear();
    await this.page.waitForTimeout(700);
  }

  // ─── Date filter ─────────────────────────────────────────────────────────────

  async openDatePicker() {
    await this.page.locator('button#date').click();
    await this.page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first().waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  async selectDateRangeInCalendar() {
    // Click two enabled day buttons to define start and end of the range
    const days = this.page.locator('[role="gridcell"] button:not([disabled])');
    const count = await days.count();
    const endIndex = Math.min(count - 1, 9);
    await days.nth(0).click();
    await days.nth(endIndex).click();
  }

  async clickApply() {
    await this.page.getByRole('button', { name: /^apply$/i }).click();
    // Popover closes after apply
    await this.page
      .locator('[data-radix-popper-content-wrapper]')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  async dateFilterShouldBeApplied() {
    // The popover is closed and the date picker button shows the selected range
    await expect(this.page.locator('button#date')).toBeVisible({ timeout: 5000 });
    await expect(
      this.page.locator('[data-radix-popper-content-wrapper]')
    ).not.toBeVisible({ timeout: 3000 });
  }

  async clickClearFilter() {
    await this.page.getByRole('button', { name: 'Clear filter' }).click();
    await this.page.waitForTimeout(500);
  }

  async dateFilterShouldBeReset() {
    // After reset the default 30-day range is active again; the conversation list is visible.
    // Use .first() because a second overflow-y-auto belongs to the Avatar Quality overlay.
    await expect(
      this.page.locator('div[class*="overflow-y-auto"]').first()
    ).toBeVisible({ timeout: 8000 });
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────────

  async clickRefresh() {
    this._refreshResponsePromise = this.page
      .waitForResponse(
        (res) =>
          res.url().includes('/commerce-ai/') &&
          res.url().includes('/chat-log') &&
          res.status() === 200,
        { timeout: 15000 },
      )
      .catch(() => null);
    await this.page.getByRole('button', { name: 'Refresh' }).click();
  }

  async conversationListShouldReload() {
    await this._refreshResponsePromise;
    await expect(this.page.getByRole('button', { name: 'Refresh' })).toBeEnabled({ timeout: 10000 });
  }

  // ─── Cross-app helpers ────────────────────────────────────────────────────────

  _euInputSelector() {
    return (
      'form:has(button[aria-label="Send message"]) input[type="text"],' +
      'form:has(button[aria-label="Send message"]) textarea'
    );
  }

  _euMessageResponseMatcher(res) {
    return (
      (res.url().includes('send-message') || res.url().includes('/message')) &&
      res.status() === 200
    );
  }

  // Opens the EU chat in `page`, waits for the Avatar welcome response, and
  // returns the message input locator ready to type.
  async _openEuChatAndWaitForWelcome(page) {
    await page.goto(EU_URL);
    await page.waitForLoadState('domcontentloaded');
    // Classic: "Text"; Modern: "Chat"
    await page.getByRole('button', { name: /^(chat|text)$/i }).click();

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

  // Sends one message in `page` (after welcome already resolved) and waits
  // for the Avatar's response before returning.
  async _sendEuMessage(page, input, message) {
    const responseP = page.waitForResponse(
      res => this._euMessageResponseMatcher(res),
      { timeout: 30000 }
    ).catch(() => null);
    await input.fill(message);
    await input.press('Enter');
    await responseP;
    await page.waitForTimeout(500);
  }

  // ─── Polling: waits up to timeoutMs (default 60s) checking every intervalMs ──

  async waitForNewConversation({ timeoutMs = 60000, intervalMs = 5000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(intervalMs);
      await this.clickRefresh();
      await (this._refreshResponsePromise?.catch(() => null));
      await this.page.waitForTimeout(1000);
      // The freshly-created conversation card carries "A few seconds ago" as its
      // recency label. Click it as soon as it appears so downstream assertions
      // can validate the already-open detail panel without an extra click.
      const recentCard = this._conversationCards().filter({
        hasText: /(seconds|minutes?) ago|just now/i,
      });
      if (await recentCard.count() > 0) {
        // Set up the detail-load listener before clicking so we never miss it.
        const detailLoadedP = this.page.waitForResponse(
          (res) => res.url().includes('/commerce-ai/') && res.status() === 200,
          { timeout: 15000 },
        ).catch(() => null);
        await recentCard.first().click();
        await this.messageThreadShouldBeVisible();
        await detailLoadedP; // wait for conversation data before returning
        return;
      }
    }
    throw new Error(`No new conversation appeared after ${timeoutMs / 1000}s`);
  }

  // ─── Seed: ensure at least one conversation exists before tests run ──────────

  async seedIfEmpty(browser) {
    // Wait for the conversation list API to respond before checking the count
    await this.page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        res.url().includes('/chat-log') &&
        res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);
    await this.page.waitForTimeout(500);

    const count = await this._conversationCards().count();
    if (count > 0) return;

    // Empty state — open EU in a fresh context and send one message
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const input = await this._openEuChatAndWaitForWelcome(page);
      await this._sendEuMessage(page, input, 'Seed message for chat log tests');
    } finally {
      await context.close();
    }

    // Poll the dashboard until the seeded conversation appears
    await expect(async () => {
      await this.clickRefresh();
      await (this._refreshResponsePromise?.catch(() => null));
      await this.page.waitForTimeout(500);
      expect(await this._conversationCards().count()).toBeGreaterThan(0);
    }).toPass({ timeout: 60000, intervals: [5000] });
  }

  // ─── CL007: anonymous single message ─────────────────────────────────────────

  async sendMessageFromEndUser(browser) {
    this._lastSentMessage = 'Automated chat log test';
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const input = await this._openEuChatAndWaitForWelcome(page);
      await this._sendEuMessage(page, input, this._lastSentMessage);
    } finally {
      await context.close();
    }
  }

  async sentMessageShouldBeVisibleInConversationDetail() {
    if (!this._lastSentMessage) throw new Error('No sent message recorded');
    // Conversation is already open — waitForNewConversation clicked it.
    await expect(
      this.page.getByText(this._lastSentMessage, { exact: false })
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── CL008: multi-turn dialogue ───────────────────────────────────────────────

  async conductDialogueFromEndUser(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    this._dialogueMessages = [];
    try {
      const input = await this._openEuChatAndWaitForWelcome(page);
      for (const message of ['Hello, who are you?', 'What topics can you help me with?']) {
        await this._sendEuMessage(page, input, message);
        this._dialogueMessages.push(message);
      }
    } finally {
      await context.close();
    }
  }

  async dialogueMessagesShouldAppearInChatLog() {
    if (!this._dialogueMessages?.length) throw new Error('No dialogue messages recorded');
    // Conversation is already open — waitForNewConversation clicked it.
    for (const message of this._dialogueMessages) {
      await expect(
        this.page.getByText(message, { exact: false })
      ).toBeVisible({ timeout: 10000 });
    }
  }

  // ─── CL009: logged-in user display name ──────────────────────────────────────

  async sendMessageFromLoggedInEuUser(browser) {
    const { EndUserPage } = require('./EndUserPage');
    // Fresh account each run — avoids exhausting the free-plan message quota
    // that would happen if we always reused a single fixed account.
    const displayName = `CLTest${Date.now()}`;
    this._loggedInUserMessage = 'Chat log test from logged-in user';
    this._loggedInUserName = displayName;

    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const euPage = new EndUserPage(page);
      await euPage.visit();
      await euPage.clickProfileButton();
      await euPage.selectEmailSignup();

      const frame = page.frameLocator('iframe').first();
      const email = `cltest${Date.now()}@yopmail.com`;
      await frame.getByLabel(/email address/i).fill(email);
      await frame.getByLabel(/^password\*/i).fill('Test@1234Aa!');
      await frame.getByLabel(/confirm password/i).fill('Test@1234Aa!');
      await frame.getByRole('button', { name: /create account/i }).click();

      // Fill the display name step that appears after account creation.
      const nameInput = frame.getByPlaceholder(/display name|your name|input your name/i);
      await nameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      if (await nameInput.isVisible()) {
        await nameInput.fill(displayName);
        const saveBtn = frame.getByRole('button', { name: /^save$/i });
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await saveBtn.isVisible()) await saveBtn.click();
      }

      await expect(frame.getByRole('dialog')).not.toBeVisible({ timeout: 20000 });

      const input = await this._openEuChatAndWaitForWelcome(page);
      await this._sendEuMessage(page, input, this._loggedInUserMessage);
    } finally {
      await context.close();
    }
  }

  async loggedInUserNameShouldBeVisible() {
    if (!this._loggedInUserName) throw new Error('No logged-in user name recorded');
    // Conversation is already open — waitForNewConversation clicked it.
    // The detail header must show the user's display name (not "Anonymous").
    await expect(
      this.page.locator('header[class*="px-8"]').getByText(this._loggedInUserName, { exact: false })
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── CL010: anonymous → signup, name updates ─────────────────────────────────

  async sendAnonymousMessageFromEU(browser) {
    const displayName = `ChatBot${Date.now()}`;
    this._signedUpUserName = displayName;
    // Keep the context open so the same browser session is reused for signup
    this._persistentEuContext = await browser.newContext();
    this._persistentEuPage = await this._persistentEuContext.newPage();

    const input = await this._openEuChatAndWaitForWelcome(this._persistentEuPage);
    await this._sendEuMessage(this._persistentEuPage, input, 'Chat log test: anonymous to named user');
    await this._persistentEuPage.waitForTimeout(1000);
  }

  async signUpAndSendFollowUpInEU() {
    const page = this._persistentEuPage;
    const displayName = this._signedUpUserName;
    try {
      // Log in within the same session so the anonymous user gets merged
      await page.getByRole('button', { name: /^login$/i }).last().click();
      const frame = page.frameLocator('iframe').first();
      await expect(frame.getByRole('dialog')).toBeVisible({ timeout: 15000 });
      await frame.getByRole('menuitem', { name: /continue with email/i }).click();

      const email = `chattest${Date.now()}@yopmail.com`;
      await frame.getByLabel(/email address/i).fill(email);
      await frame.getByLabel(/^password\*/i).fill('Test@1234Aa!');
      await frame.getByLabel(/confirm password/i).fill('Test@1234Aa!');
      await frame.getByRole('button', { name: /create account/i }).click();

      const nameInput = frame.getByPlaceholder(/display name|your name|input your name/i);
      await nameInput.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
      if (await nameInput.isVisible()) {
        await nameInput.fill(displayName);
        const saveBtn = frame.getByRole('button', { name: /^save$/i });
        await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await saveBtn.isVisible()) await saveBtn.click();
      }

      await expect(frame.getByRole('dialog')).not.toBeVisible({ timeout: 20000 });

      // The display name only propagates after the now-logged-in user sends a message.
      // Click the send button explicitly — pressing Enter on a textarea adds a newline.
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

  async signedUpUserNameShouldBeVisible() {
    if (!this._signedUpUserName) throw new Error('No signed-up user name recorded');
    // Extra refresh — name-update propagation may lag behind conversation creation.
    // Re-click the first card (our session) after the refresh so the header
    // reflects the updated display name.
    await this.clickRefresh();
    await (this._refreshResponsePromise?.catch(() => null));
    await this.page.waitForTimeout(1000);
    await this._conversationCards().first().click();
    await this.messageThreadShouldBeVisible();
    // The header must now show the signed-up display name, not "Anonymous".
    await expect(
      this.page.locator('header[class*="px-8"]').getByText(this._signedUpUserName, { exact: false })
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── CL011: welcome-only session must NOT be stored ───────────────────────────

  async openEndUserChatWithoutSendingMessage(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await this._openEuChatAndWaitForWelcome(page);
      // Capture the avatar's welcome text so we can identify the conversation later.
      const welcomeEl = page
        .locator('[role="log"] p, [class*="message"] p, [class*="chat"] p')
        .first();
      this._euWelcomeText = await welcomeEl
        .textContent({ timeout: 5000 })
        .then((t) => t?.trim().slice(0, 60))
        .catch(() => null);
      await page.waitForTimeout(3000);
    } finally {
      await context.close();
    }
  }

  async welcomeOnlySessionShouldNotHaveUserMessages(seconds) {
    const intervalMs = 5000;
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      await this.page.waitForTimeout(intervalMs);
      await this.clickRefresh();
      await (this._refreshResponsePromise?.catch(() => null));
      await this.page.waitForTimeout(500);

      const recentCard = this._conversationCards().filter({
        hasText: /(seconds|minutes?) ago|just now/i,
      });
      if (await recentCard.count() === 0) continue;

      // Open the conversation and check whether its content matches the welcome
      // message captured from the EU session. Only fail if it is our session —
      // another user could have created a conversation at the same time.
      const detailLoadedP = this.page.waitForResponse(
        (res) => res.url().includes('/commerce-ai/') && res.status() === 200,
        { timeout: 15000 },
      ).catch(() => null);
      await recentCard.first().click();
      await this.messageThreadShouldBeVisible();
      await detailLoadedP;

      throw new Error(
        'Welcome-only session should not be stored in the chat log, ' +
        'but a recent conversation appeared after opening chat without sending a message'
      );
    }
    // No recent conversation appeared within the deadline — correct behaviour.
  }
}

module.exports = { ChatLogPage };
