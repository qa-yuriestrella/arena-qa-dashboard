@avatar-management
Feature: CAT04 - Avatar Management

  Background:
    Given I am logged in and on the home page

  # ─── Avatar Switcher ─────────────────────────────────────────────────────────

  @avm-switcher
  Scenario: AVM001 - Avatar switcher menu opens with Switch Avatars and Create New Avatar sections
    When I click the avatar switcher button
    Then the "Switch Avatars" section should be visible
    And the "Create New Avatar" option should be visible

  # ─── Create New Avatar ───────────────────────────────────────────────────────

  @avm-create
  Scenario: AVM002 - Both "Create New Avatar" entry points navigate to /new
    When I click the avatar switcher button
    And I click "Create New Avatar" in the switcher menu
    Then the URL should contain "/new"
    When I go back to the home page
    And I click the "Create New Avatar" button in the sidebar
    Then the URL should contain "/new"

  @avm-create
  Scenario: AVM003 - Completing new avatar creation redirects to the dashboard with the new avatar selected
    When I complete the new avatar creation flow without entering payment details
    Then I should be redirected to the dashboard
    And the newly created avatar should be selected as the current avatar

  # ─── Avatar Switcher (multiple) ──────────────────────────────────────────────

  @avm-switcher
  Scenario: AVM004 - With multiple avatars: current is tagged and disabled; others are enabled; clicking one switches the dashboard
    Given the account has more than one avatar
    When I click the avatar switcher button
    And I click "Switch Avatars" in the switcher menu
    Then the first avatar in the switcher should have the "Current" tag
    And the first avatar button should be disabled
    And it should display the avatar name and URL in "myavatar.ai/<slug>" format
    And non-current avatars in the switcher should not have the "Current" tag
    And their buttons should be enabled and clickable
    When I click on a non-current avatar in the switcher
    Then the switch avatar request should be fired
    And the dashboard should reload with that avatar's data

  # ─── Delete Avatar ───────────────────────────────────────────────────────────

  @avm-delete
  Scenario: AVM005 - Delete button is enabled when multiple avatars exist
    When I navigate to Settings
    Then the Delete avatar button should be enabled
