const { createBdd } = require('playwright-bdd');
const { expect } = require('@playwright/test');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Background ───────────────────────────────────────────────────────────────

Given('I am on the Video AI page', async ({ videoAIPage }) => {
  await videoAIPage.visit();
});

// ─── Video type selection ─────────────────────────────────────────────────────

When('I select the {string} video type', async ({ videoAIPage }, typeName) => {
  await videoAIPage.selectVideoType(typeName);
});

Given('I have selected the {string} video type', async ({ videoAIPage }, typeName) => {
  await videoAIPage.selectVideoType(typeName);
});

// ─── VAI001: UI section assertions ───────────────────────────────────────────

Then('the image upload area should be visible', async ({ videoAIPage }) => {
  await videoAIPage.imageUploadAreaShouldBeVisible();
});

Then('the style options should be visible', async ({ videoAIPage }) => {
  await videoAIPage.styleOptionsShouldBeVisible();
});

Then('the behavior options should be visible', async ({ videoAIPage }) => {
  await videoAIPage.behaviorOptionsShouldBeVisible();
});

Then('the creativity slider should be visible', async ({ videoAIPage }) => {
  await videoAIPage.creativitySliderShouldBeVisible();
});

Then('the voice section should be visible', async ({ videoAIPage }) => {
  await videoAIPage.voiceSectionShouldBeVisible();
});

Then('the script field should be visible', async ({ videoAIPage }) => {
  await videoAIPage.scriptFieldShouldBeVisible();
});

Then('the generate button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.generateButtonShouldBeVisible();
});

// ─── VAI002: Image upload ─────────────────────────────────────────────────────

When('I upload the avatar image', async ({ videoAIPage }) => {
  await videoAIPage.uploadAvatarImage();
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

// Combined upload helpers (generation scenarios)

When('I upload the avatar image and save the crop', async ({ videoAIPage }) => {
  await videoAIPage.uploadAvatarImageAndSaveCrop();
});

When('I upload the Modern avatar image and save the crop', async ({ videoAIPage }) => {
  await videoAIPage.uploadAvatarImageModernAndSaveCrop();
});

When('I upload the product image', async ({ videoAIPage }) => {
  await videoAIPage.uploadProductImage();
});

When('I upload the product image and save the crop', async ({ videoAIPage }) => {
  await videoAIPage.uploadProductImageAndSaveCrop();
});

// ─── VAI003: Style ────────────────────────────────────────────────────────────

When('I select the {string} style', async ({ videoAIPage }, style) => {
  await videoAIPage.selectStyle(style);
});

Then('the {string} style should be active', async ({ videoAIPage }, style) => {
  await videoAIPage.styleShouldBeActive(style);
});

// ─── VAI004: Behavior / mood ──────────────────────────────────────────────────

When('I select the {string} behavior', async ({ videoAIPage }, behavior) => {
  await videoAIPage.selectBehavior(behavior);
});

Then('the {string} behavior should be active', async ({ videoAIPage }, behavior) => {
  await videoAIPage.behaviorShouldBeActive(behavior);
});

// ─── VAI005: Creativity slider ────────────────────────────────────────────────

When('I set the creativity to {int}%', async ({ videoAIPage }, percentage) => {
  await videoAIPage.setCreativity(percentage);
});

Then('the creativity should show {string}%', async ({ videoAIPage }, percentage) => {
  await videoAIPage.creativityShouldShow(percentage);
});

// ─── Script field ─────────────────────────────────────────────────────────────

When('I fill the script field with a description', async ({ videoAIPage }) => {
  await videoAIPage.fillScript();
});

// ─── VAI001: Multiple / product image upload ──────────────────────────────────

When('I upload multiple reference images', async ({ videoAIPage }) => {
  await videoAIPage.uploadMultipleImages();
});

Then('the reference image thumbnails should be visible', async ({ videoAIPage }) => {
  await videoAIPage.referenceImageThumbnailsShouldBeVisible();
});

Then('the product image preview should be visible', async ({ videoAIPage }) => {
  await videoAIPage.productImagePreviewShouldBeVisible();
});

// ─── VAI002: Audio options ────────────────────────────────────────────────────

When('I open the audio options', async ({ videoAIPage }) => {
  await videoAIPage.openAudioOptions();
});

When('I close the audio options', async ({ videoAIPage }) => {
  await videoAIPage.closeAudioOptions();
});

Then('the {string} audio option should be visible', async ({ videoAIPage }, option) => {
  await videoAIPage.audioOptionShouldBeVisible(option);
});

Then('the presets modal should be visible', async ({ videoAIPage }) => {
  await videoAIPage.presetsModalShouldBeVisible();
});

// ─── VAI010: Voice options (retained for generation scenarios) ────────────────

When('I select the {string} voice option', async ({ videoAIPage }, option) => {
  await videoAIPage.selectVoiceOption(option);
});

Then('the {string} voice option should be active', async ({ videoAIPage }, option) => {
  await videoAIPage.voiceOptionShouldBeActive(option);
});

When('I upload a voice audio file', async ({ videoAIPage }) => {
  await videoAIPage.uploadVoiceAudioFile();
});

Then('the uploaded voice should be ready', async ({ videoAIPage }) => {
  await videoAIPage.uploadedVoiceShouldBeReady();
});

Then('the recording interface should be visible', async ({ videoAIPage }) => {
  await videoAIPage.recordingInterfaceShouldBeVisible();
});

// ─── VAI004: Avatar voice panel ───────────────────────────────────────────────

When('I open the avatar voice panel', async ({ videoAIPage }) => {
  await videoAIPage.openAvatarVoicePanel();
});

When('I save the avatar voice', async ({ videoAIPage }) => {
  await videoAIPage.saveAvatarVoice();
});

Then('the avatar voice panel should close without errors', async ({ videoAIPage }) => {
  await videoAIPage.avatarVoicePanelShouldCloseWithoutErrors();
});

When('I record a short audio clip', async ({ videoAIPage }) => {
  await videoAIPage.recordShortAudioClip();
});

Then('the recorded audio should be ready', async ({ videoAIPage }) => {
  await videoAIPage.recordedAudioShouldBeReady();
});

When('I select a preset and confirm', async ({ videoAIPage }) => {
  await videoAIPage.selectPresetAndConfirm();
});

Then('the preset voice should be saved without errors', async ({ videoAIPage }) => {
  await videoAIPage.presetVoiceShouldBeSavedWithoutErrors();
});

// ─── Voice helper (generation scenarios) ─────────────────────────────────────

When('I use the avatar voice', async ({ videoAIPage }) => {
  await videoAIPage.useAvatarVoice();
});

// ─── VAI011: Audio Off ────────────────────────────────────────────────────────

When('I enable Audio Off', async ({ videoAIPage }) => {
  await videoAIPage.enableAudioOff();
});

// ─── Generation ───────────────────────────────────────────────────────────────

When('I click generate', async ({ videoAIPage }) => {
  await videoAIPage.clickGenerate();
});

Then('a generation request should be fired', async ({ videoAIPage }) => {
  await videoAIPage.generationRequestShouldBeFired();
});

Then('the generation progress should be visible', async ({ videoAIPage }) => {
  await videoAIPage.generationProgressShouldBeVisible();
});

When('I wait for the video to be generated', async ({ videoAIPage, $test }) => {
  await videoAIPage.waitForVideoToBeGenerated($test);
});

// ─── Completed video pre-condition ────────────────────────────────────────────

Given('a completed video exists in the account', async ({ videoAIPage }) => {
  await videoAIPage.completedVideoShouldExist();
});

// ─── VAI012: Video player controls ───────────────────────────────────────────

Then('the video player should be visible', async ({ videoAIPage }) => {
  await videoAIPage.videoPlayerShouldBeVisible();
});

Then('the video player should not be visible', async ({ videoAIPage }) => {
  await videoAIPage.videoPlayerShouldNotBeVisible();
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

When('I toggle the mute button', async ({ videoAIPage }) => {
  await videoAIPage.toggleMuteButton();
});

When('I toggle the mute button again', async ({ videoAIPage }) => {
  await videoAIPage.toggleMuteButton();
});

Then('the video should be muted', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBeMuted();
});

Then('the video should be unmuted', async ({ videoAIPage }) => {
  await videoAIPage.videoShouldBeUnmuted();
});

// ─── VAI012: End-user page verification ──────────────────────────────────────

When('I click the avatar profile ring', async ({ videoAIPage }) => {
  await videoAIPage.clickAvatarProfileRing();
});

Then('the scene video should be playing on the end user page', async ({ videoAIPage }) => {
  await videoAIPage.sceneVideoShouldBePlayingOnEU();
});

When('I navigate back to the dashboard', async ({ videoAIPage }) => {
  await videoAIPage.navigateBackToDashboard();
});

Then('the scene video should not open on the end user page', async ({ videoAIPage }) => {
  await videoAIPage.sceneVideoShouldNotOpenOnEU();
});

// ─── VAI013: Add / Remove from profile ───────────────────────────────────────

Given('the video is not added to the profile', async ({ videoAIPage }) => {
  await videoAIPage.ensureVideoNotInProfile();
});

Then('the add to profile button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.addToProfileButtonShouldBeVisible();
});

When('I add the video to my profile', async ({ videoAIPage }) => {
  await videoAIPage.clickAddToProfile();
});

Then('the remove from profile button should be visible', async ({ videoAIPage }) => {
  await videoAIPage.removeFromProfileButtonShouldBeVisible();
});

When('I remove the video from my profile', async ({ videoAIPage }) => {
  await videoAIPage.clickRemoveFromProfile();
});

Then('the publish request should be fired', async ({ videoAIPage }) => {
  await videoAIPage.publishRequestShouldBeFired();
});

// ─── VAI012 / VAI013: Avatar switching ───────────────────────────────────────

Given('I am using the Classic avatar', async ({ videoAIPage }) => {
  await videoAIPage.switchToPrimaryAvatarAndVisit();
});

Given('I am using the Modern avatar', async ({ videoAIPage }) => {
  await videoAIPage.switchToModernAvatarAndVisit();
});

When('I navigate to the Modern end user page', async ({ videoAIPage }) => {
  await videoAIPage.navigateToModernEndUserPage();
});

Then('the hero video should be visible', async ({ videoAIPage }) => {
  await videoAIPage.heroVideoShouldBeVisible();
});

Then('the default avatar image should be visible in the hero', async ({ videoAIPage }) => {
  await videoAIPage.defaultAvatarImageShouldBeVisible();
});

// ─── VAI014: Regenerate ───────────────────────────────────────────────────────

When('I click regenerate', async ({ videoAIPage }) => {
  await videoAIPage.clickRegenerate();
});

Then('a regenerate request should be fired', async ({ videoAIPage }) => {
  await videoAIPage.regenerateRequestShouldBeFired();
});

// ─── VAI015: Delete scene ─────────────────────────────────────────────────────

When('I open the more options menu', async ({ videoAIPage }) => {
  await videoAIPage.openMoreOptionsMenu();
});

When('I click delete scene', async ({ videoAIPage }) => {
  await videoAIPage.clickDeleteScene();
});

When('I confirm the deletion', async ({ videoAIPage }) => {
  await videoAIPage.confirmDeletion();
});

Then('the delete request should be fired', async ({ videoAIPage }) => {
  await videoAIPage.deleteRequestShouldBeFired();
});
