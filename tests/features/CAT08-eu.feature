@end-user
Feature: CAT08 - End User

  Background:
    Given I am on the end user page

  # ─── Text chat ────────────────────────────────────────────────────────────────

  @eu-chat
  Scenario: EU008 - Opening the chat fires the required API requests and shows the Avatar's welcome message
    When I open the text chat
    Then a create-session request should be fired
    And a send-message request should be fired
    And the chat window should be visible
    And the last message should be from the Avatar

  @eu-chat
  Scenario: EU009 - Sending a message receives a response from the Avatar
    When I open the text chat
    And I send the message "Hello"
    Then the Avatar should respond
    And the last message should be from the Avatar

  # ─── Voice call ───────────────────────────────────────────────────────────────

  @eu-call
  Scenario: EU010 - Voice call starts automatically after login and fires a call request
    When I click the Call button
    Then the auth modal should be visible
    When I select email signup
    And I click the sign in link
    And I fill in the signin email with "automation.arena1@gmail.com"
    And I fill in the signin password with "Automation@123"
    And I click Sign In
    Then I should be logged in to the end user
    And the call UI should be visible
    And a call initiation request should be fired
