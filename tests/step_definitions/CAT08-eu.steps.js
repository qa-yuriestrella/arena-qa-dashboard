const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { When, Then } = createBdd(test);

// Note: Given('I am on the end user page'), When('I open the text chat'), and all
// auth steps are defined in CAT06-eu-auth.steps.js and shared across both CAT06 and CAT07.

// ─── Voice call ───────────────────────────────────────────────────────────────

When('I click the Call button', async ({ endUserPage }) => {
  await endUserPage.clickCallButton();
});

Then('the call UI should be visible', async ({ endUserPage }) => {
  await endUserPage.callUIShouldBeVisible();
});

Then('a call initiation request should be fired', async ({ endUserPage }) => {
  await endUserPage.callInitiationRequestShouldBeFired();
});

// ─── Chat window ──────────────────────────────────────────────────────────────

Then('the chat window should be visible', async ({ endUserPage }) => {
  await endUserPage.chatWindowShouldBeVisible();
});

Then('the last message should be from the Avatar', async ({ endUserPage }) => {
  await endUserPage.lastMessageShouldBeFromAvatar();
});

// ─── API request assertions ───────────────────────────────────────────────────

Then('a create-session request should be fired', async ({ endUserPage }) => {
  await endUserPage.createSessionRequestShouldBeFired();
});

Then('a send-message request should be fired', async ({ endUserPage }) => {
  await endUserPage.sendMessageRequestShouldBeFired();
});

// ─── Messaging ────────────────────────────────────────────────────────────────

When('I send the message {string}', async ({ endUserPage }, message) => {
  await endUserPage.sendMessage(message);
});

Then('the Avatar should respond', async ({ endUserPage }) => {
  await endUserPage.avatarShouldRespond();
});
