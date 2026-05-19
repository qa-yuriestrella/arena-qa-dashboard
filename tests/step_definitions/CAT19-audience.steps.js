const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I am on the Audience page', async ({ audiencePage }) => {
  await audiencePage.visit();
});

// ─── UI ────────────────────────────────────────────────────────────────────────

Then('the audience page title should be visible', async ({ audiencePage }) => {
  await audiencePage.titleShouldBeVisible();
});

Then('the audience search input should be visible', async ({ audiencePage }) => {
  await audiencePage.searchInputShouldBeVisible();
});

Then('the audience date picker should be visible', async ({ audiencePage }) => {
  await audiencePage.datePickerShouldBeVisible();
});

Then('the Columns button should be visible', async ({ audiencePage }) => {
  await audiencePage.columnsButtonShouldBeVisible();
});

Then('the Export CSV button should be visible', async ({ audiencePage }) => {
  await audiencePage.exportCsvButtonShouldBeVisible();
});

Then('the audience table or empty state should be visible', async ({ audiencePage }) => {
  await audiencePage.tableOrEmptyStateShouldBeVisible();
});

// ─── Search ────────────────────────────────────────────────────────────────────

When('I type {string} in the audience search and press Enter', async ({ audiencePage }, term) => {
  await audiencePage.searchAndPressEnter(term);
});

Then('the audience search tag {string} should be visible', async ({ audiencePage }, term) => {
  await audiencePage.searchTagShouldBeVisible(term);
});

When('I remove the audience search tag', async ({ audiencePage }) => {
  await audiencePage.removeSearchTag();
});

Then('the audience search tag should not be visible', async ({ audiencePage }) => {
  await audiencePage.searchTagShouldNotBeVisible();
});

Then('the audience no results message should be visible', async ({ audiencePage }) => {
  await audiencePage.noResultsMessageShouldBeVisible();
});

// ─── Date filter ───────────────────────────────────────────────────────────────

When('I open the audience date picker and cancel without applying', async ({ audiencePage }) => {
  await audiencePage.openDatePickerAndCancelWithoutApplying();
});

When('I open the audience date picker, select a date range and apply', async ({ audiencePage }) => {
  await audiencePage.openDatePickerSelectAndApply();
});

Then('the audience date picker should show the selected range', async ({ audiencePage }) => {
  await audiencePage.datePickerShouldShowSelectedRange();
});

// ─── Columns filter ────────────────────────────────────────────────────────────

When('I enable all hidden columns in the Columns dropdown', async ({ audiencePage }) => {
  await audiencePage.enableAllHiddenColumns();
});

Then('all column headers should be visible in the audience table', async ({ audiencePage }) => {
  await audiencePage.allColumnHeadersShouldBeVisible();
});

When('I disable all columns in the Columns dropdown', async ({ audiencePage }) => {
  await audiencePage.disableAllColumns();
});

Then('no data column headers should be visible in the audience table', async ({ audiencePage }) => {
  await audiencePage.noDataColumnHeadersShouldBeVisible();
});

// ─── Export CSV ────────────────────────────────────────────────────────────────

When('I click the Export CSV button and cancel the modal', async ({ audiencePage }) => {
  await audiencePage.clickExportCsvAndCancel();
});

When('I click the Export CSV button and confirm the export', async ({ audiencePage }) => {
  await audiencePage.clickExportCsvAndConfirm();
});

Then('the audience export modal should close', async ({ audiencePage }) => {
  await audiencePage.exportModalShouldClose();
});

// ─── Ban / Unban ───────────────────────────────────────────────────────────────

When('I ban the first audience user', async ({ audiencePage }) => {
  await audiencePage.banFirstUser();
});

When('I unban the first audience user', async ({ audiencePage }) => {
  await audiencePage.unbanFirstUser();
});

Then('the first audience row status should show {string}', async ({ audiencePage }, status) => {
  await audiencePage.firstRowStatusShouldShow(status);
});

// ─── Mock API ──────────────────────────────────────────────────────────────────

Given('the audience API is mocked to return a newly signed-up user', async ({ audiencePage }) => {
  await audiencePage.audienceMockedToReturnNewUser();
});

Then('the signed-up user should be listed in the audience table', async ({ audiencePage }) => {
  await audiencePage.signedUpUserShouldBeListedInTable();
});
