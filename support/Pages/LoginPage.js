const { expect } = require('@playwright/test');
const { completeGoogleOAuth } = require('../helpers/oauthHelper');

const selectors = {
  inputEmail: '[placeholder="Email"]',
  inputPassword: '[placeholder="Password"]',
  btnLogin: 'button[type="submit"]',
  btnTogglePassword: 'button[type="button"]:near([placeholder="Password"])',
  linkSignUp: 'a:has-text("Sign Up now")',
  linkForgotPassword: 'text=Forgot password?',
  modalContainer: '[role="dialog"]',
  modalInputEmail: '[role="dialog"] input[type="email"]',
  btnSubmitReset: '[role="dialog"] button[type="submit"]',
  btnCloseModal: '[role="dialog"] button:has-text("Cancel")',
  resetConfirmation: '[role="dialog"] :has-text("email")',
};

class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto('/login');
    await this.page.waitForSelector(selectors.btnLogin, { state: 'visible' });
  }

  async fillLoginForm() {
    const email = process.env.TEST_USER_EMAIL || 'test@yopmail.com';
    const password = process.env.TEST_USER_PASSWORD || 'Test@12345';
    await this.page.fill(selectors.inputEmail, email);
    await this.page.fill(selectors.inputPassword, password);
  }

  async fillEmail(value) {
    await this.page.fill(selectors.inputEmail, value);
  }

  async fillPassword(value) {
    await this.page.fill(selectors.inputPassword, value);
  }

  async clickLogin() {
    await this.page.click(selectors.btnLogin);
  }

  async clickTogglePassword() {
    await this.page.click(selectors.btnTogglePassword);
  }

  async clickSignUpLink() {
    await this.page.click(selectors.linkSignUp);
  }

  async clickForgotPasswordLink() {
    await this.page.getByText('Forgot password?').click();
    await this.page.waitForSelector(selectors.modalContainer, { state: 'visible', timeout: 10000 });
  }

  async fillResetEmail(email) {
    await this.page.fill(selectors.modalInputEmail, email || 'test@yopmail.com');
  }

  async submitResetForm() {
    await this.page.click(selectors.btnSubmitReset);
  }

  async closeResetModal() {
    await this.page.click(selectors.btnCloseModal);
  }

  async loginWithGoogle() {
    const popupPromise = this.page.waitForEvent('popup');
    await this.page.getByRole('button', { name: /google/i }).click();
    const popup = await popupPromise;
    await completeGoogleOAuth(popup);
  }

  async loginButtonShouldBeDisabled() {
    await expect(this.page.locator(selectors.btnLogin)).toBeDisabled();
  }

  async emailFieldShouldHaveError() {
    await expect(this.page.locator('text=Invalid email address')).toBeVisible({ timeout: 5000 });
  }

  async passwordShouldBeVisible() {
    await expect(this.page.locator(selectors.inputPassword)).toHaveAttribute('type', 'text');
  }

  async passwordShouldBeHidden() {
    await expect(this.page.locator(selectors.inputPassword)).toHaveAttribute('type', 'password');
  }

  async nextPageShouldLoadWithin5Seconds() {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 5000 });
  }

  async shouldBeRedirectedToDashboard() {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: 15000 });
  }

  async shouldBeOnSignUpPage() {
    await expect(this.page).toHaveURL(/\/create/, { timeout: 5000 });
  }

  async resetModalShouldBeVisible() {
    await expect(this.page.locator(selectors.modalContainer)).toBeVisible();
  }

  async resetModalShouldNotBeVisible() {
    await expect(this.page.locator(selectors.modalContainer)).not.toBeVisible();
  }

  async resetConfirmationShouldBeVisible() {
    await expect(this.page.locator(selectors.resetConfirmation).first()).toBeVisible({ timeout: 10000 });
  }
}

module.exports = { LoginPage };
