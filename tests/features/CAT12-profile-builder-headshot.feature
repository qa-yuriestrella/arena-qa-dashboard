@profile-builder @profile-builder-headshot
Feature: CAT12 - Profile Builder – Headshot Tab

  Background:
    Given I am on the Profile Builder Headshot tab

  # ─── Gallery UI + Add New sheet ──────────────────────────────────────────────

  @pbh-ui
  Scenario: PBH001 - Gallery loads with Add New; Static and Animated type sheets both open
    Then the headshot gallery should be visible
    And the Add New button should be visible
    When I click Add New
    Then the type selector sheet should be visible
    When I select the static type
    Then the static image form should be visible
    When I close the sheet
    And I click Add New
    And I select the animated type
    Then the animated image form should be visible

  # ─── Full static headshot creation ───────────────────────────────────────────

  @pbh-crud
  Scenario: PBH004 - Creating a static headshot shows it in the gallery
    Given any existing "E2E Test Headshot" headshots are deleted
    When I click Add New
    And I select the static type
    And I fill the headshot name with "E2E Test Headshot"
    And I upload the headshot image
    Then the headshot crop dialog should appear
    When I save the headshot crop
    And I save to gallery
    Then the headshot "E2E Test Headshot" should appear in the gallery

  # ─── Animated headshot creation ──────────────────────────────────────────────

  @pbh-animated
  Scenario: PBH005 - Creating an animated headshot shows it in the gallery once generated
    Given any existing "E2E Animated Headshot" headshots are deleted
    When I click Add New
    And I select the animated type
    And I fill the headshot name with "E2E Animated Headshot"
    And I upload the headshot image
    Then the headshot crop dialog should appear
    When I save the headshot crop
    And I save the animated headshot to gallery
    Then the animated headshot "E2E Animated Headshot" should complete and appear in the gallery

  # ─── Card hover actions ───────────────────────────────────────────────────────

  @pbh-crud
  Scenario: PBH006 - Hovering a headshot card reveals the Set as my profile button
    When I hover over the headshot card "E2E Test Headshot"
    Then the Set as my profile button should be visible
    When I click Set as my profile
    Then the active headshot badge should be visible

  # ─── End User headshot reflection ────────────────────────────────────────────

  @pbh-eu-headshot
  Scenario: PBH009 - Active headshot is reflected and cleared on the Classic EU page
    Given an image headshot is available in the gallery
    When I set the available image headshot as active
    Then the active headshot should be visible in the Classic EU
    When I set the default avatar as active
    Then the headshot image should not be visible in the Classic EU

  @pbh-eu-headshot-modern
  Scenario: PBH009M - Active headshot is reflected and cleared on the Modern EU page
    Given I am on the Modern Profile Builder Headshot tab
    And an image headshot is available in the gallery
    When I set the available image headshot as active
    And voice call is enabled for the Modern avatar
    Then the active headshot should be visible in the Modern EU chat
    And the active headshot should be visible in the Modern EU voice call
    When I set the default Modern avatar as active
    Then the headshot image should not be visible in the Modern EU chat

  # ─── Edit ─────────────────────────────────────────────────────────────────────

  @pbh-crud
  Scenario: PBH007 - Opening the Edit menu item opens the edit sheet
    When I open the headshot menu for "E2E Test Headshot"
    And I click Edit in the menu
    Then the headshot edit sheet should be visible
    When I close the sheet

  # ─── Delete ───────────────────────────────────────────────────────────────────
  # Run last — permanently removes the headshot created in PBH004.

  @pbh-crud
  Scenario: PBH008 - Deleting a headshot removes it from the gallery
    When I open the headshot menu for "E2E Test Headshot"
    And I click Delete in the menu
    Then the delete confirmation dialog should be visible
    When I confirm the headshot deletion
    Then the headshot "E2E Test Headshot" should not be in the gallery
