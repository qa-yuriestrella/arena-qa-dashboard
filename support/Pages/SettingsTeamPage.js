const { expect } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

class SettingsTeamPage {
  constructor(page) {
    this.page = page;
    this._deletedMemberEmail = null;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);

    // Team/Equipe is the 2nd button in the settings sidebar nav
    await this.page.locator('main aside nav button').nth(1).click();
    await this.page.waitForTimeout(500);

    // Members tab is active by default; wait for it to be visible
    await this.page.locator('#members').waitFor({ state: 'visible', timeout: 8000 });
    await this._dismissOverlays();
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

  // ─── UI assertions ────────────────────────────────────────────────────────────

  async teamMembersTabShouldBeActive() {
    await expect(
      this.page.locator('[id$="-trigger-members"]')
    ).toHaveAttribute('data-state', 'active', { timeout: 8000 });
  }

  async memberListShouldBeVisible() {
    await expect(this.page.locator('#members table')).toBeVisible({ timeout: 10000 });
  }

  async inviteMembersButtonShouldBeVisible() {
    // "Convidar Membros" button lives on the Invites tab — navigate there to assert
    await this.page.locator('[id$="-trigger-invites"]').click();
    await this.page.locator('#invites').waitFor({ state: 'visible', timeout: 5000 });
    await expect(
      this.page.locator('#invites button.bg-slate-900')
    ).toBeVisible({ timeout: 5000 });
    // Return to members tab
    await this.page.locator('[id$="-trigger-members"]').click();
    await this.page.locator('#members').waitFor({ state: 'visible', timeout: 5000 });
  }

  // ─── Role change ─────────────────────────────────────────────────────────────

  // Maps English test role name → 0-based index in the role dropdown
  // Dropdown order: 0 = Administrador (Admin), 1 = Membro (Member)
  _roleIndex(role) {
    return role.toLowerCase() === 'admin' ? 0 : 1;
  }

  _nonOwnerRow() {
    // Non-owner rows have a non-disabled role combobox
    return this.page.locator('#members tbody tr:has([role="combobox"]:not([disabled]))').first();
  }

  async changeFirstNonOwnerMemberRole(role) {
    await this._dismissOverlays();
    const row = this._nonOwnerRow();
    await row.locator('[role="combobox"]').click();
    await this.page.waitForTimeout(300);
    await this.page.locator('[role="option"]').nth(this._roleIndex(role)).click();
    await this.page.waitForTimeout(1000);
  }

  async firstNonOwnerMemberShouldDisplayRole(role) {
    await this._dismissOverlays();
    const row = this._nonOwnerRow();
    await row.locator('[role="combobox"]').click();
    await this.page.waitForTimeout(300);
    await expect(
      this.page.locator('[role="option"]').nth(this._roleIndex(role))
    ).toHaveAttribute('data-state', 'checked', { timeout: 5000 });
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  // ─── Delete member ────────────────────────────────────────────────────────────

  async deleteLastMemberViaActionsMenu() {
    const rows = this.page.locator('#members tbody tr');
    const count = await rows.count();
    if (count === 0) throw new Error('No members in the team list');

    const lastRow = rows.nth(count - 1);

    // Save the email for the assertion
    this._deletedMemberEmail = (await lastRow.locator('td').first().innerText()).trim();

    // Open 3-dot menu
    await lastRow.locator('button[aria-haspopup="menu"]').click();
    await this.page.waitForTimeout(400);

    // Click the menu item (Excluir)
    await this.page.locator('[role="menuitem"]').first().click();
    await this.page.waitForTimeout(500);

    // Confirm in the alert dialog — destructive button has bg-destructive class
    await this.page.locator('[role="dialog"]:not([data-side]) button.bg-destructive').click();
    await this.page.waitForTimeout(2000);
  }

  async deletedMemberShouldNotAppear() {
    if (this._deletedMemberEmail) {
      await expect(
        this.page.locator('#members tbody').getByText(this._deletedMemberEmail, { exact: true })
      ).not.toBeVisible({ timeout: 8000 });
    }
  }
}

module.exports = { SettingsTeamPage };
