const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Background ────────────────────────────────────────────────────────────────

Given('I am on the Settings Team Members page', async ({ settingsTeamPage }) => {
  await settingsTeamPage.visit();
});

Given('I am on the Settings Invite tab', async ({ settingsInvitePage }) => {
  await settingsInvitePage.visit();
});

// ─── Team Members tab ──────────────────────────────────────────────────────────

Then('the Team Members tab should be active', async ({ settingsTeamPage }) => {
  await settingsTeamPage.teamMembersTabShouldBeActive();
});

Then('the member list should be visible', async ({ settingsTeamPage }) => {
  await settingsTeamPage.memberListShouldBeVisible();
});


When('I change the first non-owner member role to {string}', async ({ settingsTeamPage }, role) => {
  await settingsTeamPage.changeFirstNonOwnerMemberRole(role);
});

Then('the first non-owner member should display the {string} role', async ({ settingsTeamPage }, role) => {
  await settingsTeamPage.firstNonOwnerMemberShouldDisplayRole(role);
});

When('I delete the last member in the team via the actions menu', async ({ settingsTeamPage }) => {
  await settingsTeamPage.deleteLastMemberViaActionsMenu();
});

Then('that member should no longer appear in the team list', async ({ settingsTeamPage }) => {
  await settingsTeamPage.deletedMemberShouldNotAppear();
});

// ─── Invite modal ──────────────────────────────────────────────────────────────

When('I click the "Invite Members" button', async ({ settingsInvitePage }) => {
  await settingsInvitePage.clickInviteMembersButton();
});

Then('the invite modal should be visible', async ({ settingsInvitePage }) => {
  await settingsInvitePage.inviteModalShouldBeVisible();
});

Then('the email input should be visible in the modal', async ({ settingsInvitePage }) => {
  await settingsInvitePage.emailInputShouldBeVisible();
});

Then('the role selector should be visible in the modal', async ({ settingsInvitePage }) => {
  await settingsInvitePage.roleSelectorShouldBeVisible();
});

// ─── Email list management ─────────────────────────────────────────────────────

When('I type {string} in the invite email input and press Enter', async ({ settingsInvitePage }, email) => {
  await settingsInvitePage.typeEmailAndPressEnter(email);
});

Then('the invite list should contain {int} entries', async ({ settingsInvitePage }, count) => {
  await settingsInvitePage.inviteListShouldContain(count);
});

Then('the invite list should contain {int} entry', async ({ settingsInvitePage }, count) => {
  await settingsInvitePage.inviteListShouldContain(count);
});

When('I remove the first entry from the invite list', async ({ settingsInvitePage }) => {
  await settingsInvitePage.removeFirstEntryFromInviteList();
});

When('I close the invite modal', async ({ settingsInvitePage }) => {
  await settingsInvitePage.closeInviteModal();
});

Then('the invite modal should not be visible', async ({ settingsInvitePage }) => {
  await settingsInvitePage.inviteModalShouldNotBeVisible();
});

// ─── Cleanup ───────────────────────────────────────────────────────────────────

Given('all pending invites are cancelled', async ({ settingsInvitePage }) => {
  await settingsInvitePage.cancelAllPendingInvites();
});

// ─── Send invite ───────────────────────────────────────────────────────────────

When('I type the existing invite email in the input and press Enter', async ({ settingsInvitePage }) => {
  await settingsInvitePage.typeExistingInviteEmailAndPressEnter();
});

When('I type the next new invite email in the input and press Enter', async ({ settingsInvitePage }) => {
  await settingsInvitePage.typeNextNewInviteEmailAndPressEnter();
});

When('I select the {string} role', async ({ settingsInvitePage }, role) => {
  await settingsInvitePage.selectRole(role);
});

When('I click "Invite Now"', async ({ settingsInvitePage }) => {
  await settingsInvitePage.clickInviteNow();
});

Then('the invite confirmation should be shown', async ({ settingsInvitePage }) => {
  await settingsInvitePage.inviteConfirmationShouldBeShown();
});

// ─── Gmail ─────────────────────────────────────────────────────────────────────

When('I open Gmail and find the latest Arena invite email', async ({ settingsInvitePage }) => {
  await settingsInvitePage.openGmailAndFindLatestArenaInviteEmail();
});

When('I click the invite link in the email', async ({ settingsInvitePage }) => {
  await settingsInvitePage.clickInviteLinkFromEmail();
});

// ─── Acceptance: existing account ─────────────────────────────────────────────

Then('the invite acceptance page should show the email pre-filled without a name field', async ({ settingsInvitePage }) => {
  await settingsInvitePage.invitePageShouldShowEmailPrefilledWithoutNameField();
});

When('I fill in the invite password and submit', async ({ settingsInvitePage }) => {
  await settingsInvitePage.fillInvitePasswordAndSubmit();
});

// ─── Acceptance: new account ───────────────────────────────────────────────────

Then('the invite acceptance page should show a name field for new account signup', async ({ settingsInvitePage }) => {
  await settingsInvitePage.invitePageShouldShowNameFieldForNewAccountSignup();
});

When('I fill in the invite name, password and submit', async ({ settingsInvitePage }) => {
  await settingsInvitePage.fillInviteNamePasswordAndSubmit();
});

// ─── Invite row actions ─────────────────────────────────────────────────────────

When('I resend the first pending invite', async ({ settingsInvitePage }) => {
  await settingsInvitePage.resendFirstPendingInvite();
});

When('I copy the link of the first pending invite', async ({ settingsInvitePage }) => {
  await settingsInvitePage.copyLinkOfFirstPendingInvite();
});

When('I delete the first pending invite', async ({ settingsInvitePage }) => {
  await settingsInvitePage.deleteFirstPendingInvite();
});

When('I open the copied invite link', async ({ settingsInvitePage }) => {
  await settingsInvitePage.openCopiedInviteLink();
});

Then('I close the invite link page', async ({ settingsInvitePage }) => {
  await settingsInvitePage.closeInviteContext();
});

Then('the invite link should be invalid', async ({ settingsInvitePage }) => {
  await settingsInvitePage.inviteLinkShouldBeInvalid();
});

// ─── Post-acceptance ───────────────────────────────────────────────────────────

Then('the invite acceptance should redirect to the dashboard', async ({ settingsInvitePage }) => {
  await settingsInvitePage.inviteAcceptanceShouldRedirectToDashboard();
});

Then('the invited user should appear in the team members list', async ({ settingsInvitePage }) => {
  await settingsInvitePage.invitedUserShouldAppearInTeamMembers();
});
