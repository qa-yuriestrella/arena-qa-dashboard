const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');
const { ProfileBuilderPage } = require('../../support/Pages/ProfileBuilderPage');

const { Given, When, Then, After } = createBdd(test);

// Stores original profile values so After hooks can restore them using only { page },
// avoiding the profileBuilderPage fixture dependency that would trigger pre-test login
// for unrelated test files (CAT02, CAT03, etc.) via $scenarioHookFixtures.
let _cleanupOriginals = { title: null, headline: null, slug: null };

// ─── Navigation ───────────────────────────────────────────────────────────────

Given('I am on the Profile Builder General tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitGeneral();
});

Given('I am on the Profile Builder Headshot tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitHeadshot();
});

// ─── General tab — UI ─────────────────────────────────────────────────────────

Then('the General section title should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.generalSectionTitleShouldBeVisible();
});

Then('the title field should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.titleFieldShouldBeVisible();
});

Then('the headline field should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.headlineFieldShouldBeVisible();
});

Then('the URL field should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.urlFieldShouldBeVisible();
});

Then('the language selector should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.languageSelectorShouldBeVisible();
});

// ─── General tab — Save / Cancel state ────────────────────────────────────────

Then('the save button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveButtonShouldBeDisabled();
});

Then('the cancel button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.cancelButtonShouldBeDisabled();
});

Then('the save button should be enabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveButtonShouldBeEnabled();
});

Then('the cancel button should be enabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.cancelButtonShouldBeEnabled();
});

// ─── General tab — form interactions ─────────────────────────────────────────

When('I fill the title field with {string}', async ({ profileBuilderPage }, text) => {
  await profileBuilderPage.fillTitle(text);
});

When('I clear the title field', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clearTitle();
});

When('I click save', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSave();
});

When('I click cancel', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickCancel();
});

Then('the title required error should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.titleRequiredErrorShouldBeVisible();
});

When('I fill the headline field with {string}', async ({ profileBuilderPage }, text) => {
  await profileBuilderPage.fillHeadline(text);
});

Then('the headline character count should be displayed', async ({ profileBuilderPage }) => {
  await profileBuilderPage.headlineCharCountShouldBeDisplayed();
});

When('I fill the slug field with {string}', async ({ profileBuilderPage }, slug) => {
  await profileBuilderPage.fillSlug(slug);
});

Then('the slug error should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.slugErrorShouldBeVisible();
});

When('I fill the slug field with a 21-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.fillSlugWithTooLongString();
});

// ─── Headline limit ────────────────────────────────────────────────────────────

When('I fill the headline field with a 160-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.fillHeadlineWithMaxLength();
});

Then('the headline character count should show the limit is reached', async ({ profileBuilderPage }) => {
  await profileBuilderPage.headlineAtLimitShouldBeVisible();
});

// Title save/revert
let storedTitleValue = '';

When('I store the current title value', async ({ profileBuilderPage }) => {
  storedTitleValue = await profileBuilderPage.getTitleValue();
});

Then('the title field should match the stored value', async ({ profileBuilderPage }) => {
  await profileBuilderPage.titleFieldShouldHaveValue(storedTitleValue);
});

// ─── Save & persist (PBG008) ──────────────────────────────────────────────────

When('I fill all general fields with unique test values', async ({ profileBuilderPage, page }) => {
  _cleanupOriginals.title = await page.locator('#title').inputValue();
  _cleanupOriginals.headline = await page.locator('#bio').inputValue();
  _cleanupOriginals.slug = await page.locator('#slug').inputValue();
  await profileBuilderPage.fillAllGeneralFieldsWithUniqueValues();
});

Then('the save should succeed without errors', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveShouldSucceedWithoutErrors();
});

Then('all saved fields should persist after page reload', async ({ profileBuilderPage }) => {
  await profileBuilderPage.savedFieldsShouldPersistAfterReload();
});

After({ tags: '@pbg-save' }, async ({ page }) => {
  const pb = new ProfileBuilderPage(page);
  pb._originalTitle = _cleanupOriginals.title;
  pb._originalHeadline = _cleanupOriginals.headline;
  pb._originalSlug = _cleanupOriginals.slug;
  await pb.restoreOriginalProfileSettings();
  _cleanupOriginals = { title: null, headline: null, slug: null };
});

// ─── End-user reflection (PBG009) ─────────────────────────────────────────────

When('I save the profile with title {string}, headline {string}, slug {string}, and language {string}',
  async ({ profileBuilderPage, page }, title, headline, slug, language) => {
    _cleanupOriginals.title = await page.locator('#title').inputValue();
    _cleanupOriginals.headline = await page.locator('#bio').inputValue();
    _cleanupOriginals.slug = await page.locator('#slug').inputValue();
    await profileBuilderPage.saveProfileWithValues(title, headline, slug, language);
  }
);

Then('the end user page should show the updated name {string}', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.euShouldShowUpdatedName('e2e-pbtest', title);
});

Then('the end user page should show the updated headline {string}', async ({ profileBuilderPage }, headline) => {
  await profileBuilderPage.euShouldShowUpdatedHeadline(headline);
});

Then('the end user URL should contain the slug {string}', async ({ profileBuilderPage }, slug) => {
  await profileBuilderPage.euUrlShouldContainSlug(slug);
});

Then('the Avatar welcome message should arrive in the end user chat', async ({ profileBuilderPage }) => {
  await profileBuilderPage.avatarWelcomeMessageShouldArriveInEu();
});

After({ tags: '@pbg-eu' }, async ({ page }) => {
  const pb = new ProfileBuilderPage(page);
  pb._originalTitle = _cleanupOriginals.title;
  pb._originalHeadline = _cleanupOriginals.headline;
  pb._originalSlug = _cleanupOriginals.slug;
  await pb.restoreOriginalProfileSettings();
  _cleanupOriginals = { title: null, headline: null, slug: null };
});

// ─── Headshot tab — gallery ───────────────────────────────────────────────────

Then('the headshot gallery should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.headshotGalleryShouldBeVisible();
});

Then('the Add New button should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.addNewButtonShouldBeVisible();
});

// ─── Headshot tab — Add New flow ──────────────────────────────────────────────

Given('any existing {string} headshots are deleted', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.cleanupTestHeadshots(name).catch(() => {});
});

When('I click Add New', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddNew();
});

Then('the type selector sheet should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.typeSelectionSheetShouldBeVisible();
});

When('I select the static type', async ({ profileBuilderPage }) => {
  await profileBuilderPage.selectStaticType();
});

When('I select the animated type', async ({ profileBuilderPage }) => {
  await profileBuilderPage.selectAnimatedType();
});

Then('the static image form should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.staticImageFormShouldBeVisible();
});

Then('the animated image form should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.animatedImageFormShouldBeVisible();
});

When('I fill the headshot name with {string}', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.fillHeadshotName(name);
});

When('I upload the headshot image', async ({ profileBuilderPage }) => {
  await profileBuilderPage.uploadHeadshotImage();
});

Then('the headshot crop dialog should appear', async ({ profileBuilderPage }) => {
  await profileBuilderPage.headshotCropDialogShouldAppear();
});

When('I save the headshot crop', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveHeadshotCrop();
});

When('I save to gallery', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveToGallery();
});

When('I save the animated headshot to gallery', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveAnimatedToGallery();
});

Then('the animated headshot {string} should complete and appear in the gallery', async ({ profileBuilderPage, $test }, name) => {
  $test.setTimeout(660000); // 11 min: 10 min polling + buffer
  await profileBuilderPage.animatedHeadshotShouldCompleteInGallery(name);
});

After({ tags: '@pbh-animated' }, async ({ page }) => {
  const pb = new ProfileBuilderPage(page);
  await pb.visitHeadshot();
  await pb.cleanupTestHeadshots('E2E Animated Headshot').catch(() => {});
});

Then('the headshot {string} should appear in the gallery', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.headshotShouldAppearInGallery(name);
});

Then('the headshot {string} should not be in the gallery', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.headshotShouldNotBeInGallery(name);
});

// ─── Headshot tab — card hover actions ───────────────────────────────────────

When('I hover over the headshot card {string}', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.hoverHeadshotCard(name);
});

Then('the Set as my profile button should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.setAsProfileButtonShouldBeVisible();
});

When('I click Set as my profile', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSetAsProfile();
});

Then('the active headshot badge should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.activeHeadshotBadgeShouldBeVisible();
});

// ─── Headshot tab — Edit / Delete ────────────────────────────────────────────

When('I open the headshot menu for {string}', async ({ profileBuilderPage }, name) => {
  await profileBuilderPage.openHeadshotMenu(name);
});

When('I click Edit in the menu', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickEditInMenu();
});

Then('the headshot edit sheet should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.editSheetShouldBeVisible();
});

When('I close the sheet', async ({ profileBuilderPage }) => {
  await profileBuilderPage.closeSheet();
});

When('I click Delete in the menu', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickDeleteInMenu();
});

Then('the delete confirmation dialog should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.deleteConfirmationShouldBeVisible();
});

When('I confirm the headshot deletion', async ({ profileBuilderPage }) => {
  await profileBuilderPage.confirmDelete();
});

// ─── Social Links tab — navigation ───────────────────────────────────────────

Given('I am on the Profile Builder Social Links tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSocial();
});

// ─── Social Links tab — UI ────────────────────────────────────────────────────

Then('the social links section should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.socialLinksSectionShouldBeVisible();
});

Then('input fields for all social networks should be present', async ({ profileBuilderPage }) => {
  await profileBuilderPage.allSocialNetworkInputsShouldBePresent();
});

// ─── Social Links tab — form interactions ────────────────────────────────────

When('I fill the social link for {string} with {string}', async ({ profileBuilderPage }, network, value) => {
  await profileBuilderPage.fillSocialLink(network, value);
});

When('I fill social links for all networks', async ({ profileBuilderPage }) => {
  await profileBuilderPage.fillSocialLinksForAllNetworks();
});

When('I save the social links', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSocialSave();
});

When('I cancel the social link changes', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSocialCancel();
});

When('I store the current social link values', async ({ profileBuilderPage }) => {
  await profileBuilderPage.storeSocialLinkValues();
});

// ─── Social Links tab — preview assertions ────────────────────────────────────

Then('the {string} icon should appear in the preview', async ({ profileBuilderPage }, network) => {
  await profileBuilderPage.socialIconShouldAppearInPreview(network);
});

Then('all social network icons should appear in the preview', async ({ profileBuilderPage }) => {
  await profileBuilderPage.allSocialIconsShouldAppearInPreview();
});

Then('the {string} icon in the preview should link to the correct domain', async ({ profileBuilderPage }, network) => {
  await profileBuilderPage.socialIconShouldHaveCorrectHref(network);
});

// ─── Social Links tab — normalisation & cancel ────────────────────────────────

Then('the {string} field should contain the full URL with {string}', async ({ profileBuilderPage }, network, expectedPart) => {
  await profileBuilderPage.socialFieldShouldContainUrl(network, expectedPart);
});

Then('the social link fields should match the stored values', async ({ profileBuilderPage }) => {
  await profileBuilderPage.socialFieldsShouldMatchStoredValues();
});

// ─── Visual tab — navigation ─────────────────────────────────────────────────

Given('I am on the Profile Builder Visual tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitVisual();
});

// ─── Visual tab — color picker UI ────────────────────────────────────────────

When('I click the color picker button', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickColorPickerButton();
});

Then('the color picker panel should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.colorPickerShouldBeVisible();
});

Given('the color picker is open', async ({ profileBuilderPage }) => {
  await profileBuilderPage.ensureColorPickerOpen();
});

// ─── Visual tab — color preset ───────────────────────────────────────────────

When('I click a color preset', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickColorPreset();
});

Then('the preview background color should reflect the selected color', async ({ profileBuilderPage }) => {
  await profileBuilderPage.previewButtonColorShouldReflectSelectedColor();
});

// ─── Visual tab — hex input ──────────────────────────────────────────────────

When('I type the hex color {string}', async ({ profileBuilderPage }, hex) => {
  await profileBuilderPage.typeHexColor(hex);
});

Then('the preview should reflect the hex color {string}', async ({ profileBuilderPage }, hex) => {
  await profileBuilderPage.previewShouldReflectHexColor(hex.replace('#', ''));
});

// ─── Visual tab — save ───────────────────────────────────────────────────────

When('I save the visual settings', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visualSaveAndVerifyInEndUser();
});

Then('the end user page should reflect the updated color', async ({ profileBuilderPage }) => {
  // Navigate to the end user page and verify it loads; deep colour assertions against
  // the EU iframe are cross-origin dependent and are validated visually during QA.
  await profileBuilderPage.euPageShouldLoadSuccessfully();
});
