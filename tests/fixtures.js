const playwrightBdd = require('playwright-bdd');
const path = require('path');
const fs   = require('fs');

const MODERN_EU_URL = process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena';
const { SignupPage } = require('../support/Pages/SignupPage');
const { LoginPage } = require('../support/Pages/LoginPage');
const { HomePage } = require('../support/Pages/HomePage');
const { KnowledgeBasePage } = require('../support/Pages/KnowledgeBasePage');
const { OnboardingPage } = require('../support/Pages/OnboardingPage');
const { EndUserPage } = require('../support/Pages/EndUserPage');
const { ChatLogPage } = require('../support/Pages/ChatLogPage');
const { ModernChatLogPage } = require('../support/Pages/ModernChatLogPage');
const { VideoAIPage } = require('../support/Pages/VideoAIPage');
const { ProfileBuilderPage } = require('../support/Pages/ProfileBuilderPage');
const { AudiencePage } = require('../support/Pages/AudiencePage');
const { AvatarManagementPage } = require('../support/Pages/AvatarManagementPage');
const { SettingsTeamPage } = require('../support/Pages/SettingsTeamPage');
const { SettingsInvitePage } = require('../support/Pages/SettingsInvitePage');
const { SettingsMembershipPage } = require('../support/Pages/SettingsMembershipPage');
const { SettingsPaymentsPage } = require('../support/Pages/SettingsPaymentsPage');
const { HealthCheckPage } = require('../support/Pages/HealthCheckPage');
const { SettingsBillingPage } = require('../support/Pages/SettingsBillingPage');

const test = playwrightBdd.test.extend({
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.waitForSelector('[placeholder="Email"]', { state: 'visible' });
    await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL || '');
    await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD || '');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
    await use(page);
  },
  homePage: async ({ authenticatedPage }, use) => {
    await use(new HomePage(authenticatedPage));
  },
  kbPage: async ({ authenticatedPage }, use) => {
    await use(new KnowledgeBasePage(authenticatedPage));
  },
  onboardingPage: async ({ page }, use) => {
    await use(new OnboardingPage(page));
  },
  endUserPage: async ({ page }, use) => {
    await use(new EndUserPage(page));
  },
  endUserModernPage: async ({ page }, use) => {
    await use(new EndUserPage(page, MODERN_EU_URL));
  },
  chatLogPage: async ({ authenticatedPage }, use) => {
    await use(new ChatLogPage(authenticatedPage));
  },
  modernChatLogPage: async ({ authenticatedPage }, use) => {
    await use(new ModernChatLogPage(authenticatedPage));
  },
  videoAIPage: async ({ authenticatedPage }, use) => {
    const vaiPage = new VideoAIPage(authenticatedPage);
    await use(vaiPage);
    // Teardown: delete any video generated during this test (pass or fail)
    await vaiPage.cleanupGeneratedVideo();
  },
  profileBuilderPage: async ({ authenticatedPage }, use) => {
    await use(new ProfileBuilderPage(authenticatedPage));
  },
  audiencePage: async ({ authenticatedPage }, use) => {
    await use(new AudiencePage(authenticatedPage));
  },
  avatarManagementPage: async ({ authenticatedPage }, use) => {
    await use(new AvatarManagementPage(authenticatedPage));
  },
  settingsTeamPage: async ({ authenticatedPage }, use) => {
    await use(new SettingsTeamPage(authenticatedPage));
  },
  settingsInvitePage: async ({ authenticatedPage }, use) => {
    await use(new SettingsInvitePage(authenticatedPage));
  },
  settingsMembershipPage: async ({ authenticatedPage }, use) => {
    await use(new SettingsMembershipPage(authenticatedPage));
  },
  settingsPaymentsPage: async ({ authenticatedPage }, use) => {
    await use(new SettingsPaymentsPage(authenticatedPage));
  },
  settingsBillingPage: async ({ authenticatedPage }, use) => {
    await use(new SettingsBillingPage(authenticatedPage));
  },
  healthCheckPage: async ({ authenticatedPage }, use) => {
    await use(new HealthCheckPage(authenticatedPage));
  },
  // ─── Social auth fixtures (storageState) ──────────────────────────────────
  // Auth files are generated once via: node tests/setup/generate-social-auth.js <provider>
  euGoogleModernPage: async ({ browser }, use) => {
    const authFile = path.resolve(__dirname, '../.auth/google-eu-modern.json');
    if (!fs.existsSync(authFile)) throw new Error('Missing .auth/google-eu-modern.json — run: node tests/setup/generate-social-auth.js google-modern');
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await use(new EndUserPage(page, MODERN_EU_URL));
    await context.close();
  },
  euGooglePage: async ({ browser }, use) => {
    const authFile = path.resolve(__dirname, '../.auth/google-eu.json');
    if (!fs.existsSync(authFile)) throw new Error('Missing .auth/google-eu.json — run: node tests/setup/generate-social-auth.js google');
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await use(new EndUserPage(page));
    await context.close();
  },
  euFacebookPage: async ({ browser }, use) => {
    const authFile = path.resolve(__dirname, '../.auth/facebook-eu.json');
    if (!fs.existsSync(authFile)) throw new Error('Missing .auth/facebook-eu.json — run: node tests/setup/generate-social-auth.js facebook');
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await use(new EndUserPage(page));
    await context.close();
  },
  euXPage: async ({ browser }, use) => {
    const authFile = path.resolve(__dirname, '../.auth/x-eu.json');
    if (!fs.existsSync(authFile)) throw new Error('Missing .auth/x-eu.json — run: node tests/setup/generate-social-auth.js x');
    const context = await browser.newContext({ storageState: authFile });
    const page = await context.newPage();
    await use(new EndUserPage(page));
    await context.close();
  },
  googleAdminPage: async ({ browser }, use) => {
    const authFile = path.resolve(__dirname, '../.auth/google-admin.json');
    if (!fs.existsSync(authFile)) throw new Error('Missing .auth/google-admin.json — run: node tests/setup/generate-social-auth.js admin');
    const baseURL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
    const context = await browser.newContext({ storageState: authFile, baseURL });
    const page = await context.newPage();
    await page.goto('/');
    await use(new LoginPage(page));
    await context.close();
  },

  healthCheckFreshPage: async ({ browser }, use) => {
    const baseURL = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto('/login');
    await page.waitForSelector('[placeholder="Email"]', { state: 'visible' });
    await page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL || '');
    await page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD || '');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
    await use(new HealthCheckPage(page));
    await context.close();
  },
});

module.exports = { test };
