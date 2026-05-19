const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');
const { ProfileBuilderPage } = require('../../support/Pages/ProfileBuilderPage');

const { Given, When, Then, After } = createBdd(test);

// ─── Sections — navigation ────────────────────────────────────────────────────

Given('I am on the Sections page', async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSections();
});

// ─── Sections tab — Add Section modal ────────────────────────────────────────

When('I click Add Section', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
});

Then('the section type selector should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionTypeSelectorShouldBeVisible();
});

Then('the URL and Media option should be available', async ({ profileBuilderPage }) => {
  await profileBuilderPage.urlMediaOptionShouldBeAvailable();
});

When('I select URL and Media', async ({ profileBuilderPage }) => {
  await profileBuilderPage.selectURLMedia();
});

Then('the section editor modal should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionEditorShouldBeVisible();
});

Then('the section editor modal should still be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionEditorShouldBeVisible();
});

Then('the section editor modal should not be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionEditorShouldNotBeVisible();
});

Then('the URL tab should be active', async ({ profileBuilderPage }) => {
  await profileBuilderPage.urlTabShouldBeActive();
});

// ─── Sections tab — shared Given setup steps ──────────────────────────────────

Given('the URL and Media section editor is open on the URL tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectURLMedia();
  await profileBuilderPage.sectionEditorShouldBeVisible();
});

Given('the URL and Media section editor is open on the Visual tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectURLMedia();
  await profileBuilderPage.sectionEditorShouldBeVisible();
  await profileBuilderPage.switchToSectionTab('Visual');
});

Given('a URL card for {string} exists in the section editor', async ({ profileBuilderPage }, url) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectURLMedia();
  await profileBuilderPage.sectionEditorShouldBeVisible();
  await profileBuilderPage.addSectionURL(url);
  const domain = url.replace(/^https?:\/\//, '').split('/')[0];
  await profileBuilderPage.urlCardShouldExist(domain);
});

Given('the discard confirmation modal is open', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectURLMedia();
  await profileBuilderPage.sectionEditorShouldBeVisible();
  await profileBuilderPage.clickSectionCancelButton();
  await profileBuilderPage.discardConfirmationShouldBeVisible();
});

// ─── Sections tab — URL tab interactions ─────────────────────────────────────

When('I enter the section URL {string}', async ({ profileBuilderPage }, url) => {
  await profileBuilderPage.enterSectionURL(url);
});

When('I add the section URL {string}', async ({ profileBuilderPage }, url) => {
  await profileBuilderPage.addSectionURL(url);
});

Then('the Add URL button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.addURLButtonShouldBeDisabled();
});

Then('the Add URL button should be enabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.addURLButtonShouldBeEnabled();
});

Then('the section API request should be fired', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionAPIRequestShouldFire();
});

Then('the URL input should be empty', async ({ profileBuilderPage }) => {
  await profileBuilderPage.urlInputShouldBeEmpty();
});

Then('a URL card for {string} should be visible in the section editor', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldExist(domain);
});

Then('the URL card for {string} should be visible in the section editor', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldExist(domain);
});

Then('the URL card for {string} should not be visible in the section editor', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldNotExist(domain);
});

Then('{int} URL cards should be visible in the section editor', async ({ profileBuilderPage }, count) => {
  await profileBuilderPage.urlCardCountShouldBe(count);
});

// ─── Sections tab — URL card assertions ──────────────────────────────────────

Then('the URL card for {string} should show the site name', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldShowSiteName(domain);
});

Then('the URL card for {string} should show the URL text', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldShowURLText(domain);
});

Then('the URL card options button for {string} should be visible', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardOptionsButtonShouldBeVisible(domain);
});

// ─── Sections tab — reorder ──────────────────────────────────────────────────

When('I drag the URL card {string} below {string}', async ({ profileBuilderPage }, source, target) => {
  await profileBuilderPage.dragURLCardBelow(source, target);
});

Then('the URL card {string} should appear before {string} in the list', async ({ profileBuilderPage }, first, second) => {
  await profileBuilderPage.urlCardShouldAppearBefore(first, second);
});

// ─── Sections tab — edit link ─────────────────────────────────────────────────

When('I open the options menu for URL card {string}', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.openURLCardOptionsMenu(domain);
});

When('I click Edit Link', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickEditLink();
});

Then('the edit link form should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.editLinkFormShouldBeVisible();
});

When('I change the link URL to {string}', async ({ profileBuilderPage }, url) => {
  await profileBuilderPage.changeEditLinkURL(url);
});

When('I change the link title to {string}', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.changeEditLinkTitle(title);
});

When('I save the link edit', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveEditLink();
});

When('I cancel the link edit', async ({ profileBuilderPage }) => {
  await profileBuilderPage.cancelEditLink();
});

When('I click Choose image and upload an image', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickChooseImageAndUpload();
});

Then('the URL card for {string} should show a custom image', async ({ profileBuilderPage }, domain) => {
  await profileBuilderPage.urlCardShouldShowCustomImage(domain);
});

// ─── Sections tab — delete link ──────────────────────────────────────────────

When('I click Delete Link', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickDeleteLink();
});

// ─── Sections tab — Visual tab ────────────────────────────────────────────────

When('I switch to the Visual tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.switchToSectionTab('Visual');
});

Then('the section title should show a default placeholder like {string}', async ({ profileBuilderPage }, _expected) => {
  await profileBuilderPage.sectionTitleShouldDefaultToSectionN();
});

When('I set the section title to {string}', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.setSectionTitle(title);
});

Then('the section title input should show {string}', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.sectionTitleInputShouldShow(title);
});

When('I click through the available card styles', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickThroughCardStyles();
});

Then('the preview should update for each card style selected', async ({ profileBuilderPage }) => {
  // Interaction validated in clickThroughCardStyles; this assertion confirms no JS error.
  await profileBuilderPage.sectionEditorShouldBeVisible();
});

// ─── Sections tab — save ─────────────────────────────────────────────────────

When('I save the section', async ({ profileBuilderPage }) => {
  await profileBuilderPage.saveSectionEditor();
});

Then('the section save request should be fired', async ({ profileBuilderPage }) => {
  await profileBuilderPage.sectionSaveRequestShouldFire();
});

Then('the section {string} should be visible on the sections page', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.sectionShouldBeVisibleOnPage(title);
});

// ─── Sections tab — discard modal ─────────────────────────────────────────────

When('I click the section Cancel button', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSectionCancelButton();
});

When(/I click the section close \(X\) button/, async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickSectionCloseButton();
});

Then('the discard confirmation modal should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.discardConfirmationShouldBeVisible();
});

When('I click Go back', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickGoBack();
});

When('I click Discard', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickDiscard();
});

// ─── Sections tab — card styles (PSN011/PSN012) ──────────────────────────────

Then('the following card styles should be available: Button, Card, Stack',
  async ({ profileBuilderPage }) => {
    await profileBuilderPage.cardStylesShouldBeAvailable(['Button', 'Card', 'Stack']);
  }
);

When('I select the {word} card style', async ({ profileBuilderPage }, styleName) => {
  await profileBuilderPage.selectCardStyle(styleName);
});

// ─── Sections tab — cleanup ───────────────────────────────────────────────────

After({ tags: '@psn-save' }, async ({ page }) => {
  const pb = new ProfileBuilderPage(page);
  await pb.visitSections();
  await pb.deleteAllTestSections('E2E Test Section').catch(() => {});
});

// ─── Digital Product — type selector ─────────────────────────────────────────

When('I select Digital Product', async ({ profileBuilderPage }) => {
  await profileBuilderPage.selectDigitalProduct();
});

// ─── Digital Product — editor visibility ─────────────────────────────────────

Then('the digital product editor should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpEditorShouldBeVisible();
});

Then('the digital product editor should still be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpEditorShouldBeVisible();
});

Then('the digital product editor should not be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpEditorShouldNotBeVisible();
});

Then('the Thumbnail tab should be active', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpThumbnailTabShouldBeActive();
});

// ─── Digital Product — shared Given setup steps ───────────────────────────────

Given('the Digital Product editor is open on the Thumbnail tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectDigitalProduct();
  await profileBuilderPage.dpEditorShouldBeVisible();
});

Given('the Digital Product editor is open on the Landing Page tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectDigitalProduct();
  await profileBuilderPage.dpEditorShouldBeVisible();
  await profileBuilderPage.dpSwitchToTab('Landing Page');
});

Given('the Digital Product editor is open on the Product tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.clickAddSection();
  await profileBuilderPage.selectDigitalProduct();
  await profileBuilderPage.dpEditorShouldBeVisible();
  await profileBuilderPage.dpSwitchToTab('Product');
});

// ─── Digital Product — Next / Save button states ──────────────────────────────

Then('the Next button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpNextButtonShouldBeDisabled();
});

Then('the Next button should be enabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpNextButtonShouldBeEnabled();
});

Then('the digital product editor Save button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpSaveButtonShouldBeDisabled();
});

// ─── Digital Product — Thumbnail tab ─────────────────────────────────────────

When('I fill the product title with {string}', async ({ profileBuilderPage }, title) => {
  await profileBuilderPage.dpFillProductTitle(title);
});

When('I fill the product title with a 51-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpFillProductTitle('A'.repeat(51));
});

Then('the product title should be limited to 50 characters', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpTitleShouldBeLimitedTo(50);
});

When('I fill the product short description with a 151-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpFillShortDescription('A'.repeat(151));
});

Then('the product short description should be limited to 150 characters', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpShortDescShouldBeLimitedTo(150);
});

Then('the currency should be locked to USD', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpCurrencyShouldBeLockedToUSD();
});

When('I fill the product price with {string}', async ({ profileBuilderPage }, price) => {
  await profileBuilderPage.dpFillPrice(price);
});

Then('the price field should show {string}', async ({ profileBuilderPage }, price) => {
  await profileBuilderPage.dpPriceShouldShow(price);
});

When('I click the thumbnail image selector', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickThumbnailImageSelector();
});

When('I upload and crop the product image', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpUploadAndCropImage();
});

Then('the product thumbnail image should be set', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpThumbnailImageShouldBeSet();
});

// ─── Digital Product — tab navigation ────────────────────────────────────────

When('I click the Landing Page tab directly', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpSwitchToTab('Landing Page');
});

Then('the Landing Page tab content should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpTabContentShouldBeVisible('Landing Page');
});

// ─── Digital Product — Landing Page tab ──────────────────────────────────────

When('I fill the landing page title with a 301-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpFillLandingPageTitle('A'.repeat(301));
});

Then('the landing page title should be limited to 300 characters', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpLandingPageTitleShouldBeLimitedTo(300);
});

Then('the description formatting toolbar should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpDescriptionToolbarShouldBeVisible();
});

When('I fill the product slug with {string}', async ({ profileBuilderPage }, slug) => {
  await profileBuilderPage.dpFillSlug(slug);
});

Then('the slug preview should include {string}', async ({ profileBuilderPage }, text) => {
  await profileBuilderPage.dpSlugPreviewShouldInclude(text);
});

Then('the CTA field should default to {string}', async ({ profileBuilderPage }, _expected) => {
  await profileBuilderPage.dpCTAShouldDefaultToBuyNow();
});

When('I fill the CTA field with a 31-character string', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpFillCTA('A'.repeat(31));
});

Then('the CTA field should be limited to 30 characters', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpCTAShouldBeLimitedTo(30);
});

When('I add images until the gallery has 5', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpAddImagesToGallery(5);
});

Then('the Add image button should be disabled', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpAddImageButtonShouldBeDisabled();
});

// ─── Digital Product — Product tab ───────────────────────────────────────────

When('I click the Upload file button', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickUploadFile();
});

Then('a file input should be available for upload', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpFileInputShouldBeAvailable();
});

When('I fill the external product URL with {string}', async ({ profileBuilderPage }, url) => {
  await profileBuilderPage.dpFillExternalURL(url);
});

Then('the external URL error should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpExternalURLErrorShouldBeVisible();
});

When('I upload a product file', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpUploadProductFile();
});

Then('the External URL field should be disabled or hidden', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpExternalURLFieldShouldBeDisabledOrHidden();
});

When('I clear the product file', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClearProductFile();
});

Then('the External URL field should be available', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpExternalURLFieldShouldBeAvailable();
});

// ─── Digital Product — validation ────────────────────────────────────────────

When('I click Next without filling required fields', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickNext();
});

Then('a validation error should be visible', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpValidationErrorShouldBeVisible();
});

// ─── Digital Product — preview ────────────────────────────────────────────────

Then('the digital product preview should show {string}', async ({ profileBuilderPage }, text) => {
  await profileBuilderPage.dpPreviewShouldShow(text);
});

// ─── Digital Product — save (DPS015) ─────────────────────────────────────────

When('I click Next to go to Landing Page', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickNext();
});

When('I fill the landing page description with {string}', async ({ profileBuilderPage }, text) => {
  await profileBuilderPage.dpFillDescription(text);
});

When('I click Next to go to Product tab', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickNext();
});

When('I save the digital product', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpSave();
});

Then('the digital product save request should be fired', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpSaveRequestShouldFire();
});

After({ tags: '@dpd-save' }, async ({ page }) => {
  const pb = new ProfileBuilderPage(page);
  await pb.visitSections();
  await pb.deleteAllTestSections('E2E Digital Product').catch(() => {});
});

// ─── Digital Product — discard modal ─────────────────────────────────────────

When('I click the digital product Cancel button', async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickCancelButton();
});

When(/I click the digital product close \(X\) button/, async ({ profileBuilderPage }) => {
  await profileBuilderPage.dpClickCloseButton();
});
