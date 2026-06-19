@knowledge-base @wip
Feature: CAT06 - Knowledge Base

  Background:
    Given I am logged in and on the knowledge base page

  # ─── Tutorial ──────────────────────────────────────────────────────────────────

  @kb-tutorial
  Scenario: KB001 - Starter guide tutorial is visible on first KB access
    Given I am on the knowledge base for a fresh avatar
    Then the starter guide tutorial should be visible

  # The tutorial flag must be scoped per account, not per avatar.
  # Once dismissed on one avatar it must not re-appear on a second avatar within the same account.
  # AVT-2748 bug: currently re-appears for each new avatar. Enable once fixed.
  @kb-tutorial @fixme
  Scenario: KB002 - Tutorial does not re-appear when navigating to a second avatar in the same account
    Given I dismissed the tutorial on the primary avatar
    When I switch to a second avatar and navigate to the knowledge base
    Then the starter guide tutorial should not be visible

  @kb-tutorial
  Scenario: KB034 - Clicking "Replay tutorial" re-opens the starter guide as if seen for the first time
    When I click the Replay tutorial button
    Then the starter guide tutorial should be visible

  # ─── Board state ───────────────────────────────────────────────────────────────

  @kb-visual
  Scenario: KB003 - Board loads with the "Start Here" card visible
    Then the Start Here card should be visible on the canvas

  # ─── Source addition via popover ───────────────────────────────────────────────

  @kb-integration @kb-clean-start
  Scenario: KB004 - Clicking a platform button opens a source popover and shows a pending card
    Given I start with a clean knowledge base canvas
    When I click the "Instagram" platform button
    Then the source popover should be visible
    When I enter "https://www.instagram.com/guimaturana/" as the integration URL
    And I submit the integration
    Then a pending integration card should appear on the canvas

  @kb-integration @kb-clean-start
  Scenario: KB005 - Paste-to-add: pasting a social URL on the canvas opens the source popover
    Given I start with a clean knowledge base canvas
    When I paste a YouTube URL on the knowledge base canvas
    Then the source popover should be visible for YouTube

  # ─── URL validation ────────────────────────────────────────────────────────────

  @kb-validation @kb-clean-start
  Scenario: KB006 - Invalid URL shows validation error for all platforms
    Given I start with a clean knowledge base canvas
    Then every integration should reject an invalid URL

  # ─── Integration tests ─────────────────────────────────────────────────────────

  @kb-integration @kb-clean-start
  Scenario: KB007 - Profile integrations complete successfully
    Given I start with a clean knowledge base canvas
    And I created social integrations
    Then all social integrations should complete successfully

  @kb-integration @kb-clean-start
  Scenario: KB008 - Single video and post integrations complete successfully
    Given I start with a clean knowledge base canvas
    And I created single post integrations
    Then all single post integrations should complete successfully

  # ─── Loaded card assertions ────────────────────────────────────────────────────

  @kb-loaded
  Scenario: KB010 - Loaded card shows profile name, image and correct post count
    Given I have an existing loaded integration
    Then the card should show the profile name
    And the card should show the profile image
    And each loaded card should show the correct post count

  @kb-loaded
  Scenario: KB011 - Config drawer Profile tab shows bio and account information for all integrations
    Given I have an existing loaded integration
    Then each integration profile tab should show bio and account information

  @kb-loaded
  Scenario: KB012 - Config drawer Posts tab lists posts with title, date and action menus
    Given I have an existing loaded integration
    Then each integration posts tab should list posts with title, date and action menus

  # AVT-2748 open question: video transcript extraction (YouTube / Instagram / TikTok)
  # may have been deferred or removed in the refactor. The assertion inside
  # eachIntegrationPostDetailsShouldShowFullMetadata checks for a "Transcription" section.
  # If transcripts are confirmed gone, remove that assertion from the page object method.
  @kb-loaded
  Scenario: KB013 - Post "More details" shows full metadata
    Given I have an existing loaded integration
    Then each integration post details should show full metadata

  @kb-loaded
  Scenario: KB014 - Config drawer Metadata tab shows integration details
    Given I have an existing loaded integration
    Then each integration metadata tab should show integration details

  @kb-loaded
  Scenario: KB015 - Load Latest Posts triggers integration refresh
    Given I have an existing loaded integration
    Then each integration load latest posts should trigger a refresh

  # ─── Delete ────────────────────────────────────────────────────────────────────

  # Delete from the config/settings panel is no longer available.
  # Delete is now only accessible via right-click context menu or the card toolbar button.
  @kb-delete
  Scenario: KB016 - Social integrations can be deleted via right-click context menu or card button
    Given I have an existing loaded integration
    Then social integrations should be deleted via right-click menu and card button

  # Drag-select is replaced by Shift+click in the new KB (the cursor is always a hand
  # outside cards for panning; multi-selection requires holding Shift while clicking).
  @kb-delete @kb-clean-start
  Scenario: KB017 - Shift+click multi-select and bulk delete removes all selected integrations
    Given I start with a clean knowledge base canvas
    And I created all integrations
    When I Shift+click to select all integrations on the canvas
    Then the bulk action bar should be visible
    When I click Delete all in the bulk action bar
    Then the bulk delete confirmation dialog should be visible
    When I confirm the bulk delete
    Then the integration card should not be visible

  # ─── Duplicate URL validation ──────────────────────────────────────────────────

  @kb-validation @kb-clean-start
  Scenario: KB018 - Adding an already-connected URL shows a duplicate error
    Given I start with a clean knowledge base canvas
    And I created all integrations
    Then every integration should show a duplicate error when added twice

  # ─── Text and biography sources ────────────────────────────────────────────────

  # NOTE: URL (website) and Shopify source types are not visible in the new KB toolbar.
  # AVT-2748 open product question: confirm with Artur whether these are deferred to a
  # future phase or dropped entirely. Until confirmed, they are excluded from this scenario.

  @kb-integration @kb-clean-start
  Scenario: KB019 - Creating annotation and biography sources shows the cards on the canvas and enforces character limits
    Given I start with a clean knowledge base canvas
    When I create the annotation and biography integrations
    Then the annotation and biography cards should be visible on the canvas
    And the annotation and biography fields should enforce character limits

  # ─── Board: auto-layout and auto-group ────────────────────────────────────────

  @kb-board
  Scenario: KB020 - Auto-layout organizes cards into multiple columns by source type
    Given I have an existing loaded integration
    When I click the Auto-layout button
    Then cards should be arranged in multiple columns on the canvas

  @kb-board
  Scenario: KB021 - Auto-group groups cards of the same source type together
    Given I have an existing loaded integration
    When I click the Auto-group button
    Then cards of the same source type should be grouped together

  # ─── Board: right-click context menu ──────────────────────────────────────────

  @kb-board
  Scenario: KB022 - Right-clicking a card shows a context menu with details and delete options
    Given I have an existing loaded integration
    When I right-click on a loaded integration card
    Then the card context menu should be visible
    And the context menu should show the Delete option
    And the context menu should show the Details option

  # ─── Settings ─────────────────────────────────────────────────────────────────

  @kb-settings
  Scenario: KB023 - Disabling a source sets isEnabled to false
    Given I have an existing loaded integration
    Then each integration source should be disableable

  @kb-settings
  Scenario: KB024 - Enabling a source sets isEnabled to true
    Given I have an existing loaded integration
    Then each integration source should be enableable

  # ─── Skills ───────────────────────────────────────────────────────────────────

  @kb-skills
  Scenario: KB025 - Conversations skill shows always-active status
    When I click the Skills button
    And I click the "Conversate" skill
    Then the skill drawer should be visible
    And the conversations skill should show as always active

  @kb-skills
  Scenario: KB026 - Seller skill toggle enables and disables sell products action
    When I click the Skills button
    And I click the "Seller" skill
    Then the skill drawer should be visible
    When I enable the seller skill
    Then the seller skill should be enabled in the commerce-ai response
    And the Sell Products node should be visible in the knowledge base
    When I disable the seller skill
    Then the seller skill should be disabled in the commerce-ai response

  # Audio upload for voice call has been removed — only recording is now available.
  # This also means it is no longer possible to create an avatar using someone else's audio
  # (previously done by uploading a third-party recording).
  # AVT-2748 open product question: confirm whether audio upload will return in a later phase.
  @kb-skills
  Scenario: KB027 - Recording a voice sample creates a voice clone and shows the Voice Calls node
    When I click the Skills button
    And I click the "Make Audio Calls" skill
    Then the voice call skill drawer should be visible
    When I record a voice audio sample
    Then the voice call enable toggle should be visible
    When I enable the voice call skill
    Then the voice clone request should succeed
    And the Voice Calls node should be visible in the knowledge base

  # The Stop button in the voice recorder must be disabled for the first 15 seconds.
  # AVT-2748 bug: Stop is active from the moment recording starts; clicking it before 15s
  # shows "Record is too short. Please record at least 15 seconds." only after the fact.
  # Enable once the Stop button is correctly gated by the minimum recording time.
  @kb-skills @fixme
  Scenario: KB028 - Voice recorder Stop button is disabled until the 15-second minimum is reached
    When I click the Skills button
    And I click the "Make Audio Calls" skill
    Then the voice call skill drawer should be visible
    When I start a voice recording
    Then the Stop button should be disabled
    When 15 seconds of recording have elapsed
    Then the Stop button should be enabled

  @kb-skills @kb-voice-teardown
  Scenario: KB029 - Voice call buttons disappear and reappear in classic EU when skill is toggled
    Given the voice call skill is enabled
    When I click the Skills button
    And I click the "Make Audio Calls" skill
    And I disable the voice call skill
    When I visit the classic end-user page
    Then the voice call button should not be visible on the EU home page
    When I open the text chat
    Then the voice call icon should not be visible inside the chat
    When I navigate back to the knowledge base
    And I click the Skills button
    And I click the "Make Audio Calls" skill
    And I enable the voice call toggle
    When I visit the classic end-user page
    Then the voice call button should be visible on the EU home page
    When I open the text chat
    Then the voice call icon should be visible inside the chat

  @kb-skills @kb-voice-modern-teardown
  Scenario: KB030 - Voice call buttons disappear and reappear in modern EU when skill is toggled
    Given the voice call skill is enabled for the modern avatar
    When I click the Skills button
    And I click the "Make Audio Calls" skill
    And I disable the voice call skill
    When I visit the modern end-user page
    Then the voice call button should not be visible on the EU home page
    When I open the text chat
    Then the voice call icon should not be visible inside the chat
    When I navigate back to the modern avatar knowledge base
    And I click the Skills button
    And I click the "Make Audio Calls" skill
    And I enable the voice call toggle
    When I visit the modern end-user page
    Then the voice call button should be visible on the EU home page
    When I open the text chat
    Then the voice call icon should be visible inside the chat

  # The ?open=voice-clone query param (used by "Add Your Voice" on Home and
  # "Clone Your Voice" on Avatar Health) no longer opens the Voice Clone panel.
  # The new KB component does not consume the ?open= param. AVT-2748 bug.
  # Enable once fixed.
  @kb-skills @fixme
  Scenario: KB031 - Deep-link ?open=voice-clone navigates to KB and opens the Voice Clone panel
    When I navigate to the knowledge base with "?open=voice-clone"
    Then the voice call skill panel should open automatically

  # The ?open=biography query param (used by "Add Biography as a Source" on Avatar Health)
  # no longer opens the Biography panel. AVT-2748 bug. Enable once fixed.
  @kb-skills @fixme
  Scenario: KB032 - Deep-link ?open=biography navigates to KB and opens the Biography panel
    When I navigate to the knowledge base with "?open=biography"
    Then the biography integration panel should open automatically

  # ─── Canvas controls ──────────────────────────────────────────────────────────
  # Note: the Select and Move mode toolbar buttons have been removed. The cursor is
  # automatically a hand (pan mode) outside cards; Shift+click is used for multi-select.

  # Sidebar toggle (Toggle Sidebar button) collapses to icon-only mode — the sidebar
  # links remain in the accessibility tree. No Fullscreen mode exists in the new KB;
  # Focus mode is a canvas-only overlay. Sidebar hide/show not tested here.
  @kb-controls
  Scenario: KB033 - Zoom controls and fit view work correctly
    When I click the Zoom In button
    Then the canvas zoom level should have increased
    When I click the Zoom Out button
    Then the canvas zoom level should have decreased
    When I click the Fit View button
    Then a knowledge base node should be visible
