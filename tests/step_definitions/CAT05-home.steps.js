const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I am logged in and on the home page', async ({ homePage }) => {
  await homePage.visit();
});

When('I click the {string} card', async ({ homePage }, cardText) => {
  await homePage.clickLevelUpCard(cardText);
});

Then('the greeting section should be visible', async ({ homePage }) => {
  await homePage.greetingShouldBeVisible();
});

Then('the greeting should match the current time of day', async ({ homePage }) => {
  await homePage.greetingShouldMatchTimeOfDay();
});

Then('the current URL should contain {string}', async ({ page }, fragment) => {
  const escaped = fragment.replace(/[?=&]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(escaped), { timeout: 10000 });
});

Then('the metrics section should be loaded with data', async ({ homePage }) => {
  await homePage.metricsSectionShouldBeLoadedWithData();
});
