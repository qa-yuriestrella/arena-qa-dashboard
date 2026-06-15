const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Background ───────────────────────────────────────────────────────────────

Given('I am on the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

Given('I am on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.visit();
});

When('I reload the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

When('I reload the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.visit();
});

// ─── Entry points ─────────────────────────────────────────────────────────────

When('I click the end user profile button', async ({ endUserPage }) => {
  await endUserPage.clickProfileButton();
});

When('I click the Subscribe button', async ({ endUserPage }) => {
  await endUserPage.clickSubscribeButton();
});

// Shared with CAT07 (EU003, EU007, EU008, EU009)
When('I open the text chat', async ({ endUserPage }) => {
  await endUserPage.openTextChat();
});

When('I click the profile icon inside the chat', async ({ endUserPage }) => {
  await endUserPage.clickProfileIconInsideChat();
});

// ─── Auth modal ───────────────────────────────────────────────────────────────

Then('the auth modal should be visible', async ({ endUserPage }) => {
  await endUserPage.authModalShouldBeVisible();
});

Then('the auth modal should show Google, Facebook, X, and Email options', async ({ endUserPage }) => {
  await endUserPage.authModalShouldShowAllOptions();
});

// ─── Email signup ─────────────────────────────────────────────────────────────

When('I select email signup', async ({ endUserPage }) => {
  await endUserPage.selectEmailSignup();
});

When('I fill in the signup form with a new user', async ({ endUserPage }) => {
  await endUserPage.fillSignupFormWithNewUser();
});

When('I click Create Account', async ({ endUserPage }) => {
  await endUserPage.clickCreateAccount();
});

When('I fill in the display name', async ({ endUserPage }) => {
  await endUserPage.fillDisplayName();
});

When('I click Save', async ({ endUserPage }) => {
  await endUserPage.clickSave();
});

Then('I should be logged in to the end user', async ({ endUserPage }) => {
  await endUserPage.shouldBeLoggedIn();
});

// ─── Password toggles ─────────────────────────────────────────────────────────

Then('the password field should be hidden', async ({ endUserPage }) => {
  await endUserPage.passwordFieldShouldBeHidden();
});

Then('the password field should be visible', async ({ endUserPage }) => {
  await endUserPage.passwordFieldShouldBeVisible();
});

When('I click the password toggle', async ({ endUserPage }) => {
  await endUserPage.clickPasswordToggle();
});

When('I click the password toggle again', async ({ endUserPage }) => {
  await endUserPage.clickPasswordToggle();
});

Then('the confirm password field should be hidden', async ({ endUserPage }) => {
  await endUserPage.confirmPasswordFieldShouldBeHidden();
});

Then('the confirm password field should be visible', async ({ endUserPage }) => {
  await endUserPage.confirmPasswordFieldShouldBeVisible();
});

When('I click the confirm password toggle', async ({ endUserPage }) => {
  await endUserPage.clickConfirmPasswordToggle();
});

// ─── Sign in ──────────────────────────────────────────────────────────────────

When('I click the sign in link', async ({ endUserPage }) => {
  await endUserPage.clickSignInLink();
});

When('I fill in the signin email with {string}', async ({ endUserPage }, email) => {
  await endUserPage.fillSigninEmail(email);
});

When('I fill in the signin password with {string}', async ({ endUserPage }, password) => {
  await endUserPage.fillSigninPassword(password);
});

When('I click Sign In', async ({ endUserPage }) => {
  await endUserPage.clickSignIn();
});

// ─── Social login ─────────────────────────────────────────────────────────────

When('I log in with Google in the end user', async ({ endUserPage }) => {
  await endUserPage.loginWithGoogle();
});

When('I log in with X in the end user', async ({ endUserPage }) => {
  await endUserPage.loginWithX();
});

When('I log in with Facebook in the end user', async ({ endUserPage }) => {
  await endUserPage.loginWithFacebook();
});

// ─── User Profile Management ──────────────────────────────────────────────────

When('I sign in to the end user as {string} with password {string}', async ({ endUserPage }, email, password) => {
  await endUserPage.loginWithCredentials(email, password);
});

When('I open the profile menu', async ({ endUserPage }) => {
  await endUserPage.openProfileMenu();
});

When('I click My Profile', async ({ endUserPage }) => {
  await endUserPage.clickMyProfile();
});

When('I click View Profile', async ({ endUserPage }) => {
  await endUserPage.clickViewProfile();
});

When('I click Edit Profile', async ({ endUserPage }) => {
  await endUserPage.clickEditProfileButton();
});

When('I select the {string} tab', async ({ endUserPage }, tabName) => {
  await endUserPage.selectProfileTab(tabName);
});

When('I update the display name to {string}', async ({ endUserPage }, name) => {
  await endUserPage.updateDisplayName(name);
});

When('I update the bio to {string}', async ({ endUserPage }, text) => {
  await endUserPage.updateBio(text);
});

When('I fill the bio with {int} characters', async ({ endUserPage }, count) => {
  await endUserPage.fillBioWithNCharacters(count);
});

When('I save the profile', async ({ endUserPage }) => {
  await endUserPage.saveProfile();
});

When('I click the Share Profile button', async ({ endUserPage }) => {
  await endUserPage.clickShareProfileButton();
});

When('I click Change Password', async ({ endUserPage }) => {
  await endUserPage.clickChangePassword();
});

When('I click Log Out from the profile menu', async ({ endUserPage }) => {
  await endUserPage.clickLogOutFromMenu();
});

Then('the display name {string} should appear in the profile', async ({ endUserPage }, name) => {
  await endUserPage.profileDisplayNameShouldBe(name);
});

Then('the bio value should not exceed {int} characters', async ({ endUserPage }, maxLength) => {
  await endUserPage.bioValueShouldNotExceed(maxLength);
});

Then('a copied notification should appear', async ({ endUserPage }) => {
  await endUserPage.copiedNotificationShouldBeVisible();
});

Then('the Create AI Avatar link should have the correct UTM parameters', async ({ endUserPage }) => {
  await endUserPage.createAvatarLinkShouldHaveCorrectUTMParams();
});

Then('the Change Password option should be visible', async ({ endUserPage }) => {
  await endUserPage.changePasswordOptionShouldBeVisible();
});

Then('the change password form should appear', async ({ endUserPage }) => {
  await endUserPage.changePasswordFormShouldBeVisible();
});

Then('I should be logged out of the end user', async ({ endUserPage }) => {
  await endUserPage.shouldBeLoggedOut();
});
