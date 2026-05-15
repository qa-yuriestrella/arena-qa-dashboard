const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Background (shared with CAT07) ───────────────────────────────────────────

Given('I am on the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

When('I reload the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
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
