# @video-ai
# Feature: CAT10 - Video AI

#   Background:
#     Given I am on the Video AI page

#   # ─── Form UI ──────────────────────────────────────────────────────────────────

#   @vai-ui
#   Scenario: VAI001 - All form sections are visible on the Video AI page
#     Then the image upload area should be visible
#     And the describe scene section should be visible
#     And the avatar say section should be visible
#     And the image style options should be visible
#     And the tone options should be visible
#     And the creativity slider should be visible
#     And the voice section should be visible
#     And the generate scene button should be visible

#   # ─── Image upload ─────────────────────────────────────────────────────────────

#   @vai-upload
#   Scenario: VAI002 - Uploading a JPEG image opens a crop dialog and shows a preview
#     When I upload the test image
#     Then the crop dialog should appear
#     When I save the image crop
#     Then the image preview should be visible

#   # ─── Form validation ──────────────────────────────────────────────────────────

#   @vai-validation
#   Scenario: VAI003 - Describe scene field displays the character counter
#     When I fill the describe scene field with "Testing the scene description field."
#     Then the describe scene character count should be displayed

#   @vai-validation
#   Scenario: VAI004 - Avatar say field flags too few words
#     When I fill the avatar say field with "Too short text"
#     Then the avatar say counter should indicate too few words

#   @vai-validation
#   Scenario: VAI005 - Selecting image style and tone toggles the button state
#     When I select the "realistic" image style
#     Then the "realistic" image style should be selected
#     When I select the "happy" tone
#     Then the "happy" tone should be selected

#   @vai-validation
#   Scenario: VAI006 - Adjusting the creativity slider updates the percentage
#     When I adjust the creativity slider
#     Then the creativity should show "50"%

#   # ─── Full generation flow ─────────────────────────────────────────────────────
#   # NOTE: This scenario takes up to 5 minutes (the AI video generation pipeline).
#   # The test account must have a voice clone already configured in the Knowledge Base.
#   # Place a face photo at apps/e2e/support/fixtures/images/test-face.jpg before running.

#   @vai-generation
#   Scenario: VAI007 - Full scene video generation — upload image, fill form, generate and verify
#     When I upload the test image
#     And I save the image crop
#     And I fill the describe scene field
#     And I fill the avatar say field
#     And I select the "realistic" image style
#     And I select the "happy" tone
#     Then the generate scene button should be enabled
#     When I click Generate Scene
#     Then a scene seed image request should be fired
#     And the generation progress steps should be visible
#     When I wait for the video to be generated
#     Then the video player should be visible
#     And the play button should be visible
#     And the progress bar should be visible

#   # ─── Video player controls ─────────────────────────────────────────────────────
#   # Requires an existing completed video in the account (run VAI007 first).

#   @vai-player
#   Scenario: VAI008 - Video player controls function correctly
#     Given a completed video exists in the account
#     When I click the play button
#     Then the video should be playing
#     When I click the pause button
#     Then the video should be paused
#     When I click the volume toggle
#     Then the video should be muted
#     When I click the volume toggle again
#     Then the video should be unmuted

#   # ─── Add/Remove from profile ──────────────────────────────────────────────────

#   @vai-profile
#   Scenario: VAI009 - Add and remove a scene from the end user profile
#     Given a completed video exists in the account
#     And the scene is not added to the profile
#     Then the add scene to profile button should be visible
#     When I click add scene to my profile
#     Then the remove scene from profile button should be visible
#     When I click remove scene from my profile
#     Then the add scene to profile button should be visible

#   # ─── End user — avatar ring ────────────────────────────────────────────────────

#   @vai-eu
#   Scenario: VAI010 - Avatar shows a video ring in the end user when a scene is added
#     Given a scene is added to the end user profile
#     When I visit the end user page
#     Then the avatar image should show a video ring
#     When I click the avatar image
#     Then the scene video should play

#   # ─── Delete scene ─────────────────────────────────────────────────────────────
#   # Run this last — it permanently removes the generated video.

#   @vai-delete
#   Scenario: VAI011 - Deleting a scene video removes it from the preview panel
#     Given a completed video exists in the account
#     When I open the more options menu
#     And I click delete scene
#     And I confirm the deletion
#     Then the video player should not be visible
