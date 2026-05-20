const { expect, test } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

// Matches the Stripe connect modal only (excludes Radix side-panel popovers)
const MODAL = '[role="dialog"]:not([data-side])';

class SettingsPaymentsPage {
  constructor(page) {
    this.page = page;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);

    // Payments is the 4th button (index 3) in the settings sidebar nav
    await this.page.locator('nav button').nth(3).click();
    await this.page.waitForTimeout(1000);
  }

  // ─── State helpers ────────────────────────────────────────────────────────────

  async isStripeConnected() {
    return (await this.page.locator('button', { hasText: /gerenciar|manage/i }).count()) > 0;
  }

  async visitAndSkipIfNotConnected() {
    await this.visit();
    const connected = await this.isStripeConnected();
    if (!connected) {
      test.skip(true, 'Stripe is not yet connected — run the connect flow first');
    }
  }

  async visitAndSkipIfConnected() {
    await this.visit();
    const connected = await this.isStripeConnected();
    if (connected) {
      test.skip(true, 'Stripe is already connected — this scenario requires a fresh unconnected account');
    }
  }

  // ─── Stripe card ─────────────────────────────────────────────────────────────

  async stripeCardShouldBeVisible() {
    await expect(
      this.page.locator('h3', { hasText: 'Stripe' })
    ).toBeVisible({ timeout: 8000 });
  }

  async stripeCardShouldShowConnectButton() {
    await expect(
      this.page.locator('button', { hasText: /^conectar$|^connect$/i })
    ).toBeVisible({ timeout: 8000 });
  }

  async stripeCardShouldShowConnectedBadge() {
    // Green "Conectado" / "Connected" badge on the Stripe card
    await expect(
      this.page.locator('span', { hasText: /conectado|connected/i })
    ).toBeVisible({ timeout: 8000 });
  }

  async stripeCardShouldShowManageButton() {
    await expect(
      this.page.locator('button', { hasText: /gerenciar|manage/i })
    ).toBeVisible({ timeout: 8000 });
  }

  // ─── Connect flow (pending backend reset API) ─────────────────────────────────

  async clickStripeConnectButton() {
    await this.page.locator('button', { hasText: /^conectar$|^connect$/i }).click();
    await this.page.waitForTimeout(500);
  }

  async stripeConnectModalShouldBeVisible() {
    await expect(this.page.locator(MODAL)).toBeVisible({ timeout: 8000 });
  }

  async stripeConnectModalTitleShouldBe(title) {
    await expect(
      this.page.locator(MODAL + ' h2')
    ).toContainText(title, { timeout: 5000 });
  }

  async stripeConnectModalShouldHaveCancelAndConnectButtons() {
    await expect(
      this.page.locator(MODAL).locator('button', { hasText: /cancelar|cancel/i })
    ).toBeVisible({ timeout: 5000 });
    await expect(
      this.page.locator(MODAL).locator('button', { hasText: /^conectar$|^connect$/i })
    ).toBeVisible({ timeout: 5000 });
  }

  async cancelStripeConnectModal() {
    await this.page.locator(MODAL).locator('button', { hasText: /cancelar|cancel/i }).click();
    await this.page.waitForTimeout(500);
  }

  async stripeConnectModalShouldBeClosed() {
    await expect(this.page.locator(MODAL)).not.toBeVisible({ timeout: 5000 });
  }

  async confirmConnectionInsideModal() {
    await this.page.locator(MODAL).locator('button', { hasText: /^conectar$|^connect$/i }).click();
    await this.page.waitForURL(/stripe\.com/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);
  }

  async shouldBeOnStripeOnboardingPage() {
    await expect(this.page).toHaveURL(/stripe\.com/, { timeout: 5000 });
    await expect(
      this.page.getByText(/Avatar End Users sandbox/i)
    ).toBeVisible({ timeout: 10000 });
  }

  async returnFromStripeToSettings() {
    await this.page.getByText(/Voltar para Avatar End Users sandbox/i)
      .waitFor({ state: 'visible', timeout: 10000 });
    await this.page.getByText(/Voltar para Avatar End Users sandbox/i).click();
    await this.page.waitForURL(/stg-dash-avatar\.arena\.im/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1500);

    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(800);
    await this.page.locator('nav button').nth(3).click();
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { SettingsPaymentsPage };
