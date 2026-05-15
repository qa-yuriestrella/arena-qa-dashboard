@chat-log
Feature: CAT09 - Chat Log

  Background:
    Given I am on the chat log page
    And the chat log has at least one conversation

  # ─── UI ────────────────────────────────────────────────────────────────────────

  @cl-ui
  Scenario: CL001 - Chat log page loads with all required UI elements visible
    Then the chat log title should be visible
    And the refresh button should be visible
    And the search input should be visible
    And the date picker should be visible
    And the clear filter button should be visible

  # ─── Conversation detail ───────────────────────────────────────────────────────

  @cl-conversation
  Scenario: CL002 - Clicking a conversation opens the message thread in the details panel
    When I click the first conversation
    Then the message thread should be visible

  # ─── Search ────────────────────────────────────────────────────────────────────

  @cl-search
  Scenario: CL003 - Searching for a term with no results shows the no-matching-results message
    When I search for "xyzzy-no-match-99999"
    Then the no matching results message should be visible
    When I clear the search
    Then the no matching results message should not be visible

  # ─── Date filter ───────────────────────────────────────────────────────────────

  @cl-filter
  Scenario: CL004 - Selecting a date range and clicking Apply filters the conversation list
    When I open the date picker
    And I select a date range in the calendar
    And I click Apply
    Then the date filter should be applied

  @cl-filter
  Scenario: CL005 - Clicking Clear filter resets the date range to the default
    When I open the date picker
    And I select a date range in the calendar
    And I click Apply
    When I click the clear filter button
    Then the date filter should be reset to default

  # ─── Refresh ───────────────────────────────────────────────────────────────────

  @cl-refresh
  Scenario: CL006 - Clicking the refresh button reloads the conversation list
    When I click the refresh button
    Then the conversation list should reload successfully

  # ─── Integration: end user → chat log ─────────────────────────────────────────

  @cl-integration
  Scenario: CL007 - A message sent from the end user as an anonymous user appears in the chat log
    Given I note the current conversation count
    When I send a message from the end user page
    Then a new conversation should appear in the chat log
    And the sent message should be visible in the conversation detail

  @cl-integration
  Scenario: CL008 - A multi-turn dialogue from the end user appears with correct content in the chat log
    Given I note the current conversation count
    When I conduct a dialogue from the end user page
    Then a new conversation should appear in the chat log
    And the dialogue messages should appear in the chat log

  @cl-integration
  Scenario: CL009 - A message sent by a logged-in user shows their display name in the chat log
    Given I note the current conversation count
    When I send a message from the end user page as a logged-in user
    Then a new conversation should appear in the chat log
    And the logged-in user's name should be visible in the conversation

  @cl-integration
  Scenario: CL010 - An anonymous user who signs up after messaging has their name updated in the chat log
    Given I note the current conversation count
    When I send a message as anonymous from the end user page
    Then a new conversation should appear in the chat log
    And the first conversation should show as "Anonymous"
    When I sign up and send a follow-up message from the end user page
    Then the signed-up user's name should be visible in the conversation

  @cl-integration
  Scenario: CL011 - Opening the chat without sending a message does not create a chat log entry
    Given I note the current conversation count
    When I open the end user chat without sending a message
    Then the welcome-only session should not have user messages within 30 seconds
