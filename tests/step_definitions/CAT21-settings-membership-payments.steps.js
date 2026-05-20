const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Membership – navigation ──────────────────────────────────────────────────

Given('I am on the Settings Membership page', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.visit();
});

Then('the Pricing tab should be active', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.pricingTabShouldBeActive();
});

When('I switch to the Benefits tab', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.switchToBenefitsTab();
});

// ─── Membership – Pricing tab ─────────────────────────────────────────────────

Then('the subscription currency should display "USD" and the price "$4.99"', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.currencyShouldShowUSDAndPrice499();
});

// ─── Membership – Benefits tab ────────────────────────────────────────────────

Then('the benefits list should contain subscription benefit items', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.benefitsListShouldContainItems();
});

// ─── Membership – Warning banner (pending backend support) ───────────────────

Then('the payment provider warning should be visible with a Setup button', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.paymentProviderWarningShouldBeVisibleWithSetupButton();
});

When('I click the Setup button in the warning', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.clickSetupButton();
});

Then('I should be on the Settings Payments page', async ({ settingsMembershipPage }) => {
  await settingsMembershipPage.shouldBeOnPaymentsPage();
});

// ─── Payments – preconditions ─────────────────────────────────────────────────

Given('I am on the Settings Payments page and Stripe is already connected', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.visitAndSkipIfNotConnected();
});

Given('I am on the Settings Payments page and Stripe is not yet connected', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.visitAndSkipIfConnected();
});

// ─── Payments – Stripe card assertions ───────────────────────────────────────

Then('the Stripe payment card should be visible', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeCardShouldBeVisible();
});

Then('the Stripe card should show a "Conectar" button', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeCardShouldShowConnectButton();
});

Then('the Stripe card should show the "Conectado" badge', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeCardShouldShowConnectedBadge();
});

Then('the Stripe card should show the "Gerenciar" button', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeCardShouldShowManageButton();
});

// ─── Payments – Connect flow (pending backend support) ───────────────────────

When('I click the Connect button on the Stripe card', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.clickStripeConnectButton();
});

Then('the Stripe connect modal should be visible', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeConnectModalShouldBeVisible();
});

Then('the Stripe connect modal title should be "Conectar ao Stripe"', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeConnectModalTitleShouldBe('Conectar ao Stripe');
});

Then('the Stripe connect modal should have "Cancelar" and "Conectar" buttons', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeConnectModalShouldHaveCancelAndConnectButtons();
});

When('I cancel the Stripe connect modal', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.cancelStripeConnectModal();
});

Then('the Stripe connect modal should be closed', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.stripeConnectModalShouldBeClosed();
});

When('I confirm the connection inside the Stripe modal', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.confirmConnectionInsideModal();
});

Then('I should be redirected to Stripe onboarding', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.shouldBeOnStripeOnboardingPage();
});

When('I return to the dashboard from Stripe onboarding', async ({ settingsPaymentsPage }) => {
  await settingsPaymentsPage.returnFromStripeToSettings();
});
