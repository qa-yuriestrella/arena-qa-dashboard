const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// Background: "Given I am logged in and on the home page" is shared from CAT05-home.steps.js

// ─── AVM001 ───────────────────────────────────────────────────────────────────

When('I click the avatar switcher button', async ({ avatarManagementPage }) => {
  await avatarManagementPage.clickSwitcherButton();
});

Then('the {string} section should be visible', async ({ avatarManagementPage }, sectionText) => {
  await avatarManagementPage.sectionShouldBeVisible(sectionText);
});

Then('the {string} option should be visible', async ({ avatarManagementPage }, optionText) => {
  await avatarManagementPage.optionShouldBeVisible(optionText);
});

// ─── AVM002 ───────────────────────────────────────────────────────────────────

Then('the first avatar in the switcher should have the {string} tag', async ({ avatarManagementPage }, tag) => {
  await avatarManagementPage.firstAvatarShouldHaveTag(tag);
});

Then('the first avatar button should be disabled', async ({ avatarManagementPage }) => {
  await avatarManagementPage.firstAvatarButtonShouldBeDisabled();
});

Then('it should display the avatar name and URL in {string} format', async ({ avatarManagementPage }) => {
  await avatarManagementPage.firstAvatarShouldShowNameAndUrl();
});

// ─── AVM003 ───────────────────────────────────────────────────────────────────

Given('the account has more than one avatar', async ({ avatarManagementPage }) => {
  await avatarManagementPage.assertMultipleAvatars();
});

Then('non-current avatars in the switcher should not have the {string} tag', async ({ avatarManagementPage }) => {
  await avatarManagementPage.nonCurrentAvatarsShouldNotHaveCurrentTag();
});

Then('their buttons should be enabled and clickable', async ({ avatarManagementPage }) => {
  await avatarManagementPage.nonCurrentAvatarButtonsShouldBeEnabled();
});

// ─── AVM004 ───────────────────────────────────────────────────────────────────

When('I click on a non-current avatar in the switcher', async ({ avatarManagementPage }) => {
  await avatarManagementPage.clickNonCurrentAvatar();
});

Then('the switch avatar request should be fired', async ({ avatarManagementPage }) => {
  await avatarManagementPage.switchRequestShouldBeFired();
});

Then("the dashboard should reload with that avatar's data", async ({ avatarManagementPage }) => {
  await avatarManagementPage.dashboardShouldReloadWithAvatarData();
});

// ─── AVM005 ───────────────────────────────────────────────────────────────────

When('I click {string} in the switcher menu', async ({ avatarManagementPage }, optionText) => {
  await avatarManagementPage.clickOptionInSwitcherMenu(optionText);
});

Then('the URL should contain {string}', async ({ page }, fragment) => {
  await expect(page).toHaveURL(
    new RegExp(fragment.replace(/\//g, '\\/')),
    { timeout: 10000 }
  );
});

// ─── AVM006 ───────────────────────────────────────────────────────────────────

When('I click the {string} button in the sidebar', async ({ avatarManagementPage }, buttonText) => {
  await avatarManagementPage.clickSidebarButton(buttonText);
});

When('I go back to the home page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});

// ─── AVM008 ───────────────────────────────────────────────────────────────────

When('I complete the new avatar creation flow without entering payment details', async ({ avatarManagementPage }) => {
  await avatarManagementPage.completeNewAvatarCreationFlowWithoutPayment();
});

// "Then I should be redirected to the dashboard" is reused from CAT03-login.steps.js

Then('the newly created avatar should be selected as the current avatar', async ({ avatarManagementPage }) => {
  await avatarManagementPage.newAvatarShouldBeSelectedAsCurrent();
});

// ─── AVM009 ───────────────────────────────────────────────────────────────────

Given('the account has only one avatar', async ({ avatarManagementPage }) => {
  await avatarManagementPage.assertSingleAvatar();
});

When('I delete all non-primary avatars', async ({ avatarManagementPage }) => {
  await avatarManagementPage.deleteAllNonPrimaryAvatars();
});

When('I navigate to Settings', async ({ avatarManagementPage }) => {
  await avatarManagementPage.navigateToSettings();
});

Then('the Delete avatar button should be disabled', async ({ avatarManagementPage }) => {
  await avatarManagementPage.deleteAvatarButtonShouldBeDisabled();
});

// ─── AVM010 ───────────────────────────────────────────────────────────────────

Then('the Delete avatar button should be enabled', async ({ avatarManagementPage }) => {
  await avatarManagementPage.deleteAvatarButtonShouldBeEnabled();
});

// ─── AVM011 ───────────────────────────────────────────────────────────────────

When('I click the Delete avatar button', async ({ avatarManagementPage }) => {
  await avatarManagementPage.clickDeleteAvatarButton();
});

Then('the delete confirmation modal should be visible', async ({ avatarManagementPage }) => {
  await avatarManagementPage.deleteConfirmationModalShouldBeVisible();
});

// ─── AVM012 ───────────────────────────────────────────────────────────────────

When('I confirm the avatar deletion', async ({ avatarManagementPage }) => {
  await avatarManagementPage.confirmAvatarDeletion();
});

Then('the current avatar should be deleted', async ({ avatarManagementPage }) => {
  await avatarManagementPage.currentAvatarShouldBeDeleted();
});

Then('I should be on the dashboard of another avatar', async ({ avatarManagementPage }) => {
  await avatarManagementPage.shouldBeOnDashboardOfAnotherAvatar();
});
