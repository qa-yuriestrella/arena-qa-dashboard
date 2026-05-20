const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');
const { getLatestArenaInviteUrl } = require('../helpers/gmailHelper');

const COUNTER_PATH = path.resolve(__dirname, '../fixtures/invite-counter.json');

function readCounter() {
  return JSON.parse(fs.readFileSync(COUNTER_PATH, 'utf8')).lastUsed;
}

function incrementCounter() {
  const data = JSON.parse(fs.readFileSync(COUNTER_PATH, 'utf8'));
  data.lastUsed += 1;
  fs.writeFileSync(COUNTER_PATH, JSON.stringify(data, null, 2));
  return data.lastUsed;
}

// Matches the invite modal only — excludes Radix side-panel popovers (data-side attribute)
const MODAL = '[role="dialog"]:not([data-side])';

class SettingsInvitePage {
  constructor(page) {
    this.page = page;
    this._inviteUrl = null;
    this._invitePage = null;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(800);

    // Navigate to Team section (2nd button in settings sidebar)
    await this.page.locator('main aside nav button').nth(1).click();
    await this.page.waitForTimeout(300);

    // Dismiss any overlay (Health Check modal, etc.) that may block the tab click
    await this._dismissOverlays();

    // Click the Invites tab
    await this.page.locator('[id$="-trigger-invites"]').click();
    await this.page.locator('#invites').waitFor({ state: 'visible', timeout: 8000 });
  }

  async _dismissOverlays() {
    try {
      const qualityDialog = this.page.getByRole('dialog').filter({ hasText: 'Avatar Quality' });
      if (await qualityDialog.count() > 0) {
        await this.page.mouse.click(10, 10);
        await this.page.waitForTimeout(300);
      }
    } catch {}
    try {
      const btn = this.page.getByRole('button', { name: /avatar health/i });
      if (await btn.count() > 0 && (await btn.getAttribute('aria-expanded')) === 'true') {
        await btn.click();
        await this.page.waitForTimeout(300);
      }
    } catch {}
    // Close any Radix side-panel popover that may still be open
    try {
      if (await this.page.locator('[role="dialog"][data-side]').count() > 0) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
      }
    } catch {}
  }

  // ─── Cleanup: cancel all pending invites ─────────────────────────────────────

  async _removeAllNonOwnerMembers() {
    try {
      await this.page.locator('#members').waitFor({ state: 'visible', timeout: 5000 });
      // Non-owner rows have a non-disabled role combobox; owner row is disabled
      for (let i = 0; i < 20; i++) {
        const nonOwnerRows = this.page.locator('#members tbody tr:has([role="combobox"]:not([disabled]))');
        const count = await nonOwnerRows.count();
        if (count === 0) break;

        await nonOwnerRows.first().locator('button[aria-haspopup="menu"]').click();
        await this.page.waitForTimeout(400);
        await this.page.locator('[role="menuitem"]').first().click();
        await this.page.waitForTimeout(500);
        await this.page.locator('[role="dialog"]:not([data-side]) button.bg-destructive')
          .waitFor({ state: 'visible', timeout: 5000 });
        await this.page.locator('[role="dialog"]:not([data-side]) button.bg-destructive').click();
        await this.page.waitForFunction(
          (n) => document.querySelectorAll('#members tbody tr:has([role="combobox"]:not([disabled]))').length < n,
          count,
          { timeout: 10000 }
        ).catch(() => {});
      }
    } catch {}
  }

  async cancelAllPendingInvites() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);
    await this.page.locator('main aside nav button').nth(1).click();
    await this.page.waitForTimeout(500);

    // Remove all non-owner members accumulated from previous test runs before switching to Invites tab
    await this._removeAllNonOwnerMembers();
    // Dismiss any lingering Radix popovers left by the member-delete actions before switching tabs
    await this._dismissOverlays();

    await this.page.locator('[id$="-trigger-invites"]').click();
    await this.page.locator('#invites').waitFor({ state: 'visible', timeout: 8000 });
    await this._dismissOverlays();
    await this.page.waitForTimeout(800); // extra settle time for tab content

    // Remove rows one by one until the table is empty.
    // Each row has a 3-dot menu (aria-haspopup="menu") with: Resend | Copy link | Delete
    for (let i = 0; i < 30; i++) {
      // Close any lingering menus/dialogs from previous iterations
      try { await this.page.keyboard.press('Escape'); } catch {}
      await this.page.waitForTimeout(500); // let table stabilize between iterations

      const rows = this.page.locator('#invites table tbody tr');
      const countBefore = await rows.count();
      if (countBefore === 0) break;

      // Open the 3-dot menu on the first row
      const menuBtn = rows.first().locator('button[aria-haspopup="menu"]');
      if (await menuBtn.count() === 0) break;
      await menuBtn.click();

      // Wait for menu, then click Delete (always the last item)
      const menuItems = this.page.locator('[role="menuitem"]');
      await menuItems.last().waitFor({ state: 'visible', timeout: 5000 });
      await menuItems.last().click();
      await this.page.waitForTimeout(600); // allow confirmation dialog to animate in

      // Click the destructive confirm button — wait up to 10s for it to appear
      await this.page.locator('button.bg-destructive')
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => this.page.locator('button.bg-destructive').click())
        .catch(() => {}); // no confirmation dialog is also fine

      // Wait until the row count actually decreases before the next iteration
      await this.page.waitForFunction(
        (n) => document.querySelectorAll('#invites table tbody tr').length < n,
        countBefore,
        { timeout: 10000 }
      ).catch(() => {}); // if it didn't decrease, continue anyway to avoid infinite loop
    }
  }

  // ─── Invite modal ─────────────────────────────────────────────────────────────

  async clickInviteMembersButton() {
    await this._dismissOverlays();
    await this.page.locator('#invites button.bg-slate-900').click();
    await this.page.waitForTimeout(300);
  }

  async inviteModalShouldBeVisible() {
    await expect(this.page.locator(MODAL)).toBeVisible({ timeout: 8000 });
  }

  async emailInputShouldBeVisible() {
    await expect(this.page.locator('#invite-email-input')).toBeVisible({ timeout: 5000 });
  }

  async roleSelectorShouldBeVisible() {
    await expect(
      this.page.locator(`${MODAL} [role="combobox"]`)
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Email list management ───────────────────────────────────────────────────

  async typeEmailAndPressEnter(email) {
    this._lastInvitedEmail = email;
    await this.page.locator('#invite-email-input').fill(email);
    await this.page.locator('#invite-email-input').press('Enter');
    await this.page.waitForTimeout(300);
  }

  async inviteListShouldContain(count) {
    await expect(
      this.page.locator(`${MODAL} .max-h-64 > div`)
    ).toHaveCount(count, { timeout: 5000 });
  }

  async removeFirstEntryFromInviteList() {
    await this.page.locator(`${MODAL} .max-h-64 > div`).first()
      .locator('button').click();
    await this.page.waitForTimeout(300);
  }

  async closeInviteModal() {
    await this.page.locator(`${MODAL} button.absolute.right-4`).click();
    await this.page.waitForTimeout(300);
  }

  async inviteModalShouldNotBeVisible() {
    await expect(this.page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
  }

  // ─── Send invite ─────────────────────────────────────────────────────────────

  async typeExistingInviteEmailAndPressEnter() {
    // automation.arena1+2@gmail.com already has a myAvatar account
    await this.typeEmailAndPressEnter('automation.arena1+2@gmail.com');
  }

  async typeNextNewInviteEmailAndPressEnter() {
    const n = incrementCounter();
    await this.typeEmailAndPressEnter(`automation.arena1+${n}@gmail.com`);
  }

  async selectRole(role) {
    // Dropdown order: 0 = Administrador (Admin), 1 = Membro (Member)
    const roleIndex = role.toLowerCase() === 'admin' ? 0 : 1;
    await this.page.locator(`${MODAL} [role="combobox"]`).click();
    await this.page.waitForTimeout(200);
    await this.page.locator('[role="option"]').nth(roleIndex).click();
    await this.page.waitForTimeout(200);
  }

  async clickInviteNow() {
    this._inviteSentAt = new Date();
    await this.page.locator(`${MODAL} .flex.justify-end button`).click();
    await this.page.waitForTimeout(2000);
  }

  async inviteConfirmationShouldBeShown() {
    // After sending: modal closes on success
    await expect(this.page.locator(MODAL)).not.toBeVisible({ timeout: 10000 });
  }

  // ─── Gmail: find invite and navigate ─────────────────────────────────────────

  async openGmailAndFindLatestArenaInviteEmail() {
    this._inviteUrl = await getLatestArenaInviteUrl(this._inviteSentAt);
  }

  async clickInviteLinkFromEmail() {
    if (!this._inviteUrl) throw new Error('No invite URL captured from Gmail');
    // Open in a clean context so the owner session does not interfere
    const inviteContext = await this.page.context().browser().newContext();
    this._invitePage = await inviteContext.newPage();
    await this._invitePage.goto(this._inviteUrl);
    await this._invitePage.waitForLoadState('load');
    await this._invitePage.waitForTimeout(1500);
  }

  // ─── Acceptance: existing account ────────────────────────────────────────────

  async invitePageShouldShowEmailPrefilledWithoutNameField() {
    const p = this._invitePage;
    await expect(p.locator('input[type="email"]').first()).toBeVisible({ timeout: 10000 });
    await expect(p.locator('input[name="name"]')).not.toBeVisible({ timeout: 3000 });
  }

  async fillInvitePasswordAndSubmit() {
    const p = this._invitePage;
    await p.locator('input[type="password"]').first().fill(process.env.TEST_USER_PASSWORD || '');
    await p.locator('button[type="submit"]').click();
    await p.waitForLoadState('load');
    await p.waitForTimeout(2000);
  }

  // ─── Acceptance: new account ──────────────────────────────────────────────────

  async invitePageShouldShowNameFieldForNewAccountSignup() {
    const p = this._invitePage;
    await expect(p.locator('input[name="name"]').first()).toBeVisible({ timeout: 10000 });
    await expect(p.locator('input[type="password"]').first()).toBeVisible({ timeout: 5000 });
  }

  async fillInviteNamePasswordAndSubmit() {
    const p = this._invitePage;
    await p.locator('input[name="name"]').first().fill('Automation Test User');
    await p.locator('input[type="password"]').first().fill(process.env.TEST_USER_PASSWORD || '');
    await p.locator('button[type="submit"]').click();
    await p.waitForLoadState('load');
    await p.waitForTimeout(2000);
  }

  // ─── Invite row actions (Resend / Copy link / Delete) ────────────────────────

  async resendFirstPendingInvite() {
    this._inviteSentAt = new Date();
    const rows = this.page.locator('#invites table tbody tr');
    await rows.first().locator('button[aria-haspopup="menu"]').click();
    const menuItems = this.page.locator('[role="menuitem"]');
    await menuItems.first().waitFor({ state: 'visible', timeout: 5000 });
    await menuItems.first().click();
    await this.page.waitForTimeout(1000);
  }

  async copyLinkOfFirstPendingInvite() {
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    const rows = this.page.locator('#invites table tbody tr');
    await rows.first().locator('button[aria-haspopup="menu"]').click();
    const menuItems = this.page.locator('[role="menuitem"]');
    await menuItems.nth(1).waitFor({ state: 'visible', timeout: 5000 });
    await menuItems.nth(1).click();
    await this.page.waitForTimeout(500);
    this._inviteUrl = await this.page.evaluate(() => navigator.clipboard.readText());
  }

  async deleteFirstPendingInvite() {
    const rows = this.page.locator('#invites table tbody tr');
    await rows.first().locator('button[aria-haspopup="menu"]').click();
    const menuItems = this.page.locator('[role="menuitem"]');
    await menuItems.last().waitFor({ state: 'visible', timeout: 5000 });
    await menuItems.last().click();
    await this.page.locator('button.bg-destructive')
      .waitFor({ state: 'visible', timeout: 5000 });
    await this.page.locator('button.bg-destructive').click();
    await this.page.waitForTimeout(2000);
  }

  async openCopiedInviteLink() {
    if (!this._inviteUrl) throw new Error('No invite URL captured from clipboard');
    // The clipboard URL may point to a different environment (e.g. develop preview).
    // Extract only the /invite/TOKEN path and navigate using the configured BASE_URL.
    const invitePath = this._inviteUrl.match(/(\/invite\/[^\s"'<>?#]+)/)?.[1];
    if (!invitePath) throw new Error(`No /invite/ path found in clipboard URL: ${this._inviteUrl}`);
    const baseUrl = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
    const targetUrl = baseUrl + invitePath;
    const inviteContext = await this.page.context().browser().newContext();
    this._invitePage = await inviteContext.newPage();
    await this._invitePage.goto(targetUrl);
    await this._invitePage.waitForLoadState('load');
    await this._invitePage.waitForTimeout(1500);
  }

  async closeInviteContext() {
    if (this._invitePage) {
      await this._invitePage.context().close();
      this._invitePage = null;
    }
  }

  async inviteLinkShouldBeInvalid() {
    const p = this._invitePage;
    // Backend shows "Invitation not found" page — no invite form inputs should be visible
    await expect(p.locator('input[type="email"]').first()).not.toBeVisible({ timeout: 10000 });
    await p.context().close();
    this._invitePage = null;
  }

  // ─── Post-acceptance ──────────────────────────────────────────────────────────

  async inviteAcceptanceShouldRedirectToDashboard() {
    const p = this._invitePage;
    await expect(p).toHaveURL(/stg-dash-avatar\.arena\.im(?!.*\/invite\/)/, { timeout: 20000 });
    // Verify the app shell loaded: the Settings link is always in the sidebar when authenticated
    await expect(p.locator('a[href="/settings"]')).toBeVisible({ timeout: 15000 });
    await p.context().close();
    this._invitePage = null;
  }

  async invitedUserShouldAppearInTeamMembers() {
    if (!this._lastInvitedEmail) throw new Error('No invited email tracked');
    // Reload settings to get the latest team state
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(800);
    await this.page.locator('main aside nav button').nth(1).click();
    await this.page.waitForTimeout(300);

    // Members tab is active by default — wait for it
    await this.page.locator('#members').waitFor({ state: 'visible', timeout: 8000 });
    await expect(
      this.page.locator('#members tbody td').filter({ hasText: this._lastInvitedEmail })
    ).toBeVisible({ timeout: 10000 });

    // Verify the email is no longer in the Invites tab
    await this._dismissOverlays();
    await this.page.locator('[id$="-trigger-invites"]').click();
    await this.page.locator('#invites').waitFor({ state: 'visible', timeout: 8000 });
    await expect(
      this.page.locator('#invites table tbody td').filter({ hasText: this._lastInvitedEmail })
    ).not.toBeVisible({ timeout: 5000 });
  }
}

module.exports = { SettingsInvitePage };
