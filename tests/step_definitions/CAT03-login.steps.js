const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.visit();
});

Given('the password reset modal is open', async ({ loginPage }) => {
  await loginPage.visit();
  await loginPage.clickForgotPasswordLink();
});

When('I fill in the login form with valid credentials', async ({ loginPage }) => {
  await loginPage.fillLoginForm();
});

When('I click the login button', async ({ loginPage }) => {
  await loginPage.clickLogin();
});

When('I fill in the login email with {string}', async ({ loginPage }, value) => {
  await loginPage.fillEmail(value);
});

When('I fill in the login password with {string}', async ({ loginPage }, value) => {
  await loginPage.fillPassword(value);
});

When('I click the login password toggle', async ({ loginPage }) => {
  await loginPage.clickTogglePassword();
});

When('I click the login password toggle again', async ({ loginPage }) => {
  await loginPage.clickTogglePassword();
});

When('I click the sign up link', async ({ loginPage }) => {
  await loginPage.clickSignUpLink();
});

When('I click the forgot password link', async ({ loginPage }) => {
  await loginPage.clickForgotPasswordLink();
});

When('I enter a valid email in the reset form', async ({ loginPage }) => {
  await loginPage.fillResetEmail('reset-test@yopmail.com');
});

When('I submit the password reset request', async ({ loginPage }) => {
  await loginPage.submitResetForm();
});

When('I close the password reset modal', async ({ loginPage }) => {
  await loginPage.closeResetModal();
});

Then('the next page should load within 5 seconds', async ({ loginPage }) => {
  await loginPage.nextPageShouldLoadWithin5Seconds();
});

Then('the login button should be disabled', async ({ loginPage }) => {
  await loginPage.loginButtonShouldBeDisabled();
});

Then('I should be redirected to the dashboard', async ({ loginPage }) => {
  await loginPage.shouldBeRedirectedToDashboard();
});

Then('I should see an error on the login email field', async ({ loginPage }) => {
  await loginPage.emailFieldShouldHaveError();
});

Then('the login password should be visible', async ({ loginPage }) => {
  await loginPage.passwordShouldBeVisible();
});

Then('the login password should be hidden', async ({ loginPage }) => {
  await loginPage.passwordShouldBeHidden();
});

Then('I should be redirected to the sign up page', async ({ loginPage }) => {
  await loginPage.shouldBeOnSignUpPage();
});

Then('the password reset modal should be visible', async ({ loginPage }) => {
  await loginPage.resetModalShouldBeVisible();
});

Then('the password reset modal should not be visible', async ({ loginPage }) => {
  await loginPage.resetModalShouldNotBeVisible();
});

Then('I should see a password reset confirmation message', async ({ loginPage }) => {
  await loginPage.resetConfirmationShouldBeVisible();
});

// ─── Google admin (storageState — requires .auth/google-admin.json) ─────────

Given('I am authenticated as an admin via Google', async ({ googleAdminPage }) => {
  // googleAdminPage fixture already navigated to / with the Google-authenticated context
});

Then('the admin dashboard should be accessible', async ({ googleAdminPage }) => {
  await googleAdminPage.shouldBeRedirectedToDashboard();
});
