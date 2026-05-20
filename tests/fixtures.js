const playwrightBdd = require('playwright-bdd');
const { SignupPage } = require('../support/Pages/SignupPage');
const { LoginPage } = require('../support/Pages/LoginPage');
const { HomePage } = require('../support/Pages/HomePage');
const { KnowledgeBasePage } = require('../support/Pages/KnowledgeBasePage');
const { OnboardingPage } = require('../support/Pages/OnboardingPage');
const { EndUserPage } = require('../support/Pages/EndUserPage');
const { ChatLogPage } = require('../support/Pages/ChatLogPage');
const { VideoAIPage } = require('../support/Pages/VideoAIPage');
const { ProfileBuilderPage } = require('../support/Pages/ProfileBuilderPage');
const { AudiencePage } = require('../support/Pages/AudiencePage');
const { AvatarManagementPage } = require('../support/Pages/AvatarManagementPage');
const { SettingsTeamPage } = require('../support/Pages/SettingsTeamPage');
const { SettingsInvitePage } = require('../support/Pages/SettingsInvitePage');
const { SettingsMembershipPage } = require('../support/Pages/SettingsMembershipPage');
const { SettingsPaymentsPage } = require('../support/Pages/SettingsPaymentsPage');

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
  chatLogPage: async ({ authenticatedPage }, use) => {
    await use(new ChatLogPage(authenticatedPage));
  },
  videoAIPage: async ({ authenticatedPage }, use) => {
    await use(new VideoAIPage(authenticatedPage));
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
});

module.exports = { test };
