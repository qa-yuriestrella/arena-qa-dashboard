@video-ai
Feature: CAT10 - Video AI Studio

  Background:
    Given I am on the Video AI page


  @vai-ui
  Scenario: VAI001 - Talk to the camera shows full form UI, accepts 1 avatar image and has 2 audio options
    Given I have selected the "Falar para a câmera" video type
    Then the image upload area should be visible
    And the style options should be visible
    And the behavior options should be visible
    And the creativity slider should be visible
    And the voice section should be visible
    And the script field should be visible
    And the generate button should be visible
    When I upload the avatar image
    Then the crop dialog should appear
    When I save the image crop
    Then the image preview should be visible
    When I open the audio options
    Then the "Voz do avatar" audio option should be visible
    And the "Predefinições" audio option should be visible
    When I close the audio options


  @vai-ui
  Scenario: VAI002 - Create scene shows full form UI, accepts up to 5 reference images and has 3 audio options
    Given I have selected the "Criar cena" video type
    Then the image upload area should be visible
    And the style options should be visible
    And the behavior options should be visible
    And the creativity slider should be visible
    And the voice section should be visible
    And the script field should be visible
    And the generate button should be visible
    When I upload multiple reference images
    Then the reference image thumbnails should be visible
    When I open the audio options
    Then the "Áudio desativado" audio option should be visible
    And the "Voz do avatar" audio option should be visible
    And the "Predefinições" audio option should be visible
    When I close the audio options


  @vai-ui
  Scenario: VAI003 - Product placement shows full form UI, accepts avatar and product images and has 2 audio options
    Given I have selected the "Inserção de produto" video type
    Then the image upload area should be visible
    And the style options should be visible
    And the behavior options should be visible
    And the creativity slider should be visible
    And the voice section should be visible
    And the script field should be visible
    And the generate button should be visible
    When I upload the avatar image
    Then the crop dialog should appear
    When I save the image crop
    Then the image preview should be visible
    When I upload the product image
    Then the crop dialog should appear
    When I save the image crop
    Then the product image preview should be visible
    When I open the audio options
    Then the "Voz do avatar" audio option should be visible
    And the "Predefinições" audio option should be visible
    When I close the audio options


  @vai-audio-ops
  Scenario: VAI004 - All audio input methods can be saved without errors
    Given I have selected the "Falar para a câmera" video type

    When I open the avatar voice panel
    And I upload a voice audio file
    Then the uploaded voice should be ready
    When I save the avatar voice
    And I save the avatar voice
    Then the avatar voice panel should close without errors

    When I open the avatar voice panel
    And I record a short audio clip
    Then the recorded audio should be ready
    When I save the avatar voice
    And I save the avatar voice
    Then the avatar voice panel should close without errors

    When I open the audio options
    And I select the "Predefinições" voice option
    Then the presets modal should be visible
    When I select a preset and confirm
    Then the preset voice should be saved without errors


  @vai-options
  Scenario: VAI005 - All video styles, behaviors and creativity slider can be configured
    Given I have selected the "Falar para a câmera" video type
    When I select the "Realistic" style
    Then the "Realistic" style should be active
    When I select the "Anime" style
    Then the "Anime" style should be active
    When I select the "3D Cartoon" style
    Then the "3D Cartoon" style should be active
    When I select the "Neutral" behavior
    Then the "Neutral" behavior should be active
    When I select the "Happy" behavior
    Then the "Happy" behavior should be active
    When I select the "Confident" behavior
    Then the "Confident" behavior should be active
    When I select the "Serious" behavior
    Then the "Serious" behavior should be active
    When I select the "Sad" behavior
    Then the "Sad" behavior should be active
    When I select the "Dramatic" behavior
    Then the "Dramatic" behavior should be active
    When I set the creativity to 0%
    Then the creativity should show "0"%
    When I set the creativity to 100%
    Then the creativity should show "100"%


  @vai-generation @vai-talktocam
  Scenario: VAI006 - Talk to the camera generates a video with a script
    Given I have selected the "Falar para a câmera" video type
    When I upload the avatar image and save the crop
    And I select the "Realista" style
    And I fill the script field with a description
    And I use the avatar voice
    And I click generate
    Then a generation request should be fired
    And the generation progress should be visible
    When I wait for the video to be generated
    Then the video player should be visible


  @vai-generation @vai-noscript
  Scenario: VAI007 - Talk to the camera generates a video without a script
    Given I have selected the "Falar para a câmera" video type
    When I upload the avatar image and save the crop
    And I select the "Realista" style
    And I use the avatar voice
    And I fill the script field with a description
    And I click generate
    Then a generation request should be fired
    And the generation progress should be visible
    When I wait for the video to be generated
    Then the video player should be visible


  @vai-generation @vai-card
  Scenario: VAI008 - Create scene generates a video
    Given I have selected the "Criar cena" video type
    When I upload the avatar image and save the crop
    And I select the "Anime" style
    And I fill the script field with a description
    And I use the avatar voice
    And I click generate
    Then a generation request should be fired
    When I wait for the video to be generated
    Then the video player should be visible


  @vai-generation @vai-product
  Scenario: VAI009 - Product placement generates a video with avatar and product images
    Given I have selected the "Inserção de produto" video type
    When I upload the avatar image and save the crop
    And I upload the product image and save the crop
    And I select the "3D Cartoon" style
    And I fill the script field with a description
    And I use the avatar voice
    And I click generate
    Then a generation request should be fired
    When I wait for the video to be generated
    Then the video player should be visible


  @vai-generation @vai-audio-off
  Scenario: VAI010 - Create scene generates a video with audio disabled
    Given I have selected the "Criar cena" video type
    When I upload the avatar image and save the crop
    And I enable Audio Off
    And I fill the script field with a description
    And I click generate
    Then a generation request should be fired
    When I wait for the video to be generated
    Then the video player should be visible


  @vai-player
  Scenario: VAI011 - Video player controls work correctly
    Given a completed video exists in the account
    When I click the play button
    Then the video should be playing
    When I click the pause button
    Then the video should be paused
    When I toggle the mute button
    Then the video should be muted
    When I toggle the mute button again
    Then the video should be unmuted


  @vai-profile
  Scenario: VAI012 - A generated video can be added and removed from the user profile (Classic)
    Given I am using the Classic avatar
    And a completed video exists in the account
    And the video is not added to the profile
    When I add the video to my profile
    Then the remove from profile button should be visible
    And the publish request should be fired
    When I navigate to the end user page
    And I click the avatar profile ring
    Then the scene video should be playing on the end user page
    When I navigate back to the dashboard
    And I remove the video from my profile
    Then the add to profile button should be visible
    When I navigate to the end user page
    And I click the avatar profile ring
    Then the scene video should not open on the end user page


  @vai-profile-modern @fixme
  Scenario: VAI013 - A generated video can be added and removed from the user profile (Modern)
    Given I am using the Modern avatar
    When I select the "Falar para a câmera" video type
    And I upload the Modern avatar image and save the crop
    And I use the avatar voice
    And I fill the script field with a description
    And I click generate
    Then a generation request should be fired
    When I wait for the video to be generated
    Then the video player should be visible
    And the video is not added to the profile
    When I add the video to my profile
    Then the remove from profile button should be visible
    And the publish request should be fired
    When I navigate to the Modern end user page
    Then the hero video should be visible
    When I navigate back to the dashboard
    And I remove the video from my profile
    Then the add to profile button should be visible
    When I navigate to the Modern end user page
    Then the default avatar image should be visible in the hero


  @vai-regenerate
  Scenario: VAI014 - A completed video can be regenerated
    Given a completed video exists in the account
    When I click regenerate
    Then a regenerate request should be fired
    And the generation progress should be visible


  @vai-delete
  Scenario: VAI015 - Deleting a scene calls the delete API and removes the video player
    Given a completed video exists in the account
    When I open the more options menu
    And I click delete scene
    And I confirm the deletion
    Then the delete request should be fired
    And the video player should not be visible
