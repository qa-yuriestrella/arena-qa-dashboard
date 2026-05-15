const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I navigate to the sign up page', async ({ signupPage }) => {
  await signupPage.visit();
});

Given('I am on the sign up page', async ({ signupPage }) => {
  await signupPage.visit();
});

Then('the onboarding page should load within {int} seconds', async ({ page }, seconds) => {
  await expect(page).toHaveURL(/\/setup\//, { timeout: seconds * 1000 });
});

When('I fill in the sign up form with valid data', async ({ signupPage }) => {
  await signupPage.fillForm();
});

When('I click the sign up button', async ({ signupPage }) => {
  await signupPage.clickSignUp();
});

When('I fill in the {string} field with {string}', async ({ signupPage }, field, value) => {
  await signupPage.fillField(field, value);
});

When('I fill in the password field with {string}', async ({ signupPage }, value) => {
  await signupPage.fillPasswordField(value);
});

When('I click the toggle password button', async ({ signupPage }) => {
  await signupPage.clickTogglePassword();
});

When('I click the toggle password button again', async ({ signupPage }) => {
  await signupPage.clickTogglePassword();
});

When('I click the {string} link', async ({ signupPage }, text) => {
  await signupPage.clickLink(text);
});

Then('I should be redirected to onboarding', async ({ signupPage }) => {
  await signupPage.shouldBeRedirectedToOnboarding();
});

Then('the sign up button should be disabled', async ({ signupPage }) => {
  await signupPage.signUpButtonShouldBeDisabled();
});

Then('I should see an error on the name field', async ({ signupPage }) => {
  await signupPage.shouldSeeNameFieldError();
});

Then('I should see an error on the email field', async ({ signupPage }) => {
  await signupPage.shouldSeeEmailFieldError();
});

Then('I should see an error on the password field', async ({ signupPage }) => {
  await signupPage.shouldSeePasswordFieldError();
});

Then('the password field should show plain text', async ({ signupPage }) => {
  await signupPage.passwordShouldBeVisible();
});

Then('the password field should hide the text', async ({ signupPage }) => {
  await signupPage.passwordShouldBeHidden();
});

Then('I should be redirected to the sign in page', async ({ signupPage }) => {
  await signupPage.shouldBeOnSignInPage();
});
