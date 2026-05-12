@end-user-auth
Feature: CAT07 - End User Authentication

  Background:
    Given I am on the end user page

  # ─── Entry points ─────────────────────────────────────────────────────────────

  @eu-auth
  Scenario: EU001 - Auth modal opens from multiple entry points with all login options
    When I click the end user profile button
    Then the auth modal should be visible
    And the auth modal should show Google, Facebook, X, and Email options
    When I reload the end user page
    And I click the Subscribe button
    Then the auth modal should be visible
    When I reload the end user page
    And I open the text chat
    And I click the profile icon inside the chat
    Then the auth modal should be visible

  # ─── Email signup ─────────────────────────────────────────────────────────────

  @eu-signup
  Scenario: EU002 - Complete email signup with display name creates a new account
    When I click the end user profile button
    And I select email signup
    And I fill in the signup form with a new user
    And I click Create Account
    And I fill in the display name
    And I click Save
    Then I should be logged in to the end user

  @eu-signup
  Scenario: EU003 - Password visibility toggles work on both password fields
    When I click the end user profile button
    And I select email signup
    Then the password field should be hidden
    When I click the password toggle
    Then the password field should be visible
    When I click the password toggle again
    Then the password field should be hidden
    And the confirm password field should be hidden
    When I click the confirm password toggle
    Then the confirm password field should be visible

  # ─── Email sign in ────────────────────────────────────────────────────────────

  @eu-signin
  Scenario: EU004 - Signing in with valid email credentials logs the user in
    When I click the end user profile button
    And I select email signup
    And I click the sign in link
    And I fill in the signin email with "automation.arena1@gmail.com"
    And I fill in the signin password with "Automation@123"
    And I click Sign In
    And I fill in the display name
    And I click Save
    Then I should be logged in to the end user

  # ─── Social login ─────────────────────────────────────────────────────────────

  @eu-social
  Scenario: EU005 - Login with Google logs into the end user
    When I click the end user profile button
    And I log in with Google in the end user
    Then I should be logged in to the end user

  @eu-social
  Scenario: EU006 - Login with X via Google logs into the end user
    When I click the end user profile button
    And I log in with X in the end user
    Then I should be logged in to the end user

  @eu-social
  Scenario: EU007 - Login with Facebook logs into the end user
    When I click the end user profile button
    And I log in with Facebook in the end user
    Then I should be logged in to the end user
