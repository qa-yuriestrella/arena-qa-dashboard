const { expect, test } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

const MODAL = '[role="dialog"]:not([data-side])';
const ALERT_MODAL = '[role="alertdialog"]';

class SettingsBillingPage {
  constructor(page) {
    this.page = page;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/settings');
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(1000);

    // Billing is the 5th button (index 4) in the settings sidebar nav
    await this.page.locator('nav button').nth(4).click();
    await this.page.waitForTimeout(1000);

    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 8000 });
  }

  async visitAndSkipUnlessPlan(planName) {
    await this.visit();
    const current = await this.getCurrentPlanName();
    if (current.toLowerCase() !== planName.toLowerCase()) {
      test.skip(true, `Test requires ${planName} plan but account is on "${current}"`);
    }
  }

  async visitAndSkipUnlessPlanAndNoPending(planName) {
    await this.visit();
    const current = await this.getCurrentPlanName();
    if (current.toLowerCase() !== planName.toLowerCase()) {
      test.skip(true, `Test requires ${planName} plan but account is on "${current}"`);
    }
    const hasDowngrade = await this.page.locator('#plans button', { hasText: 'Cancel downgrade' }).isVisible().catch(() => false);
    const hasCancellation = await this.page.locator('#plans button', { hasText: 'Keep my plan' }).isVisible().catch(() => false);
    if (hasDowngrade || hasCancellation) {
      test.skip(true, `Test requires no pending changes but account has a scheduled change`);
    }
  }

  async visitAndSkipUnlessScheduledDowngrade() {
    await this.visit();
    const hasDowngrade = await this.page.locator('#plans button', { hasText: 'Cancel downgrade' }).isVisible().catch(() => false);
    if (!hasDowngrade) {
      test.skip(true, 'Test requires a scheduled downgrade — run BIL003 first');
    }
  }

  async visitAndSkipUnlessScheduledCancellation() {
    await this.visit();
    const hasCancellation = await this.page.locator('#plans button', { hasText: 'Keep my plan' }).isVisible().catch(() => false);
    if (!hasCancellation) {
      test.skip(true, 'Test requires a scheduled cancellation — run BIL005 first');
    }
  }

  async visitAndSkipUnlessActiveNoPending() {
    await this.visit();
    const hasDowngrade = await this.page.locator('#plans button', { hasText: 'Cancel downgrade' }).isVisible().catch(() => false);
    const hasCancellation = await this.page.locator('#plans button', { hasText: 'Keep my plan' }).isVisible().catch(() => false);
    if (hasDowngrade || hasCancellation) {
      test.skip(true, 'Test requires no pending changes but account has a scheduled change');
    }
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────────

  async _reloadBilling() {
    await this.page.goto('/settings', { waitUntil: 'load' });
    await this.page.waitForTimeout(1000);
    await this.page.locator('nav button').nth(4).click();
    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 8000 });
    await this.page.waitForTimeout(500);
  }

  // ─── Plans & Usage helpers ─────────────────────────────────────────────────

  async getCurrentPlanName() {
    const planEl = this.page.locator('#plans span.font-semibold').first();
    return (await planEl.innerText({ timeout: 5000 })).trim();
  }

  async _planCard(planName) {
    // Each plan card is a div with class "rounded-md" that contains an h2 with the plan name
    return this.page.locator(`h2:has-text("${planName}")`).locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]');
  }

  // ─── Plans & Usage – assertions ───────────────────────────────────────────────

  async plansUsageTabShouldBeActive() {
    await expect(
      this.page.locator('[id$="-trigger-plans"]')
    ).toHaveAttribute('data-state', 'active', { timeout: 8000 });
  }

  async planInformationShouldBeVisible() {
    await expect(
      this.page.locator('#plans h2', { hasText: 'Plan Information' })
    ).toBeVisible({ timeout: 8000 });
  }

  async nextRenewalShouldBeVisible() {
    await expect(
      this.page.locator('#plans span', { hasText: 'Next Renewal' })
    ).toBeVisible({ timeout: 5000 });
  }

  async currentPlanLabelShouldBeVisible() {
    await expect(
      this.page.locator('#plans span', { hasText: 'Current Plan' })
    ).toBeVisible({ timeout: 5000 });
  }

  async quotaLimitsShouldBeVisible() {
    await expect(
      this.page.locator('#plans', { hasText: 'Quota Limits' })
    ).toBeVisible({ timeout: 5000 });
  }

  async usageSectionShouldBeVisible() {
    // "Usage" label appears twice (Quota Limits label says "Headshots"/"Videos AI" under both)
    // We check for the "Usage" section header specifically within #plans
    const usageHeader = this.page.locator('#plans div.text-sm.font-semibold', { hasText: /^Usage$/ });
    await expect(usageHeader).toBeVisible({ timeout: 5000 });
  }

  async managePlanButtonShouldBeVisible() {
    await expect(
      this.page.locator('#plans button', { hasText: 'Manage Plan' })
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Navigate to Manage Plan (compare plans) ─────────────────────────────────

  async clickManagePlan() {
    await this.page.locator('#plans button', { hasText: 'Manage Plan' }).click();
    await this.page.waitForURL(/#compare-plans/, { timeout: 8000 });
    await this.page.waitForTimeout(1000);
  }

  async comparePlansShouldShowThreePlans() {
    await expect(this.page.locator('h2', { hasText: 'Starter' })).toBeVisible({ timeout: 8000 });
    await expect(this.page.locator('h2', { hasText: 'Professional' })).toBeVisible({ timeout: 8000 });
    await expect(this.page.locator('h2', { hasText: 'Business' })).toBeVisible({ timeout: 8000 });
  }

  async currentPlanInCompareShouldBe(planName) {
    const card = await this._planCard(planName);
    const currentBtn = card.locator('button', { hasText: 'Your Current Plan' });
    await expect(currentBtn).toBeDisabled({ timeout: 5000 });
  }

  async otherPlansShouldShowChooseButton(excludedPlan) {
    const plans = ['Starter', 'Professional', 'Business'].filter(p => p !== excludedPlan);
    for (const plan of plans) {
      const card = await this._planCard(plan);
      await expect(card.locator('button', { hasText: 'Choose this plan' })).toBeEnabled({ timeout: 5000 });
    }
  }

  async twoPlansShouldHaveChooseButton(plan1, plan2) {
    for (const plan of [plan1, plan2]) {
      const card = await this._planCard(plan);
      await expect(card.locator('button', { hasText: 'Choose this plan' })).toBeEnabled({ timeout: 5000 });
    }
  }

  async choosePlan(planName) {
    const card = await this._planCard(planName);
    await card.locator('button', { hasText: 'Choose this plan' }).click();
    await this.page.waitForTimeout(1000);
  }

  async clickBack() {
    await this.page.locator('button', { hasText: /^Back$/ }).click();
    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 8000 });
  }

  // ─── Upgrade modal ────────────────────────────────────────────────────────────

  async upgradeModalShouldShowPlan(planName) {
    const modal = this.page.locator(MODAL);
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.locator('h2', { hasText: 'Subscription Payment' })).toBeVisible({ timeout: 5000 });
    // Chosen plan row
    await expect(modal.locator('text=Chosen Plan')).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(planName, { exact: true })).toBeVisible({ timeout: 5000 });
  }

  async upgradeModalShouldShowPriceAndCreditCard() {
    const modal = this.page.locator(MODAL);
    await expect(modal.locator('text=Price')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=Your Current Credit Card')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('button', { hasText: 'Change Credit Card' })).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('button', { hasText: 'Confirm Upgrade' })).toBeVisible({ timeout: 5000 });
  }

  async confirmUpgrade() {
    // Intercept before clicking — upgrade returns { subscriptions: [...] } with subscriptionItems
    const responsePromise = this.page.waitForResponse(
      r => r.status() === 200 && /subscription/i.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 15000 }
    );

    await this.page.locator(MODAL).locator('button', { hasText: 'Confirm Upgrade' }).click();

    const response = await responsePromise;
    const body = await response.json();

    // Upgrade response: { subscriptions: [{ status, subscriptionItems: [{ itemPriceId }] }] }
    expect(Array.isArray(body?.subscriptions), 'upgrade response should have subscriptions array').toBe(true);
    expect(body.subscriptions[0]?.status).toBe('active');
    expect(body.subscriptions[0]?.subscriptionItems?.[0]?.itemPriceId).toMatch(/professional/i);

    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 15000 });
    await this._reloadBilling();
  }

  async currentPlanShouldBe(planName) {
    const actual = await this.getCurrentPlanName();
    expect(actual).toBe(planName);
  }

  // ─── Downgrade modal ──────────────────────────────────────────────────────────

  async downgradeModalShouldShowWarning() {
    const modal = this.page.locator(MODAL);
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.getByText("You're downgrading your plan.")).toBeVisible({ timeout: 5000 });
  }

  async downgradeModalShouldShowKeepAndConfirm(currentPlanName) {
    const modal = this.page.locator(MODAL);
    // "Keep Professional" or similar
    await expect(modal.locator('button', { hasText: new RegExp(`Keep ${currentPlanName}`, 'i') })).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('button', { hasText: 'Confirm Downgrade' })).toBeVisible({ timeout: 5000 });
  }

  async confirmDowngrade() {
    // Downgrade returns { subscription: { status, ... } } — no subscriptionItems (change is scheduled)
    const responsePromise = this.page.waitForResponse(
      r => r.status() === 200 && /subscription/i.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 15000 }
    );

    await this.page.locator(MODAL).locator('button', { hasText: 'Confirm Downgrade' }).click();

    const response = await responsePromise;
    const body = await response.json();

    // Downgrade response: { subscription: { status: "active", ... } } (singular, no subscriptionItems)
    expect(body?.subscription, 'downgrade response should have singular subscription object').toBeDefined();
    expect(body.subscription?.status).toBe('active');
    expect(body.subscription?.subscriptionItems).toBeUndefined();

    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 15000 });
    await this._reloadBilling();
  }

  // ─── Downgrade scheduled state ────────────────────────────────────────────────

  async downgradeScheduledBannerShouldBeVisible(targetPlan) {
    await expect(
      this.page.locator('#plans').getByText(new RegExp(`Your downgrade to ${targetPlan}.*scheduled`, 'i'))
    ).toBeVisible({ timeout: 8000 });
    await expect(
      this.page.locator('#plans button', { hasText: 'Cancel downgrade' })
    ).toBeVisible({ timeout: 5000 });
  }

  async manageDowngradedStateShouldShow(currentPlanName, targetPlanName) {
    await this.clickManagePlan();

    const currentCard = await this._planCard(currentPlanName);
    await expect(currentCard.locator('button', { hasText: 'Your Current Plan' })).toBeDisabled({ timeout: 5000 });
    await expect(currentCard.locator('text=/Active until/i')).toBeVisible({ timeout: 5000 });

    const targetCard = await this._planCard(targetPlanName);
    await expect(targetCard.locator('button', { hasText: /Downgrade Scheduled/i })).toBeDisabled({ timeout: 5000 });

    await this.clickBack();
  }

  async cancelDowngradeBannerShouldBeVisible() {
    await expect(
      this.page.locator('#plans button', { hasText: 'Cancel downgrade' })
    ).toBeVisible({ timeout: 5000 });
  }

  async planActiveNoDowngradeBannerShouldBeVisible() {
    await expect(
      this.page.locator('#plans button', { hasText: 'Cancel downgrade' })
    ).not.toBeVisible({ timeout: 5000 });
    await this.planInformationShouldBeVisible();
  }

  async cancelDowngradeFromBanner() {
    // Cancel downgrade fires a scheduled-changes delete; response restores subscriptionItems
    const responsePromise = this.page.waitForResponse(
      r => r.status() === 200 && /subscription/i.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 15000 }
    );

    await this.page.locator('#plans button', { hasText: 'Cancel downgrade' }).click();

    const response = await responsePromise;
    const body = await response.json();

    // Cancel downgrade response: { subscription: { status: "active" } } or { subscriptions: [...] }
    const sub = body?.subscription ?? body?.subscriptions?.[0];
    expect(sub?.status, 'cancel-downgrade response should have status active').toBe('active');

    await this.page.waitForTimeout(500);
  }

  async cancelDowngradeModalShouldBeVisible() {
    const modal = this.page.locator(MODAL);
    await expect(modal).toBeVisible({ timeout: 8000 });
  }

  async closeCancelDowngradeModal() {
    const modal = this.page.locator(MODAL);
    const doneBtn = modal.locator('button', { hasText: /^Done$/ });
    const closeBtn = modal.locator('button', { hasText: /^Close$/ });
    if (await doneBtn.count() > 0) {
      await doneBtn.click();
    } else {
      await closeBtn.click();
    }
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  }

  async noDowngradeBannerShouldBeVisible() {
    await expect(
      this.page.locator('#plans button', { hasText: 'Cancel downgrade' })
    ).not.toBeVisible({ timeout: 5000 });
  }

  // ─── Cancel plan flow ─────────────────────────────────────────────────────────

  async clickMorePlanOptionsAndSelectCancel() {
    await this.page.locator('button[aria-label="More plan options"]').click();
    await this.page.waitForTimeout(500);
    await this.page.locator('[role="menuitem"]', { hasText: 'Cancel Plan' }).click();
    await this.page.waitForTimeout(500);
  }

  async cancelPlanModalShouldBeVisible() {
    const modal = this.page.locator(ALERT_MODAL);
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.locator('button', { hasText: 'Keep my plan' })).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('button', { hasText: /yes.*cancel/i })).toBeVisible({ timeout: 5000 });
  }

  async confirmCancelPlan() {
    // Cancel plan returns { subscription: { status: "active", ... } } — still active until cycle ends
    const responsePromise = this.page.waitForResponse(
      r => r.status() === 200 && /subscription/i.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 15000 }
    );

    await this.page.locator(ALERT_MODAL).locator('button', { hasText: /yes.*cancel/i }).click();

    const response = await responsePromise;
    const body = await response.json();

    expect(body?.subscription, 'cancel-plan response should have singular subscription object').toBeDefined();
    expect(body.subscription?.status).toBe('active');

    await this.page.locator('#plans').waitFor({ state: 'visible', timeout: 15000 });
    await this._reloadBilling();
  }

  async cancellationBannerShouldBeVisible() {
    // The banner shows something like "Your plan cancellation is scheduled" or similar
    // with a "Keep my plan" button
    await expect(
      this.page.locator('#plans button', { hasText: 'Keep my plan' })
    ).toBeVisible({ timeout: 8000 });
  }

  async managesCancelledPlanStateShouldShow(currentPlanName) {
    await this.clickManagePlan();
    const card = await this._planCard(currentPlanName);
    await expect(card.locator('button', { hasText: 'Your Current Plan' })).toBeDisabled({ timeout: 5000 });
    await expect(card.locator('text=/Active until/i')).toBeVisible({ timeout: 5000 });
    await this.clickBack();
  }

  async clickKeepMyPlan() {
    // Keep plan fires scheduled-changes delete; response has subscriptionItems restored
    const responsePromise = this.page.waitForResponse(
      r => r.status() === 200 && /subscription/i.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 15000 }
    );

    await this.page.locator('#plans button', { hasText: 'Keep my plan' }).click();

    const response = await responsePromise;
    const body = await response.json();

    const sub = body?.subscription ?? body?.subscriptions?.[0];
    expect(sub?.status, 'keep-plan response should have status active').toBe('active');

    await this.page.waitForTimeout(500);
    await this._reloadBilling();
  }

  async noCancellationBannerShouldBeVisible() {
    await expect(
      this.page.locator('#plans button', { hasText: 'Keep my plan' })
    ).not.toBeVisible({ timeout: 5000 });
  }

  // ─── Payment Method tab navigation ───────────────────────────────────────────

  async navigateToPaymentMethodTab() {
    await this.page.locator('[role="tab"]', { hasText: /payment method/i }).click();
    await this.page.locator('#payment').waitFor({ state: 'visible', timeout: 8000 });
    await this.page.waitForTimeout(500);
  }

  async visitPaymentMethod() {
    await this.visit();
    await this.navigateToPaymentMethodTab();
  }

  // ─── Payment Method tab assertions ───────────────────────────────────────────

  async paymentMethodTabShouldBeActive() {
    await expect(
      this.page.locator('[id$="-trigger-payment"]')
    ).toHaveAttribute('data-state', 'active', { timeout: 8000 });
  }

  async currentCreditCardSectionShouldBeVisible() {
    await expect(
      this.page.locator('#payment p', { hasText: 'Your Current Credit Card' })
    ).toBeVisible({ timeout: 8000 });
  }

  async cardBrandAndLastFourShouldBeVisible() {
    // The card brand+last4 cell: "visa **** 1111" (first-letter capitalized via CSS)
    await expect(
      this.page.locator('#payment div.font-semibold').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async cardExpiryDateShouldBeVisible() {
    await expect(
      this.page.locator('#payment div', { hasText: /^Expiration:/ })
    ).toBeVisible({ timeout: 5000 });
  }

  async changeCreditCardButtonShouldBeVisible() {
    await expect(
      this.page.locator('#payment button', { hasText: 'Change Credit Card' })
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── Change Credit Card modal ─────────────────────────────────────────────────

  async clickChangeCreditCard() {
    await this.page.locator('#payment button', { hasText: 'Change Credit Card' }).click();
    await this.page.locator(MODAL).waitFor({ state: 'visible', timeout: 8000 });
    await this.page.waitForTimeout(1000);
  }

  async changeCreditCardModalShouldShowFields() {
    const modal = this.page.locator(MODAL);
    await expect(modal).toBeVisible({ timeout: 8000 });
    await expect(modal.locator('h2', { hasText: 'Update Payment Method' })).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('#name')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('#email')).toBeVisible({ timeout: 5000 });
    // Card number iframe
    await expect(this.page.locator('iframe[name="cb-component-number-0"]')).toBeVisible({ timeout: 8000 });
    // Expiry iframe
    await expect(this.page.locator('iframe[name="cb-component-expiry-1"]')).toBeVisible({ timeout: 5000 });
    // CVV iframe
    await expect(this.page.locator('iframe[name="cb-component-cvv-2"]')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('button[type="submit"]', { hasText: 'Save' })).toBeVisible({ timeout: 5000 });
  }

  async fillCreditCardForm({ name, email, cardNumber, expiry, cvv }) {
    const modal = this.page.locator(MODAL);
    await modal.locator('#name').fill(name);
    await modal.locator('#email').fill(email);

    const numberFrame = this.page.frameLocator('iframe[name="cb-component-number-0"]');
    await numberFrame.locator('input[type="tel"]').first().fill(cardNumber);

    const expiryFrame = this.page.frameLocator('iframe[name="cb-component-expiry-1"]');
    await expiryFrame.locator('input[type="tel"]').first().fill(expiry);

    const cvvFrame = this.page.frameLocator('iframe[name="cb-component-cvv-2"]');
    await cvvFrame.locator('input[type="tel"]').first().fill(cvv);

    await this.page.waitForTimeout(500);
  }

  async saveNewPaymentMethod() {
    // 1. Chargebee tokenizes the card
    const tokenPromise = this.page.waitForResponse(
      r => r.status() === 200 && /chargebee\.com\/api\/js\/v2\/tokens\/create_for_card/.test(r.url()),
      { timeout: 30000 }
    );
    // 2. Arena billing updates the credit card record
    const updatePromise = this.page.waitForResponse(
      r => r.status() === 200 && /billing\/customers\/.*\/credit-card/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 30000 }
    );

    await this.page.locator(MODAL).locator('button[type="submit"]', { hasText: 'Save' }).click();

    const tokenResp = await tokenPromise;
    const tokenBody = await tokenResp.json();
    expect(tokenBody?.token?.status, 'Chargebee token should have status "new"').toBe('new');
    expect(tokenBody?.token?.id, 'Chargebee token id should be present').toBeTruthy();

    const updateResp = await updatePromise;
    const updateBody = await updateResp.json();
    expect(updateBody?.customer?.creditCardBrand, 'credit-card update should return brand').toBeTruthy();
    expect(updateBody?.customer?.creditCardLast4, 'credit-card update should return last4').toBeTruthy();

    await expect(this.page.locator(MODAL)).not.toBeVisible({ timeout: 15000 });
  }
}

module.exports = { SettingsBillingPage };
