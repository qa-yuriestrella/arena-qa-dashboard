const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const selectors = {
  inputName: '[placeholder="Name"]',
  inputEmail: '[placeholder="Email"]',
  inputPassword: '[placeholder="Password"]',
  btnSignUp: 'button[type="submit"]',
  btnTogglePassword: 'button[type="button"]:near([placeholder="Password"])',
};

class SignupPage {
  constructor(page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto('/create');
    await this.page.waitForSelector(selectors.btnSignUp, { state: 'visible' });
  }

  async fillForm() {
    const user = {
      name: faker.person.fullName(),
      email: faker.internet.email({ provider: 'arena.im' }),
      password: `Test@${faker.internet.password({ length: 10 })}1`,
    };
    await this.page.fill(selectors.inputName, user.name);
    await this.page.fill(selectors.inputEmail, user.email);
    await this.page.fill(selectors.inputPassword, user.password);
    this.saveUser(user);
    return user;
  }

  async fillField(field, value) {
    const map = {
      name: selectors.inputName,
      email: selectors.inputEmail,
      password: selectors.inputPassword,
    };
    await this.page.fill(map[field], value);
  }

  async fillPasswordField(value) {
    await this.page.fill(selectors.inputPassword, value);
  }

  async clickSignUp() {
    await this.page.click(selectors.btnSignUp);
    await this.page.waitForURL(/\/setup\//, { timeout: 100000 });
  }

  async clickTogglePassword() {
    await this.page.click(selectors.btnTogglePassword);
  }

  async clickLink(text) {
    await this.page.getByRole('link', { name: text }).click();
  }

  // CT002
  async shouldBeRedirectedToOnboarding() {
    await expect(this.page).toHaveURL(/\/setup/, { timeout: 15000 });
  }

  // CT003
  async signUpButtonShouldBeDisabled() {
    await expect(this.page.locator(selectors.btnSignUp)).toBeDisabled();
  }


  // CT004
  async shouldSeeNameFieldError() {
    const nameField = this.page.locator(selectors.inputName).locator('..');
    await expect(nameField.getByText('Name must be at least 2 characters')).toBeVisible();
  }

  // CT005
  async shouldSeeEmailFieldError() {
    const emailField = this.page.locator(selectors.inputEmail).locator('..');
    await expect(emailField.getByText('Invalid email address')).toBeVisible();
  }  

  // CT006
  async shouldSeePasswordFieldError() {
    const passwordField = this.page.locator(selectors.inputPassword).locator('..');
    await expect(passwordField.getByText('Password must be at least 6 characters')).toBeVisible();
  }

  // CT004
  async passwordShouldBeVisible() {
    await expect(this.page.locator(selectors.inputPassword)).toHaveAttribute('type', 'text');
  }

  async passwordShouldBeHidden() {
    await expect(this.page.locator(selectors.inputPassword)).toHaveAttribute('type', 'password');
  }

  // CT005
  async shouldBeOnSignInPage() {
    await expect(this.page).toHaveURL(/\/login/, { timeout: 5000 });
  }

  saveUser(user) {
    const fixturePath = path.join(__dirname, '../../fixtures/user.json');
    fs.writeFileSync(fixturePath, JSON.stringify(user, null, 2));
  }

  loadUser() {
    const fixturePath = path.join(__dirname, '../../fixtures/user.json');
    return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  }
}

module.exports = { SignupPage };
