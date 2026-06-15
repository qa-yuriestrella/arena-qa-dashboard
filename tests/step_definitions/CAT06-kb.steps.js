const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');
const { KnowledgeBasePage } = require('../../support/Pages/KnowledgeBasePage');
const { ensureModernAvatar, ensurePrimaryAvatar } = require('../../support/helpers/avatarHelper');

const { Given, When, Then, After } = createBdd(test);

// ─── Background ───────────────────────────────────────────────────────────────

Given('I am logged in and on the knowledge base page', async ({ kbPage }) => {
  await kbPage.visit();
});

// ─── Visibility ───────────────────────────────────────────────────────────────

Then('the {string} integration button should be visible', async ({ kbPage }, platform) => {
  await kbPage.platformButtonShouldBeVisible(platform);
});

Then('all main platform integration buttons should be visible', async ({ kbPage }) => {
  await kbPage.allMainButtonsShouldBeVisible();
});

Then('all additional integration buttons should be visible', async ({ kbPage }) => {
  await kbPage.allAdditionalButtonsShouldBeVisible();
});

When('I open the additional integrations menu', async ({ kbPage }) => {
  await kbPage.openAddMoreMenu();
});

// ─── Modal behavior ───────────────────────────────────────────────────────────

When('I click the {string} integration button', async ({ kbPage }, platform) => {
  await kbPage.clickPlatformButton(platform);
});

Given('the integration modal is open for {string}', async ({ kbPage }, platform) => {
  await kbPage.clickPlatformButton(platform);
});

When('the integration modal is opened for {string}', async ({ kbPage }, platform) => {
  await kbPage.clickPlatformButton(platform);
});

Then('every integration button should open the modal and show a pending card', async ({ kbPage }) => {
  await kbPage.everyButtonShouldOpenModalWithPendingCard();
});

Then('the integration modal should be visible', async ({ kbPage }) => {
  await kbPage.integrationModalShouldBeVisible();
});

Then('the integration modal should be closed', async ({ kbPage }) => {
  await kbPage.integrationModalShouldBeClosed();
});

Then('the pending integration card should not be visible', async ({ kbPage }) => {
  await kbPage.pendingCardShouldNotBeVisible();
});

When('I click Cancel in the integration modal', async ({ kbPage }) => {
  await kbPage.clickCancelInModal();
});

When('I close the integration modal with the X button', async ({ kbPage }) => {
  await kbPage.closeModalWithX();
});

When('I click outside the integration modal', async ({ kbPage }) => {
  await kbPage.clickOutsideModal();
});

// ─── URL validation ───────────────────────────────────────────────────────────

When('I enter {string} as the integration URL', async ({ kbPage }, url) => {
  await kbPage.enterIntegrationUrl(url);
});

When('I submit the integration', async ({ kbPage }) => {
  await kbPage.submitIntegration();
});

Then('I should see the error {string}', async ({ kbPage }, message) => {
  await kbPage.shouldSeeError(message);
});

Then('I should see a validation error message', async ({ kbPage }) => {
  await kbPage.shouldSeeAnyValidationError();
});

// ─── Integration loading flow ─────────────────────────────────────────────────

When('I enter a valid {string} URL', async ({ kbPage }, platform) => {
  const testUrls = {
    Youtube: 'orochidois1692',
    X: 'opovo',
    Instagram: 'https://www.instagram.com/natgeo',
    Facebook: 'https://www.facebook.com/igaounderground',
    LinkedIn: 'https://www.linkedin.com/in/caito-maia',
    TikTok: 'https://www.tiktok.com/@mazzola',
    Reddit: 'https://www.reddit.com/r/leagueoflegends/',
    Shopify: 'https://kyliecosmetics.com',
  };
  await kbPage.enterIntegrationUrl(testUrls[platform] || '');
});

Then('the integration card should show a loading spinner', async ({ kbPage }) => {
  await kbPage.integrationCardShouldShowSpinner();
});

Then('the connection line to the card should be dashed', async ({ kbPage }) => {
  await kbPage.connectionLineShouldBeDashed();
});

Then('all integrations should be completed', async ({ kbPage }) => {
  await kbPage.allIntegrationsShouldBeCompleted();
});

Then('every integration should reject an invalid URL', async ({ kbPage }) => {
  await kbPage.everyIntegrationShouldRejectInvalidUrl();
});

Then('every integration should reject a URL from the wrong platform', async ({ kbPage }) => {
  await kbPage.everyIntegrationShouldRejectWrongPlatformUrl();
});

Given('I created social integrations', async ({ kbPage, $test }) => {
  $test.setTimeout(720000); // 12 min: submission + up to 10 min polling for completion
  await kbPage.createSocialIntegrations();
});

Then('all social integrations should complete successfully', async ({ kbPage }) => {
  await kbPage.socialIntegrationsShouldComplete();
});

// ─── Given: pre-existing integration preconditions ───────────────────────────

Given('I have an existing loaded integration', async ({ kbPage, $test }) => {
  $test.setTimeout(720000); // extend timeout in case integrations need to be created
  await kbPage.firstLoadedIntegrationShouldExist();
});

Given('I have an existing enabled integration', async ({ kbPage }) => {
  await kbPage.ensureIntegrationEnabled();
});

Given('I have an existing disabled integration', async ({ kbPage }) => {
  await kbPage.ensureIntegrationDisabled();
});

// ─── KB010: Loaded card assertions ────────────────────────────────────────────

Then('the card should show the profile name', async ({ kbPage }) => {
  await kbPage.cardShouldShowProfileName();
});

Then('the card should show the profile image', async ({ kbPage }) => {
  await kbPage.cardShouldShowProfileImage();
});

// ─── KB007: Post count ────────────────────────────────────────────────────────

Then('each loaded card should show the correct post count', async ({ kbPage }) => {
  await kbPage.allLoadedCardsShouldShowPostCount();
});

// ─── KB008: All-cards profile tab ────────────────────────────────────────────

Then('each integration profile tab should show bio and account information', async ({ kbPage }) => {
  await kbPage.eachIntegrationProfileTabShouldShowBioAndAccountInformation();
});

// ─── KB009: All-cards posts tab ───────────────────────────────────────────────

Then('each integration posts tab should list posts with title, date and action menus', async ({ kbPage }) => {
  await kbPage.eachIntegrationPostsTabShouldListPostsWithTitleDateAndActions();
});

// ─── KB011–KB015: Config modal navigation ────────────────────────────────────

When('I open the integration config modal', async ({ kbPage }) => {
  await kbPage.openIntegrationConfigModal();
});

When('I navigate to the {string} tab', async ({ kbPage }, tab) => {
  await kbPage.navigateToTab(tab);
});

// ─── KB011: Profile tab ───────────────────────────────────────────────────────

Then('the Profile tab should show the bio', async ({ kbPage }) => {
  await kbPage.profileTabShouldShowBio();
});

Then('the Profile tab should show the account information', async ({ kbPage }) => {
  await kbPage.profileTabShouldShowAccountInformation();
});

// ─── KB012–KB013: Posts tab ───────────────────────────────────────────────────

Then('posts should be listed with title and posted-on date', async ({ kbPage }) => {
  await kbPage.postsShouldBeListedWithTitleAndDate();
});

Then('each post should have a three-dot action menu', async ({ kbPage }) => {
  await kbPage.eachPostShouldHaveActionMenu();
});

When('I click {string} on the first post', async ({ kbPage }, action) => {
  await kbPage.clickActionOnFirstPost(action);
});

Then('I should see the post URL, created at, hashtags and author link', async ({ kbPage }) => {
  await kbPage.postDetailsShouldBeVisible();
});

Then('each integration post details should show full metadata', async ({ kbPage }) => {
  await kbPage.eachIntegrationPostDetailsShouldShowFullMetadata();
});

// ─── KB014: Load latest posts ────────────────────────────────────────────────

When('I click Load Latest Posts', async ({ kbPage }) => {
  await kbPage.clickLoadLatestPosts();
});

Then('the integration should show the loading state', async ({ kbPage }) => {
  await kbPage.integrationShouldShowLoadingState();
});

Then('each integration load latest posts should trigger a refresh', async ({ kbPage }) => {
  await kbPage.eachIntegrationLoadLatestPostsShouldTriggerRefresh();
});

// ─── KB012: Metadata tab (all cards) ─────────────────────────────────────────

Then('each integration metadata tab should show integration details', async ({ kbPage }) => {
  await kbPage.eachIntegrationMetadataTabShouldShowDetails();
});

// ─── KB013–KB015: Settings tab (all cards) ───────────────────────────────────

Then('each integration settings tab should have enable source toggle', async ({ kbPage }) => {
  await kbPage.eachIntegrationSettingsTabShouldHaveToggle();
});

Then('each integration source should be disableable', async ({ kbPage }) => {
  await kbPage.eachIntegrationSourceShouldBeDisableable();
});

Then('each integration source should be enableable', async ({ kbPage }) => {
  await kbPage.eachIntegrationSourceShouldBeEnableable();
});

// ─── KB013 (merged): Both delete methods ─────────────────────────────────────

Then('social integrations should be deleted via both methods', async ({ kbPage }) => {
  await kbPage.socialIntegrationsShouldBeDeletedViaBothMethods();
});

// ─── KB016–KB017: Delete (all cards) ─────────────────────────────────────────

Then('each integration should be deleted from the config modal', async ({ kbPage }) => {
  await kbPage.eachIntegrationShouldBeDeletedFromConfigModal();
});

Then('each integration should be deleted from the card button', async ({ kbPage }) => {
  await kbPage.eachIntegrationShouldBeDeletedFromCardButton();
});

// ─── KB018: Duplicate URL (all platforms) ────────────────────────────────────

Then('every integration should show a duplicate error when added twice', async ({ kbPage }) => {
  await kbPage.everyIntegrationShouldShowDuplicateError();
});

// ─── Legacy single-card steps (kept for backward compatibility) ───────────────

Then('I should see the integration id, URL, posts count, integrated at and last update', async ({ kbPage }) => {
  await kbPage.metadataShouldShowIntegrationDetails();
});

Then('the Enable Source toggle should be visible', async ({ kbPage }) => {
  await kbPage.enableSourceToggleShouldBeVisible();
});

When('I toggle the source off', async ({ kbPage }) => {
  await kbPage.toggleSourceOff();
});

Then('the integration should be marked as disabled', async ({ kbPage }) => {
  await kbPage.integrationShouldBeMarkedAsDisabled();
});

When('I toggle the source on', async ({ kbPage }) => {
  await kbPage.toggleSourceOn();
});

Then('the integration should be marked as enabled', async ({ kbPage }) => {
  await kbPage.integrationShouldBeMarkedAsEnabled();
});

When('I click Delete in the config modal', async ({ kbPage }) => {
  await kbPage.clickDeleteInConfigModal();
});

Then('the integration card should not be visible', async ({ kbPage }) => {
  await kbPage.integrationCardShouldNotBeVisible();
});

When('I click the delete button directly on the card', async ({ kbPage }) => {
  await kbPage.clickDeleteButtonDirectlyOnCard();
});

// ─── KB013: Create other source integrations ────────────────────────────────

Given('I have existing other source integrations', async ({ kbPage }) => {
  await kbPage.ensureOtherIntegrationsLoaded();
});

When('I create the other source integrations', async ({ kbPage }) => {
  await kbPage.createOtherIntegrations();
});

Then('all other source integration cards should be visible', async ({ kbPage }) => {
  await kbPage.otherIntegrationCardsShouldBeVisible();
});

Then('website and reddit integrations should complete', async ({ kbPage, $test }) => {
  $test.setTimeout(360000); // 6 min
  await kbPage.websiteAndRedditIntegrationsShouldComplete();
});

// ─── KB014: Edit Text and Biography ─────────────────────────────────────────

Then('text and biography integrations should be editable', async ({ kbPage }) => {
  await kbPage.editTextAndBiographyIntegrations();
});

// ─── KB018–KB020: Recreate all integrations ──────────────────────────────────

Given('I created all integrations', async ({ kbPage }) => {
  await kbPage.createAllIntegrations();
});

// ─── KB019 (old KB022): Bulk delete ──────────────────────────────────────────

When('I drag to select all integrations in the canvas', async ({ kbPage }) => {
  await kbPage.dragSelectAllIntegrations();
});

Then('the bulk action bar should be visible', async ({ kbPage }) => {
  await kbPage.bulkActionBarShouldBeVisible();
});

When('I click Delete all in the bulk action bar', async ({ kbPage }) => {
  await kbPage.clickDeleteAllInBulkBar();
});

Then('the bulk delete confirmation dialog should be visible', async ({ kbPage }) => {
  await kbPage.bulkDeleteConfirmationShouldBeVisible();
});

When('I confirm the bulk delete', async ({ kbPage }) => {
  await kbPage.confirmBulkDelete();
});

// ─── KB023–KB025: Skills ──────────────────────────────────────────────────────

When('I click the Skills button', async ({ kbPage }) => {
  await kbPage.clickSkillsButton();
});

When('I click the {string} skill', async ({ kbPage }, skillName) => {
  await kbPage.clickSkillInPopover(skillName);
});

Then('the skill drawer should be visible', async ({ kbPage }) => {
  await kbPage.skillDrawerShouldBeVisible();
});

Then('the conversations skill should show as always active', async ({ kbPage }) => {
  await kbPage.conversationsSkillShouldShowAlwaysActive();
});

// ─── KB024: Seller ────────────────────────────────────────────────────────────

When('I enable the seller skill', async ({ kbPage }) => {
  await kbPage.enableSellerSkill();
});

Then('the seller skill should be enabled in the commerce-ai response', async ({ kbPage }) => {
  await kbPage.sellerSkillShouldBeEnabledInResponse();
});

Then('the Sell Products node should be visible in the knowledge base', async ({ kbPage }) => {
  await kbPage.sellProductsNodeShouldBeVisible();
});

When('I disable the seller skill', async ({ kbPage }) => {
  await kbPage.disableSellerSkill();
});

Then('the seller skill should be disabled in the commerce-ai response', async ({ kbPage }) => {
  await kbPage.sellerSkillShouldBeDisabledInResponse();
});

// ─── KB025: Voice Call ────────────────────────────────────────────────────────

Then('the voice call skill drawer should be visible', async ({ kbPage }) => {
  await kbPage.voiceCallSkillDrawerShouldBeVisible();
});

When('I upload the voice audio file', async ({ kbPage }) => {
  await kbPage.uploadVoiceAudioFile();
});

Then('the voice call enable toggle should be visible', async ({ kbPage }) => {
  await kbPage.voiceCallToggleShouldBeVisible();
});

When('I enable the voice call skill', async ({ kbPage }) => {
  await kbPage.enableVoiceCallSkill();
});

Then('the voice clone request should succeed', async ({ kbPage }) => {
  await kbPage.voiceCloneRequestShouldSucceed();
});

Then('the Voice Calls node should be visible in the knowledge base', async ({ kbPage }) => {
  await kbPage.voiceCallsNodeShouldBeVisible();
});

// ─── KB023–KB024: Voice Call EU visibility ───────────────────────────────────

Given('the voice call skill is enabled', async ({ kbPage }) => {
  await kbPage.ensureVoiceCallEnabled();
});

Given('the voice call skill is enabled for the modern avatar', async ({ kbPage }) => {
  await ensureModernAvatar(kbPage.page);
  // Don't call kbPage.visit() — it always calls ensurePrimaryAvatar() internally.
  // Navigate directly to KB while keeping the modern avatar context.
  await kbPage.page.goto('/knowledge-base');
  await kbPage.page.waitForLoadState('load');
  // Wait for the React Flow canvas to stabilize before opening the skills popover.
  await kbPage.page.locator('.react-flow__node').first()
    .waitFor({ state: 'visible', timeout: 30000 });
  await kbPage.page.waitForTimeout(2000);
  // Explicitly dismiss Avatar Quality panel before operating — it may have appeared during page load.
  await kbPage._dismissOverlays();
  await kbPage.ensureVoiceCallEnabled();
});

When('I disable the voice call skill', async ({ kbPage }) => {
  await kbPage.disableVoiceCallSkill();
});

When('I enable the voice call toggle', async ({ kbPage }) => {
  await kbPage.enableVoiceCallToggle();
});

When('I visit the classic end-user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

When('I visit the modern end-user page', async ({ endUserModernPage }) => {
  await endUserModernPage.visit();
});

When('I navigate back to the knowledge base', async ({ kbPage }) => {
  await kbPage.visit();
});

When('I navigate back to the modern avatar knowledge base', async ({ kbPage }) => {
  await ensureModernAvatar(kbPage.page);
  await kbPage.page.goto('/knowledge-base');
  await kbPage.page.waitForLoadState('load');
  await kbPage.page.locator('.react-flow__node').first()
    .waitFor({ state: 'visible', timeout: 30000 });
  await kbPage.page.waitForTimeout(2000);
});

Then('the voice call button should not be visible on the EU home page', async ({ endUserPage }) => {
  await endUserPage.voiceCallButtonOnHomeShouldNotBeVisible();
});

Then('the voice call icon should not be visible inside the chat', async ({ endUserPage }) => {
  await endUserPage.voiceCallIconInChatShouldNotBeVisible();
});

Then('the voice call button should be visible on the EU home page', async ({ endUserPage }) => {
  await endUserPage.voiceCallButtonOnHomeShouldBeVisible();
});

Then('the voice call icon should be visible inside the chat', async ({ endUserPage }) => {
  await endUserPage.voiceCallIconInChatShouldBeVisible();
});

// ─── KB024: Canvas controls ───────────────────────────────────────────────────

Then('the Select mode should be active', async ({ kbPage }) => {
  await kbPage.selectModeShouldBeActive();
});

When('I click the Move mode button', async ({ kbPage }) => {
  await kbPage.clickMoveMode();
});

Then('the Move mode should be active', async ({ kbPage }) => {
  await kbPage.moveModeShouldBeActive();
});

Then('the Select mode should be inactive', async ({ kbPage }) => {
  await kbPage.selectModeShouldBeInactive();
});

When('I click the Select mode button', async ({ kbPage }) => {
  await kbPage.clickSelectMode();
});

When('I click the Zoom In button', async ({ kbPage }) => {
  await kbPage.clickZoomIn();
});

Then('the canvas zoom level should have increased', async ({ kbPage }) => {
  await kbPage.zoomLevelShouldHaveIncreased();
});

When('I click the Zoom Out button', async ({ kbPage }) => {
  await kbPage.clickZoomOut();
});

Then('the canvas zoom level should have decreased', async ({ kbPage }) => {
  await kbPage.zoomLevelShouldHaveDecreased();
});

When('I click the Fit View button', async ({ kbPage }) => {
  await kbPage.clickFitView();
});

Then('a knowledge base node should be visible', async ({ kbPage }) => {
  await kbPage.knowledgeBaseNodeShouldBeVisible();
});

When('I click the Fullscreen button', async ({ kbPage }) => {
  await kbPage.clickFullscreen();
});

Then('the sidebar should be hidden', async ({ kbPage }) => {
  await kbPage.sidebarShouldBeHidden();
});

When('I click the Show Sidebar button', async ({ kbPage }) => {
  await kbPage.clickShowSidebar();
});

Then('the sidebar should be visible', async ({ kbPage }) => {
  await kbPage.sidebarShouldBeVisible();
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

// Runs as the first Given step (after Background auth) in @kb-clean-start scenarios,
// so the canvas is empty before the scenario creates its own integrations.
Given('I start with a clean knowledge base canvas', async ({ kbPage }) => {
  await kbPage.bulkDeleteAllIntegrations();
});

// Clean up only after scenarios that explicitly test deletion or leave pending/broken state.
// @kb-loaded and @kb-integration are intentionally excluded so that integrations created
// by KB006 are reused by KB007–KB016 (ensureSocialIntegrationsLoaded / ensureOtherIntegrationsLoaded
// already skip creation when integrations exist, saving ~10 min per scenario).
// @kb-clean-start scenarios handle their own pre-test cleanup via the Given step above.
After(
  { tags: '@kb-voice-teardown' },
  async ({ kbPage }) => {
    await kbPage.ensureVoiceCallEnabled();
  }
);

// Restore voice call for automation2arena and switch back to the primary avatar.
After(
  { tags: '@kb-voice-modern-teardown' },
  async ({ kbPage }) => {
    await ensureModernAvatar(kbPage.page);
    // Navigate directly — kbPage.visit() would switch back to primary avatar first.
    await kbPage.page.goto('/knowledge-base');
    await kbPage.page.waitForLoadState('load');
    // Mirror the Given step setup: wait for canvas then dismiss any overlay before restoring.
    await kbPage.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 30000 });
    await kbPage.page.waitForTimeout(2000);
    await kbPage._dismissOverlays();
    await kbPage.ensureVoiceCallEnabled();
    await ensurePrimaryAvatar(kbPage.page);
  }
);

After(
  { tags: '@kb-delete or @kb-validation' },
  async ({ page }) => {
    if (!page.url().includes('/knowledge-base')) return;
    const kb = new KnowledgeBasePage(page);
    await kb.bulkDeleteAllIntegrations();
  }
);
