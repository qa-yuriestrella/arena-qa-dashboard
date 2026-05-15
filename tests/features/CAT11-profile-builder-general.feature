@profile-builder @profile-builder-general
Feature: CAT11 - Profile Builder – General Tab

  Background:
    Given I am on the Profile Builder General tab

  # ─── Form UI ──────────────────────────────────────────────────────────────────

  @pbg-ui
  Scenario: PBG001 - All General form sections are visible
    Then the General section title should be visible
    And the title field should be visible
    And the headline field should be visible
    And the URL field should be visible
    And the language selector should be visible

  # ─── Save / Cancel button state ───────────────────────────────────────────────

  @pbg-buttons
  Scenario: PBG002 - Save and Cancel are disabled initially and become enabled after editing
    Then the save button should be disabled
    And the cancel button should be disabled
    When I fill the title field with "E2E Modified Title"
    Then the save button should be enabled
    And the cancel button should be enabled

  # ─── Validation ───────────────────────────────────────────────────────────────

  @pbg-validation
  Scenario: PBG003 - Clearing the title field shows the required error
    When I clear the title field
    Then the title required error should be visible

  @pbg-validation
  Scenario: PBG004 - Headline field shows a character counter
    When I fill the headline field with "This is my headline for testing."
    Then the headline character count should be displayed

  @pbg-validation
  Scenario: PBG005 - Headline field enforces the 160-character limit
    When I fill the headline field with a 160-character string
    Then the headline character count should show the limit is reached
    When I click save
    Then the save should succeed without errors

  @pbg-validation
  Scenario: PBG006 - Invalid slug values show a format validation error
    When I fill the slug field with "ab"
    Then the slug error should be visible
    When I fill the slug field with a 21-character string
    Then the slug error should be visible
    When I fill the slug field with "Invalid Slug!"
    Then the slug error should be visible

  # ─── Cancel behaviour ─────────────────────────────────────────────────────────

  @pbg-cancel
  Scenario: PBG007 - Cancelling reverts the title to its original value
    When I store the current title value
    And I fill the title field with "Temporary Title That Should Be Reverted"
    And I click cancel
    Then the title field should match the stored value

  # ─── Save & persist ───────────────────────────────────────────────────────────

  @pbg-save
  Scenario: PBG008 - Saving changes persists all general fields
    When I fill all general fields with unique test values
    And I click save
    And all saved fields should persist after page reload

  # ─── End-user reflection ──────────────────────────────────────────────────────

  @pbg-eu
  Scenario: PBG009 - Changes saved in Profile Builder are reflected in the End User page
    When I save the profile with title "E2E Avatar Name", headline "E2E headline text", slug "e2e-pbtest", and language "English"
    Then the end user page should show the updated name "E2E Avatar Name"
    And the end user page should show the updated headline "E2E headline text"
    And the end user URL should contain the slug "e2e-pbtest"
    And the Avatar welcome message should arrive in the end user chat
