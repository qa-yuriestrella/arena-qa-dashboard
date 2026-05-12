@knowledge-base
Feature: CAT06 - Knowledge Base

  Background:
    Given I am logged in and on the knowledge base page

  # ─── Visibility ───────────────────────────────────────────────────────────────

  @kb-visual
  Scenario: KB001 - All integration buttons are visible in main toolbar and expanded menu
    Then all main platform integration buttons should be visible
    When I open the additional integrations menu
    Then all additional integration buttons should be visible

  # ─── Modal behavior ───────────────────────────────────────────────────────────

  @kb-modal @kb-clean-start
  Scenario: KB002 - Every integration button opens the modal and shows a pending card
    Given I start with a clean knowledge base canvas
    Then every integration button should open the modal and show a pending card

  @kb-modal @kb-clean-start
  Scenario: KB003 - All three modal close methods dismiss the modal and remove the pending card
    Given I start with a clean knowledge base canvas
    When the integration modal is opened for "Instagram"
    And I click Cancel in the integration modal
    Then the integration modal should be closed
    And the pending integration card should not be visible
    When the integration modal is opened for "X"
    And I close the integration modal with the X button
    Then the integration modal should be closed
    And the pending integration card should not be visible
    When the integration modal is opened for "Youtube"
    And I click outside the integration modal
    Then the integration modal should be closed
    And the pending integration card should not be visible

  # ─── URL validation ───────────────────────────────────────────────────────────

  @kb-validation @kb-clean-start
  Scenario: KB004 - Invalid URL shows validation error for all platforms
    Given I start with a clean knowledge base canvas
    Then every integration should reject an invalid URL

  @kb-validation @kb-clean-start
  Scenario: KB005 - URL from wrong platform shows validation error for all platforms
    Given I start with a clean knowledge base canvas
    Then every integration should reject a URL from the wrong platform

  # ─── Integration completion flow ──────────────────────────────────────────────

  @kb-integration @kb-clean-start
  Scenario: KB006 - All platform integrations complete successfully
    Given I start with a clean knowledge base canvas
    And I created social integrations
    Then all social integrations should complete successfully

  # ─── Loaded integration ───────────────────────────────────────────────────────

  @kb-loaded
  Scenario: KB007 - Loaded card shows profile name, image and correct post count
    Given I have an existing loaded integration
    Then the card should show the profile name
    And the card should show the profile image
    And each loaded card should show the correct post count

  @kb-loaded
  Scenario: KB008 - Config modal Profile tab shows bio and account information for all integrations
    Given I have an existing loaded integration
    Then each integration profile tab should show bio and account information

  @kb-loaded
  Scenario: KB009 - Config modal Posts tab lists minimum posts with title, date and action menus
    Given I have an existing loaded integration
    Then each integration posts tab should list posts with title, date and action menus

  @kb-loaded
  Scenario: KB010 - Post "More details" shows full metadata
    Given I have an existing loaded integration
    Then each integration post details should show full metadata

  @kb-loaded
  Scenario: KB011 - Config modal Metadata tab shows integration details
    Given I have an existing loaded integration
    Then each integration metadata tab should show integration details

  @kb-loaded
  Scenario: KB012 - Load Latest Posts triggers integration refresh
    Given I have an existing loaded integration
    Then each integration load latest posts should trigger a refresh

  # ─── Delete (uses KB006 integrations) ────────────────────────────────────────

  @kb-delete
  Scenario: KB013 - Social integrations can be deleted via config modal or card button
    Given I have an existing loaded integration
    Then social integrations should be deleted via both methods

  # ─── Duplicate URL validation ─────────────────────────────────────────────────

  @kb-validation @kb-clean-start
  Scenario: KB014 - Adding an already-connected URL shows duplicate error
    Given I start with a clean knowledge base canvas
    And I created all integrations
    Then every integration should show a duplicate error when added twice

  # ─── Bulk delete ──────────────────────────────────────────────────────────────

  @kb-delete @kb-clean-start
  Scenario: KB015 - Bulk drag-select deletes all selected integrations
    Given I start with a clean knowledge base canvas
    And I created all integrations
    When I drag to select all integrations in the canvas
    Then the bulk action bar should be visible
    When I click Delete all in the bulk action bar
    Then the bulk delete confirmation dialog should be visible
    When I confirm the bulk delete
    Then the integration card should not be visible

  # ─── Other source integrations ────────────────────────────────────────────────

  @kb-integration @kb-clean-start
  Scenario: KB016 - Creating other source integrations shows the cards in the canvas
    Given I start with a clean knowledge base canvas
    When I create the other source integrations
    Then all other source integration cards should be visible
    And website and reddit integrations should complete

  @kb-integration
  Scenario: KB017 - Text and Biography sources are editable from the config modal
    Given I have existing other source integrations
    Then text and biography integrations should be editable

  # ─── Settings ─────────────────────────────────────────────────────────────────

  @kb-settings
  Scenario: KB018 - Disabling a source sets isEnabled to false
    Given I have an existing loaded integration
    Then each integration source should be disableable

  @kb-settings
  Scenario: KB019 - Enabling a source sets isEnabled to true
    Given I have an existing loaded integration
    Then each integration source should be enableable

  # ─── Skills ───────────────────────────────────────────────────────────────────

  @kb-skills
  Scenario: KB020 - Conversations skill shows always-active status
    When I click the Skills button
    And I click the "Conversate" skill
    Then the skill drawer should be visible
    And the conversations skill should show as always active

  @kb-skills
  Scenario: KB021 - Seller skill toggle enables and disables sell products action
    When I click the Skills button
    And I click the "Seller" skill
    Then the skill drawer should be visible
    When I enable the seller skill
    Then the seller skill should be enabled in the commerce-ai response
    And the Sell Products node should be visible in the knowledge base
    When I disable the seller skill
    Then the seller skill should be disabled in the commerce-ai response

  @kb-skills
  Scenario: KB022 - Uploading an audio file creates a voice clone and shows Voice Calls node
    When I click the Skills button
    And I click the "Make Audio Calls" skill
    Then the voice call skill drawer should be visible
    When I upload the voice audio file
    Then the voice call enable toggle should be visible
    When I enable the voice call skill
    Then the voice clone request should succeed
    And the Voice Calls node should be visible in the knowledge base

  # ─── Canvas controls ──────────────────────────────────────────────────────────

  @kb-controls
  Scenario: KB023 - Canvas mode buttons, zoom controls and fullscreen all work correctly
    Then the Select mode should be active
    When I click the Move mode button
    Then the Move mode should be active
    And the Select mode should be inactive
    When I click the Select mode button
    Then the Select mode should be active
    When I click the Zoom In button
    Then the canvas zoom level should have increased
    When I click the Zoom Out button
    Then the canvas zoom level should have decreased
    When I click the Fit View button
    Then a knowledge base node should be visible
    When I click the Fullscreen button
    Then the sidebar should be hidden
    When I click the Show Sidebar button
    Then the sidebar should be visible
