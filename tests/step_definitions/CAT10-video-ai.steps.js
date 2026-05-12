const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

Given('I am on the Video AI page', async ({ videoAIPage }) => {
  await videoAIPage.visit();
});

// ─── UI ────────────────────────────────────────────────────────────────────────

Then('the image upload area should be visible', async ({ videoAIPage }) => {
  await videoAIPage.imageUploadAreaShouldBeVisible();
});

Then('the describe scene section should be visible', async ({ videoAIPage }) => {
  await videoAIPage.describeSceneSectionShouldBeVisible();
});

Then('the avatar say section should be visible', async ({ videoAIPage }) => {
  await videoAIPage.avatarSaySectionShouldBeVisible();
});

Then('the image style options should be visible', async ({ videoAIPage }) => {
  await videoAIPage.imageStyleOptionsShouldBeVisible();
});

Then('the tone options should be visible', async ({ videoAIPage }) => {
  await videoAIPage.toneOptionsShouldBeVisible();
});

Then('the creativity slider should be visible', async ({ videoAIPage }) => {
  await videoAIPage.creativitySliderShouldBeVisible();
});

Then('the voice section should be visible', async ({ videoAIPage }) => {
  await videoAIPage.voiceSectionShouldBeVisible();
});

Then('the generate scene button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.generateButtonShouldBeVisible();
});

Then('the generate scene button should be disabled', async ({ videoAIPage }) => {
  await videoAIPage.generateButtonShouldBeDisabled();
});

Then('the generate scene button should be enabled', async ({ videoAIPage }) => {
  await videoAIPage.generateButtonShouldBeEnabled();
});

// ─── Image upload ──────────────────────────────────────────────────────────────

When('I upload the test image', async ({ videoAIPage }) => {
  await videoAIPage.uploadImage();
});

Then('the crop dialog should appear', async ({ videoAIPage }) => {
  await videoAIPage.cropDialogShouldAppear();
});

When('I save the image crop', async ({ videoAIPage }) => {
  await videoAIPage.saveImageCrop();
});

Then('the image preview should be visible', async ({ videoAIPage }) => {
  await videoAIPage.imagePreviewShouldBeVisible();
});

// ─── Form fields ───────────────────────────────────────────────────────────────

When('I fill the describe scene field with {string}', async ({ videoAIPage }, text) => {
  await videoAIPage.fillDescribeScene(text);
});

When('I fill the describe scene field', async ({ videoAIPage }) => {
  await videoAIPage.fillDescribeScene();
});

Then('the describe scene character count should be displayed', async ({ videoAIPage }) => {
  await videoAIPage.describeSceneCharCountShouldBeDisplayed();
});

When('I fill the avatar say field with {string}', async ({ videoAIPage }, text) => {
  await videoAIPage.fillAvatarSay(text);
});

When('I fill the avatar say field', async ({ videoAIPage }) => {
  await videoAIPage.fillAvatarSay();
});

Then('the avatar say counter should indicate too few words', async ({ videoAIPage }) => {
  await videoAIPage.avatarSayWordCounterShouldIndicateTooFewWords();
});

// ─── Image style ───────────────────────────────────────────────────────────────

When('I select the {string} image style', async ({ videoAIPage }, style) => {
  await videoAIPage.selectImageStyle(style);
});

Then('the {string} image style should be selected', async ({ videoAIPage }, style) => {
  await videoAIPage.imageStyleShouldBeSelected(style);
});

// ─── Tone ──────────────────────────────────────────────────────────────────────

When('I select the {string} tone', async ({ videoAIPage }, tone) => {
  await videoAIPage.selectTone(tone);
});

Then('the {string} tone should be selected', async ({ videoAIPage }, tone) => {
  await videoAIPage.toneShouldBeSelected(tone);
});

// ─── Creativity slider ─────────────────────────────────────────────────────────

When('I adjust the creativity slider', async ({ videoAIPage }) => {
  await videoAIPage.adjustCreativitySlider();
});

Then('the creativity should show {string}%', async ({ videoAIPage }, percentage) => {
  await videoAIPage.creativityShouldShowPercentage(percentage);
});

// ─── Generation ────────────────────────────────────────────────────────────────

When('I click Generate Scene', async ({ videoAIPage }) => {
  await videoAIPage.clickGenerateScene();
});

Then('a scene seed image request should be fired', async ({ videoAIPage }) => {
  await videoAIPage.sceneSeedImageRequestShouldBeFired();
});

Then('the generation progress steps should be visible', async ({ videoAIPage }) => {
  await videoAIPage.generationProgressStepsShouldBeVisible();
});

When('I wait for the video to be generated', async ({ videoAIPage, $test }) => {
  await videoAIPage.waitForVideoToBeGenerated($test);
});

Given('a completed video exists in the account', async ({ videoAIPage }) => {
  // The Video AI page loads the current video on mount; just verify it's present
  await videoAIPage.videoAlreadyExistsShouldBeVisible();
});

// ─── Video player ──────────────────────────────────────────────────────────────

Then('the video player should be visible', async ({ videoAIPage }) => {
  await videoAIPage.videoPlayerShouldBeVisible();
});

Then('the video player should not be visible', async ({ videoAIPage }) => {
  await videoAIPage.videoPlayerShouldNotBeVisible();
});

Then('the play button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.playButtonShouldBeVisible();
});

Then('the progress bar should be visible', async ({ videoAIPage }) => {
  await videoAIPage.progressBarShouldBeVisible();
});

When('I click the play button', async ({ videoAIPage }) => {
  await videoAIPage.clickPlayButton();
});

Then('the video should be playing', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBePlaying();
});

When('I click the pause button', async ({ videoAIPage }) => {
  await videoAIPage.clickPauseButton();
});

Then('the video should be paused', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBePaused();
});

When('I click the volume toggle', async ({ videoAIPage }) => {
  await videoAIPage.clickVolumeToggle();
});

When('I click the volume toggle again', async ({ videoAIPage }) => {
  await videoAIPage.clickVolumeToggle();
});

Then('the video should be muted', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBeMuted();
});

Then('the video should be unmuted', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBeUnmuted();
});

// ─── Add/Remove from profile ───────────────────────────────────────────────────

Given('the scene is not added to the profile', async ({ videoAIPage }) => {
  await videoAIPage.ensureSceneNotInProfile();
});

Then('the add scene to profile button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.addToProfileButtonShouldBeVisible();
});

When('I click add scene to my profile', async ({ videoAIPage }) => {
  await videoAIPage.clickAddToProfile();
});

Then('the remove scene from profile button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.removeFromProfileButtonShouldBeVisible();
});

When('I click remove scene from my profile', async ({ videoAIPage }) => {
  await videoAIPage.clickRemoveFromProfile();
});

// ─── End user — ring ───────────────────────────────────────────────────────────

Given('a scene is added to the end user profile', async ({ videoAIPage }) => {
  // Ensure the video is enabled on the profile
  await videoAIPage.videoAlreadyExistsShouldBeVisible();
  await videoAIPage.addToProfileButtonShouldBeVisible().catch(async () => {
    // Button already shows "Remove" — the video is already added; nothing to do
  });
  // Click add only if the button is still in the "Add" state
  const addBtn = videoAIPage.page.getByRole('button', { name: 'Add Scene to My Profile' });
  if (await addBtn.isVisible().catch(() => false)) {
    await addBtn.click();
  }
});

When('I visit the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

Then('the avatar image should show a video ring', async ({ endUserPage }) => {
  await endUserPage.avatarImageShouldHaveVideoRing();
});

When('I click the avatar image', async ({ endUserPage }) => {
  await endUserPage.clickAvatarImage();
});

Then('the scene video should play', async ({ endUserPage }) => {
  await endUserPage.sceneVideoShouldPlay();
});

// ─── Delete scene ──────────────────────────────────────────────────────────────

When('I open the more options menu', async ({ videoAIPage }) => {
  await videoAIPage.openMoreOptionsMenu();
});

When('I click delete scene', async ({ videoAIPage }) => {
  await videoAIPage.clickDeleteScene();
});

When('I confirm the deletion', async ({ videoAIPage }) => {
  await videoAIPage.confirmDeletion();
});
