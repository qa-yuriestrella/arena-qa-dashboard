const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Given – navigation & preconditions ───────────────────────────────────────

Given('I am on the Settings Billing page', async ({ settingsBillingPage }) => {
  await settingsBillingPage.visit();
});

Given('I am on the Settings Billing page with plan {string}', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.visitAndSkipUnlessPlan(planName);
});

Given('I am on the Settings Billing page with plan {string} and no pending changes', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.visitAndSkipUnlessPlanAndNoPending(planName);
});

Given('I am on the Settings Billing page with a scheduled downgrade', async ({ settingsBillingPage }) => {
  await settingsBillingPage.visitAndSkipUnlessScheduledDowngrade();
});

Given('I am on the Settings Billing page with an active paid plan and no pending changes', async ({ settingsBillingPage }) => {
  await settingsBillingPage.visitAndSkipUnlessActiveNoPending();
});

Given('I am on the Settings Billing page with a scheduled plan cancellation', async ({ settingsBillingPage }) => {
  await settingsBillingPage.visitAndSkipUnlessScheduledCancellation();
});

// ─── BIL001 – Plans & Usage overview ─────────────────────────────────────────

Then('the Plans & Usage tab should be active', async ({ settingsBillingPage }) => {
  await settingsBillingPage.plansUsageTabShouldBeActive();
});

Then('the Plan Information section should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.planInformationShouldBeVisible();
});

Then('the Next Renewal date should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.nextRenewalShouldBeVisible();
});

Then('the Current Plan label should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.currentPlanLabelShouldBeVisible();
});

Then('the Quota Limits section should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.quotaLimitsShouldBeVisible();
});

Then('the Usage section should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.usageSectionShouldBeVisible();
});

Then('the Manage Plan button should be visible', async ({ settingsBillingPage }) => {
  await settingsBillingPage.managePlanButtonShouldBeVisible();
});

// ─── BIL002 / BIL003 – Manage Plan & plan cards ──────────────────────────────

When('I click Manage Plan', async ({ settingsBillingPage }) => {
  await settingsBillingPage.clickManagePlan();
});

Then('the plan comparison should show Starter, Professional, and Business cards', async ({ settingsBillingPage }) => {
  await settingsBillingPage.comparePlansShouldShowThreePlans();
});

Then('{string} should be marked as the current plan', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.currentPlanInCompareShouldBe(planName);
});

Then('the other plans should have {string} buttons enabled', async ({ settingsBillingPage }, _buttonText) => {
  // Called when on Starter — Professional and Business should show Choose this plan
  await settingsBillingPage.otherPlansShouldShowChooseButton('Starter');
});

Then('{string} and {string} should have {string} buttons enabled', async ({ settingsBillingPage }, plan1, plan2, _buttonText) => {
  await settingsBillingPage.twoPlansShouldHaveChooseButton(plan1, plan2);
});

// ─── BIL002 – Upgrade ────────────────────────────────────────────────────────

When('I choose the {string} plan', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.choosePlan(planName);
});

Then('the Subscription Payment modal should show plan {string}', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.upgradeModalShouldShowPlan(planName);
});

Then('the modal should show price and current credit card info with Confirm Upgrade button', async ({ settingsBillingPage }) => {
  await settingsBillingPage.upgradeModalShouldShowPriceAndCreditCard();
});

When('I confirm the upgrade', async ({ settingsBillingPage }) => {
  await settingsBillingPage.confirmUpgrade();
});

Then('I should be back on Plans & Usage with current plan {string}', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.currentPlanShouldBe(planName);
});

// ─── BIL003 – Downgrade ───────────────────────────────────────────────────────

When('I choose the {string} plan for downgrade', async ({ settingsBillingPage }, planName) => {
  await settingsBillingPage.choosePlan(planName);
});

Then('the downgrade modal should show the {string} warning', async ({ settingsBillingPage }) => {
  await settingsBillingPage.downgradeModalShouldShowWarning();
});

Then('the downgrade modal should show {string} and {string} buttons', async ({ settingsBillingPage }, _keepText, _confirmText) => {
  await settingsBillingPage.downgradeModalShouldShowKeepAndConfirm('Professional');
});

When('I confirm the downgrade', async ({ settingsBillingPage }) => {
  await settingsBillingPage.confirmDowngrade();
});

Then('Plans & Usage should show a downgrade scheduled banner mentioning {string}', async ({ settingsBillingPage }, targetPlan) => {
  await settingsBillingPage.downgradeScheduledBannerShouldBeVisible(targetPlan);
});

Then('the Manage Plan view should show {string} on {string} and {string} on {string}', async ({ settingsBillingPage }, state1, plan1, state2, plan2) => {
  // state1="Active until", plan1="Professional", state2="Downgrade Scheduled", plan2="Starter"
  await settingsBillingPage.manageDowngradedStateShouldShow(plan1, plan2);
});

// ─── BIL004 – Cancel Downgrade ────────────────────────────────────────────────

Then('the downgrade scheduled banner should be visible with a Cancel downgrade button', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancelDowngradeBannerShouldBeVisible();
});

When('I cancel the downgrade from the Plans & Usage banner', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancelDowngradeFromBanner();
});

Then('a confirmation modal should appear informing the downgrade was cancelled', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancelDowngradeModalShouldBeVisible();
});

When('I close the confirmation modal', async ({ settingsBillingPage }) => {
  await settingsBillingPage.closeCancelDowngradeModal();
});

Then('the downgrade banner should be gone', async ({ settingsBillingPage }) => {
  await settingsBillingPage.noDowngradeBannerShouldBeVisible();
});

Then('the current plan should be active with no pending changes', async ({ settingsBillingPage }) => {
  await settingsBillingPage.planActiveNoDowngradeBannerShouldBeVisible();
});

// ─── BIL005 – Cancel Plan ─────────────────────────────────────────────────────

When('I open the More Plan Options menu and select Cancel Plan', async ({ settingsBillingPage }) => {
  await settingsBillingPage.clickMorePlanOptionsAndSelectCancel();
});

Then('the cancel plan alert should appear with {string} and {string} buttons', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancelPlanModalShouldBeVisible();
});

When('I confirm the plan cancellation', async ({ settingsBillingPage }) => {
  await settingsBillingPage.confirmCancelPlan();
});

Then('Plans & Usage should show a plan cancellation banner with a {string} button', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancellationBannerShouldBeVisible();
});

Then('the Manage Plan view should show {string} on the current plan with all buttons disabled', async ({ settingsBillingPage }, _stateText) => {
  const planName = await settingsBillingPage.getCurrentPlanName();
  await settingsBillingPage.managesCancelledPlanStateShouldShow(planName);
});

// ─── BIL006 – Keep Plan ───────────────────────────────────────────────────────

Then('the plan cancellation banner should be visible with a {string} button', async ({ settingsBillingPage }) => {
  await settingsBillingPage.cancellationBannerShouldBeVisible();
});

When('I click Keep my plan to restore the subscription', async ({ settingsBillingPage }) => {
  await settingsBillingPage.clickKeepMyPlan();
});

Then('the cancellation banner should disappear', async ({ settingsBillingPage }) => {
  await settingsBillingPage.noCancellationBannerShouldBeVisible();
});

Then('the plan should be active with no pending cancellation', async ({ settingsBillingPage }) => {
  await settingsBillingPage.planInformationShouldBeVisible();
});
