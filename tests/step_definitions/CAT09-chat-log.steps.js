const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I am on the chat log page', async ({ chatLogPage }) => {
  await chatLogPage.visit();
});

Given('the chat log has at least one conversation', async ({ chatLogPage, browser }) => {
  await chatLogPage.seedIfEmpty(browser);
});

// ─── UI ────────────────────────────────────────────────────────────────────────

Then('the chat log title should be visible', async ({ chatLogPage }) => {
  await chatLogPage.titleShouldBeVisible();
});

Then('the refresh button should be visible', async ({ chatLogPage }) => {
  await chatLogPage.refreshButtonShouldBeVisible();
});

Then('the search input should be visible', async ({ chatLogPage }) => {
  await chatLogPage.searchInputShouldBeVisible();
});

Then('the date picker should be visible', async ({ chatLogPage }) => {
  await chatLogPage.datePickerShouldBeVisible();
});

Then('the clear filter button should be visible', async ({ chatLogPage }) => {
  await chatLogPage.clearFilterButtonShouldBeVisible();
});

// ─── Conversation detail ───────────────────────────────────────────────────────

When('I click the first conversation', async ({ chatLogPage }) => {
  await chatLogPage.clickFirstConversation();
});

Then('the message thread should be visible', async ({ chatLogPage }) => {
  await chatLogPage.messageThreadShouldBeVisible();
});

// ─── Search ────────────────────────────────────────────────────────────────────

When('I search for {string}', async ({ chatLogPage }, term) => {
  await chatLogPage.searchFor(term);
});

Then('the no matching results message should be visible', async ({ chatLogPage }) => {
  await chatLogPage.noMatchingResultsShouldBeVisible();
});

Then('the no matching results message should not be visible', async ({ chatLogPage }) => {
  await chatLogPage.noMatchingResultsShouldNotBeVisible();
});

When('I clear the search', async ({ chatLogPage }) => {
  await chatLogPage.clearSearch();
});

// ─── Date filter ───────────────────────────────────────────────────────────────

When('I open the date picker', async ({ chatLogPage }) => {
  await chatLogPage.openDatePicker();
});

When('I select a date range in the calendar', async ({ chatLogPage }) => {
  await chatLogPage.selectDateRangeInCalendar();
});

When('I click Apply', async ({ chatLogPage }) => {
  await chatLogPage.clickApply();
});

Then('the date filter should be applied', async ({ chatLogPage }) => {
  await chatLogPage.dateFilterShouldBeApplied();
});

When('I click the clear filter button', async ({ chatLogPage }) => {
  await chatLogPage.clickClearFilter();
});

Then('the date filter should be reset to default', async ({ chatLogPage }) => {
  await chatLogPage.dateFilterShouldBeReset();
});

// ─── Refresh ───────────────────────────────────────────────────────────────────

When('I click the refresh button', async ({ chatLogPage }) => {
  await chatLogPage.clickRefresh();
});

Then('the conversation list should reload successfully', async ({ chatLogPage }) => {
  await chatLogPage.conversationListShouldReload();
});

// ─── Integration: end user → chat log ─────────────────────────────────────────

Given('I note the current conversation count', async ({ chatLogPage }) => {
  await chatLogPage.noteConversationCount();
});

When('I send a message from the end user page', async ({ chatLogPage, browser }) => {
  await chatLogPage.sendMessageFromEndUser(browser);
});

When('I conduct a dialogue from the end user page', async ({ chatLogPage, browser }) => {
  await chatLogPage.conductDialogueFromEndUser(browser);
});

Then('the dialogue messages should appear in the chat log', async ({ chatLogPage }) => {
  await chatLogPage.dialogueMessagesShouldAppearInChatLog();
});

Then('a new conversation should appear in the chat log', async ({ chatLogPage }) => {
  await chatLogPage.waitForNewConversation();
});

Then('the sent message should be visible in the conversation detail', async ({ chatLogPage }) => {
  await chatLogPage.sentMessageShouldBeVisibleInConversationDetail();
});

When('I send a message from the end user page as a logged-in user', async ({ chatLogPage, browser }) => {
  await chatLogPage.sendMessageFromLoggedInEuUser(browser);
});

Then('the logged-in user\'s name should be visible in the conversation', async ({ chatLogPage }) => {
  await chatLogPage.loggedInUserNameShouldBeVisible();
});

When('I send a message as anonymous then sign up from the end user page', async ({ chatLogPage, browser }) => {
  await chatLogPage.sendAnonymousMessageThenSignup(browser);
});

Then('the signed-up user\'s name should be visible in the conversation', async ({ chatLogPage }) => {
  await chatLogPage.signedUpUserNameShouldBeVisible();
});

When('I open the end user chat without sending a message', async ({ chatLogPage, browser }) => {
  await chatLogPage.openEndUserChatWithoutSendingMessage(browser);
});

Then('the welcome-only session should not have user messages within {int} seconds', async ({ chatLogPage }, seconds) => {
  await chatLogPage.welcomeOnlySessionShouldNotHaveUserMessages(seconds);
});
