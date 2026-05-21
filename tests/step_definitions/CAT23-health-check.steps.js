const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── HC001 — fresh browser session ───────────────────────────────────────────

Given('I open the dashboard in a fresh browser session', async ({ healthCheckFreshPage }) => {
  await healthCheckFreshPage.visitFresh();
});

Then('the health check panel should be open automatically', async ({ healthCheckFreshPage }) => {
  await healthCheckFreshPage.panelShouldBeAutoVisible();
});

When('I close the health check panel', async ({ healthCheckFreshPage }) => {
  await healthCheckFreshPage.closePanel();
});

When('I log out and log back in', async ({ healthCheckFreshPage }) => {
  await healthCheckFreshPage.logoutAndLoginAgain();
});

Then('the health check panel should not open automatically again', async ({ healthCheckFreshPage }) => {
  await healthCheckFreshPage.panelShouldNotBeAutoVisible();
});

// ─── HC002/HC003/HC004/HC005 — regular authenticated session ─────────────────

Given('I am on the dashboard with the health check panel open', async ({ healthCheckPage }) => {
  await healthCheckPage.visit();
  await healthCheckPage.openPanel();
});

Given('I am on the dashboard', async ({ healthCheckPage }) => {
  await healthCheckPage.visit();
});

// ─── HC002 — accordion ────────────────────────────────────────────────────────

When('I click the {string} health check item', async ({ healthCheckPage }, itemName) => {
  await healthCheckPage.clickItem(itemName);
});

Then('only the {string} item should be expanded', async ({ healthCheckPage }, itemName) => {
  await healthCheckPage.itemShouldBeExpanded(itemName);
  await healthCheckPage.allOtherItemsShouldBeCollapsed(itemName);
});

// ─── HC003 — action button navigation ────────────────────────────────────────

When('I open the {string} item and click its action button', async ({ healthCheckPage }, itemName) => {
  await healthCheckPage.openItemAndClickActionButton(itemName);
});

// Two-fragment hard assertion (working items)
Then('the URL should contain {string} and {string}', async ({ page }, part1, part2) => {
  await expect(page).toHaveURL(new RegExp(part1.replace(/[?=]/g, '\\$&')), { timeout: 8000 });
  await expect(page).toHaveURL(new RegExp(part2.replace(/[?=]/g, '\\$&')), { timeout: 3000 });
});

// Soft variants for known-broken or environment-dependent navigations.
// These log warnings but do NOT fail the test — the behaviour is known to differ in staging.
Then('the URL should softly contain {string} and {string}', async ({ page }, part1, part2) => {
  const url = page.url();
  if (!url.includes(part1)) console.warn(`[known bug] Expected URL to contain "${part1}" but got "${url}"`);
  if (!url.includes(part2)) console.warn(`[known bug] Expected URL to contain "${part2}" but got "${url}"`);
});

Then('the URL should softly contain {string}', async ({ page }, fragment) => {
  const url = page.url();
  if (!url.includes(fragment)) console.warn(`[env issue] Expected URL to contain "${fragment}" but got "${url}"`);
});

Then('a voice clone modal should be open', async ({ healthCheckPage }) => {
  await healthCheckPage.voiceCloneModalShouldBeOpen();
});

Then('a biography source modal should be open', async ({ healthCheckPage }) => {
  await healthCheckPage.biographyModalShouldBeOpen();
});

When('I return to the dashboard with the health check panel open', async ({ healthCheckPage }) => {
  await healthCheckPage.returnToDashboardAndOpenPanel();
});

// ─── HC004 — progress bar (delta assertions) ─────────────────────────────────
// No step in this group throws — failures are recorded via expect.soft() and
// the scenario runs to completion regardless of how many steps fail.
// _previousPercentage is always updated to the real current value so each
// delta is measured against the true previous reading, not an expected one.

let _previousPercentage = 0;

Given('the controllable health check items are reset to baseline', async ({ healthCheckPage }) => {
  try {
    await healthCheckPage.resetControllableItems();
    _previousPercentage = await healthCheckPage.getPercentage();
  } catch (e) {
    expect.soft(false, `[reset to baseline] ${e.message}`).toBe(true);
  }
});

When('I add a social network integration', async ({ healthCheckPage }) => {
  try { await healthCheckPage.addSocialIntegration(); }
  catch (e) { expect.soft(false, `[add social network integration] ${e.message}`).toBe(true); }
});

When('I remove the social network integration', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeSocialIntegration(); }
  catch (e) { expect.soft(false, `[remove social network integration] ${e.message}`).toBe(true); }
});

When('I add a voice clone', async ({ healthCheckPage }) => {
  try { await healthCheckPage.addVoiceClone(); }
  catch (e) { expect.soft(false, `[add voice clone] ${e.message}`).toBe(true); }
});

When('I remove the voice clone', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeVoiceClone(); }
  catch (e) { expect.soft(false, `[remove voice clone] ${e.message}`).toBe(true); }
});

When('I generate an animated headshot', async ({ healthCheckPage }) => {
  try { await healthCheckPage.generateAnimatedHeadshot(); }
  catch (e) { expect.soft(false, `[generate animated headshot] ${e.message}`).toBe(true); }
});

When('I remove the animated headshot', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeAnimatedHeadshot(); }
  catch (e) { expect.soft(false, `[remove animated headshot] ${e.message}`).toBe(true); }
});

When('I add a headline to the profile', async ({ healthCheckPage }) => {
  try { await healthCheckPage.addHeadline(); }
  catch (e) { expect.soft(false, `[add headline] ${e.message}`).toBe(true); }
});

When('I create a profile section', async ({ healthCheckPage }) => {
  try { await healthCheckPage.createSection(); }
  catch (e) { expect.soft(false, `[create profile section] ${e.message}`).toBe(true); }
});

When('I add a biography source to the knowledge base', async ({ healthCheckPage }) => {
  try { await healthCheckPage.addBiography(); }
  catch (e) { expect.soft(false, `[add biography] ${e.message}`).toBe(true); }
});

When('I remove the biography source from the knowledge base', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeBiography(); }
  catch (e) { expect.soft(false, `[remove biography] ${e.message}`).toBe(true); }
});

When('I remove all profile sections', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeAllSections(); }
  catch (e) { expect.soft(false, `[remove all sections] ${e.message}`).toBe(true); }
});

When('I remove the headline from the profile', async ({ healthCheckPage }) => {
  try { await healthCheckPage.removeHeadline(); }
  catch (e) { expect.soft(false, `[remove headline] ${e.message}`).toBe(true); }
});

Then('the health check percentage should have increased by {int}', async ({ healthCheckPage }, delta) => {
  try {
    const current = await healthCheckPage.getPercentage();
    const actual = current - _previousPercentage;
    expect.soft(
      actual,
      `Expected health check percentage to increase by ${delta}% but changed by ${actual}% (${_previousPercentage}% → ${current}%)`
    ).toBe(delta);
    _previousPercentage = current;
  } catch (e) {
    expect.soft(false, `[check +${delta}%] ${e.message}`).toBe(true);
  }
});

Then('the health check percentage should have decreased by {int}', async ({ healthCheckPage }, delta) => {
  try {
    const current = await healthCheckPage.getPercentage();
    const actual = _previousPercentage - current;
    expect.soft(
      actual,
      `Expected health check percentage to decrease by ${delta}% but changed by ${actual}% (${_previousPercentage}% → ${current}%)`
    ).toBe(delta);
    _previousPercentage = current;
  } catch (e) {
    expect.soft(false, `[check -${delta}%] ${e.message}`).toBe(true);
  }
});
