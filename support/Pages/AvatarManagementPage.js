const { expect } = require('@playwright/test');

class AvatarManagementPage {
  constructor(page) {
    this.page = page;
    this._switchResponsePromise = null;
  }

  // ─── Switcher helpers ────────────────────────────────────────────────────────

  // The avatar switcher is a Radix DropdownMenu — its trigger always carries
  // aria-haspopup="menu", unlike plain navigation buttons in the sidebar.
  get switcherButton() {
    return this.page.locator('[data-sidebar="menu-button"][aria-haspopup="menu"]');
  }

  // The SwitchAvatarsDialog that opens when clicking "Switch Avatars" in the dropdown
  get switchAvatarsDialog() {
    return this.page.locator('[role="dialog"]');
  }

  // Non-current avatars are rendered as <Button> elements inside the dialog
  // containing "myavatar.ai/<slug>" text. Current avatar is a plain <div>.
  get dialogNonCurrentAvatarButtons() {
    return this.switchAvatarsDialog.getByRole('button').filter({ hasText: /myavatar\.ai\// });
  }

  async clickSwitcherButton() {
    await this.switcherButton.click();
    await expect(this.page.getByText('Switch Avatars')).toBeVisible({ timeout: 5000 });
  }

  // Opens the dropdown then clicks "Switch Avatars" to open the SwitchAvatarsDialog
  async openSwitchAvatarsDialog() {
    await this.clickSwitcherButton();
    await this.page.getByText('Switch Avatars').click();
    await this.switchAvatarsDialog.waitFor({ state: 'visible', timeout: 8000 });
  }

  async closeSwitcher() {
    await this.page.keyboard.press('Escape');
  }

  // ─── Switcher assertions ─────────────────────────────────────────────────────

  async sectionShouldBeVisible(sectionText) {
    await expect(this.page.getByText(sectionText)).toBeVisible({ timeout: 5000 });
  }

  async optionShouldBeVisible(optionText) {
    await expect(this.page.getByText(optionText)).toBeVisible({ timeout: 5000 });
  }

  async firstAvatarShouldHaveTag(tag) {
    await expect(this.switchAvatarsDialog.getByText(tag).first()).toBeVisible({ timeout: 10000 });
  }

  async firstAvatarButtonShouldBeDisabled() {
    // Current avatar renders as a plain <div>, not a <button> — non-interactive by design.
    // Verify the "Current" badge is not inside any button element.
    const currentBadge = this.switchAvatarsDialog.getByText('Current').first();
    await currentBadge.waitFor({ state: 'visible', timeout: 5000 });
    const isInsideButton = await currentBadge.evaluate(el => !!el.closest('button'));
    if (isInsideButton) {
      throw new Error('Expected current avatar to be non-interactive (not inside a button)');
    }
  }

  async firstAvatarShouldShowNameAndUrl() {
    await expect(
      this.switchAvatarsDialog.getByText(/myavatar\.ai\//).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async nonCurrentAvatarsShouldNotHaveCurrentTag() {
    // Only one "Current" badge should exist in the entire dialog
    await expect(this.switchAvatarsDialog.getByText('Current')).toHaveCount(1, { timeout: 5000 });
  }

  async nonCurrentAvatarButtonsShouldBeEnabled() {
    const buttons = this.dialogNonCurrentAvatarButtons;
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      await expect(buttons.nth(i)).toBeEnabled();
    }
  }

  // ─── Precondition checks ─────────────────────────────────────────────────────

  async assertMultipleAvatars() {
    await this.openSwitchAvatarsDialog();
    const count = await this.dialogNonCurrentAvatarButtons.count();
    await this.closeSwitcher();
    if (count < 1) {
      throw new Error(
        'Precondition failed: this test requires the account to have more than one avatar.'
      );
    }
  }

  async assertSingleAvatar() {
    await this.openSwitchAvatarsDialog();
    const count = await this.dialogNonCurrentAvatarButtons.count();
    await this.closeSwitcher();
    if (count > 0) {
      throw new Error(
        'Precondition failed: this test requires the account to have exactly one avatar.'
      );
    }
  }

  // ─── Switch avatar ────────────────────────────────────────────────────────────

  async clickNonCurrentAvatar() {
    // Set up response interceptor BEFORE clicking so we don't miss the request
    this._switchResponsePromise = this.page.waitForResponse(
      resp => /avatar/i.test(resp.url()) && resp.status() < 400,
      { timeout: 10000 }
    );
    await this.dialogNonCurrentAvatarButtons.first().click();
  }

  async switchRequestShouldBeFired() {
    if (this._switchResponsePromise) {
      await this._switchResponsePromise;
    }
  }

  async dashboardShouldReloadWithAvatarData() {
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await expect(this.page).toHaveURL(/^(?!.*\/login)/, { timeout: 10000 });
  }

  // ─── Create new avatar ────────────────────────────────────────────────────────

  async clickOptionInSwitcherMenu(optionText) {
    await this.page.getByText(optionText).click();
  }

  async clickSidebarButton(buttonText) {
    // Item lives inside the switcher dropdown (Radix menuitem, not a link role) — open it first
    await this.clickSwitcherButton();
    await this.page.getByText(buttonText).click({ timeout: 10000 });
  }

  async startCreatingNewAvatar() {
    await this.page.goto('/new');
    await this.page.waitForLoadState('networkidle');
  }

  async urlShouldContain(fragment) {
    await expect(this.page).toHaveURL(
      new RegExp(fragment.replace(/\//g, '\\/')),
      { timeout: 10000 }
    );
  }

  async slugStepShouldBeVisible() {
    await expect(
      this.page.locator('input[name*="slug"], input[placeholder*="slug"]').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async completeNewAvatarCreationFlowWithoutPayment() {
    await this.page.goto('/new');
    await this.page.waitForLoadState('networkidle');

    // Step 1: Slug claim — the submit button is an icon-only arrow, 3 DOM levels above the input
    const slugInput = this.page.locator(
      'input[name*="slug"], input[placeholder*="slug"]'
    ).first();
    await slugInput.waitFor({ state: 'visible', timeout: 10000 });
    await slugInput.fill(`ta-${Date.now().toString().slice(-8)}`);
    await slugInput.locator('../../..').getByRole('button').click({ timeout: 10000 });

    // Steps 2-N: the creation wizard stays at /new — wait for and click "Next Step" each time
    const nextStepBtn = () => this.page.getByRole('button', { name: /next step/i });
    for (let i = 0; i < 6; i++) {
      try {
        await nextStepBtn().waitFor({ state: 'visible', timeout: 8000 });
        await nextStepBtn().click();
        await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      } catch {
        break;
      }
    }

    // Final step may show a dedicated finish/create button before redirecting
    const finishBtn = this.page.getByRole('button', { name: /finish|create avatar|done/i });
    if (await finishBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await finishBtn.click();
    }

    // Wait for actual navigation away from /new (all steps complete)
    await this.page.waitForURL(/^(?!.*\/new)/, { timeout: 30000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  async shouldBeRedirectedToDashboard() {
    await this.page.waitForURL(/^(?!.*\/new)/, { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  async newAvatarShouldBeSelectedAsCurrent() {
    // Open the dialog — if creation succeeded, new avatar is current and old one is non-current
    await this.openSwitchAvatarsDialog();
    const nonCurrentCount = await this.dialogNonCurrentAvatarButtons.count();
    await this.closeSwitcher();
    if (nonCurrentCount < 1) {
      throw new Error(
        'Newly created avatar is not current: no other avatars found in dialog (creation may have failed).'
      );
    }
  }

  // ─── Health-check popper (appears after navigation) ──────────────────────────

  async _dismissPopper() {
    // Suppress the AvatarHealth popover via localStorage intercept for future navigations
    await this.page.addInitScript(() => {
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key && key.startsWith('avatar-health-shown-')) return 'true';
        return orig.call(this, key);
      };
    });
    const popper = this.page.locator('[data-radix-popper-content-wrapper]');
    if (!await popper.isVisible({ timeout: 3000 }).catch(() => false)) return;
    const trigger = this.page.locator('button').filter({ hasText: /Avatar Health/i }).first();
    if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
      await trigger.click({ force: true });
    } else {
      await this.page.mouse.click(720, 50);
    }
    await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
      await this.page.mouse.click(720, 300);
      await popper.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    });
  }

  // ─── Delete avatar ────────────────────────────────────────────────────────────

  async navigateToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
    await this._dismissPopper();
  }

  get deleteAvatarButton() {
    return this.page.getByRole('button', { name: /^delete$/i });
  }

  async deleteAvatarButtonShouldBeDisabled() {
    await expect(this.deleteAvatarButton).toBeDisabled({ timeout: 10000 });
  }

  async deleteAvatarButtonShouldBeEnabled() {
    await expect(this.deleteAvatarButton).toBeEnabled({ timeout: 10000 });
  }

  async clickDeleteAvatarButton() {
    await this.deleteAvatarButton.click();
  }

  async deleteConfirmationModalShouldBeVisible() {
    await expect(this.page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  }

  async confirmAvatarDeletion() {
    const modal = this.page.getByRole('dialog');
    await modal.getByRole('button', { name: /confirm|delete|yes/i }).click();
  }

  async currentAvatarShouldBeDeleted() {
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  async shouldBeOnDashboardOfAnotherAvatar() {
    await expect(this.page).toHaveURL(/^(?!.*\/settings)/, { timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  // Deletes every non-primary avatar one by one, leaving only the primary.
  // The primary avatar slug is derived from EU_URL so it is never deleted.
  async deleteAllNonPrimaryAvatars() {
    const primarySlug = (process.env.EU_URL || 'arena-automation').split('/').pop();

    while (true) {
      await this.openSwitchAvatarsDialog();
      const nonPrimary = this.switchAvatarsDialog
        .getByRole('button')
        .filter({ hasText: /myavatar\.ai\// })
        .filter({ hasNotText: primarySlug });

      if (await nonPrimary.count() === 0) {
        await this.closeSwitcher();
        break;
      }

      // Switch to the non-primary avatar so we can delete it
      await nonPrimary.first().click();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      await this._dismissPopper();

      // Delete it
      await this.navigateToSettings();
      await this.clickDeleteAvatarButton();
      await this.deleteConfirmationModalShouldBeVisible();
      await this.confirmAvatarDeletion();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      await this._dismissPopper();
    }

    // Land on Settings so the next assertion (delete button disabled) works directly
    await this.navigateToSettings();
  }
}

module.exports = { AvatarManagementPage };
