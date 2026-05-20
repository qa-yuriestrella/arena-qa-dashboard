const { expect } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

class SettingsMembershipPage {
  constructor(page) {
    this.page = page;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);

    // Membership is the 3rd button (index 2) in the settings sidebar nav
    await this.page.locator('nav button').nth(2).click();
    await this.page.waitForTimeout(500);

    // Pricing tab is active by default; wait for the panel
    await this.page.locator('#pricing').waitFor({ state: 'visible', timeout: 8000 });
  }

  // ─── Tab navigation ──────────────────────────────────────────────────────────

  async pricingTabShouldBeActive() {
    await expect(
      this.page.locator('[id$="-trigger-pricing"]')
    ).toHaveAttribute('data-state', 'active', { timeout: 8000 });
  }

  async switchToBenefitsTab() {
    await this.page.locator('[id$="-trigger-benefits"]').click();
    await this.page.locator('#benefits').waitFor({ state: 'visible', timeout: 8000 });
  }

  // ─── Pricing tab ─────────────────────────────────────────────────────────────

  async currencyShouldShowUSDAndPrice499() {
    // #currency is the (disabled) currency combobox — always shows USD
    await expect(this.page.locator('#currency')).toContainText('USD', { timeout: 5000 });
    // #price is the (disabled) price input — always shows $4.99
    await expect(this.page.locator('#price')).toHaveValue(/4\.99/, { timeout: 5000 });
  }

  // ─── Benefits tab ────────────────────────────────────────────────────────────

  async benefitsListShouldContainItems() {
    // Benefit items are bordered cards within the #benefits panel
    const items = this.page.locator('#benefits .border.border-slate-200.rounded-lg');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  }

  // ─── Warning banner (requires unconnected Stripe — pending backend support) ──

  async paymentProviderWarningShouldBeVisibleWithSetupButton() {
    const panel = await this._getActivePanel();
    // Red warning box with alert icon
    await expect(panel.locator('.bg-red-50')).toBeVisible({ timeout: 8000 });
    // Setup / Configurar button inside the warning
    await expect(
      panel.locator('button', { hasText: /configurar|setup/i })
    ).toBeVisible({ timeout: 5000 });
  }

  async clickSetupButton() {
    const panel = await this._getActivePanel();
    await panel.locator('button', { hasText: /configurar|setup/i }).click();
    await this.page.waitForTimeout(1000);
  }

  async shouldBeOnPaymentsPage() {
    await expect(
      this.page.locator('h3', { hasText: 'Stripe' })
    ).toBeVisible({ timeout: 8000 });
  }

  async _getActivePanel() {
    const pricingState = await this.page.locator('[id$="-trigger-pricing"]').getAttribute('data-state');
    return pricingState === 'active'
      ? this.page.locator('#pricing')
      : this.page.locator('#benefits');
  }
}

module.exports = { SettingsMembershipPage };
