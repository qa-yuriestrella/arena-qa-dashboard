@audience
Feature: CAT19 - Audience

  # End-user signups appear in the Audience list after a ~1h cache window.
  # AUD008 intercepts the audience API via page.route() to bypass the cache.

  Background:
    Given I am on the Audience page

  # ─── UI ────────────────────────────────────────────────────────────────────────

  @aud-ui
  Scenario: AUD001 - Audience page loads with all required UI elements
    Then the audience page title should be visible
    And the audience search input should be visible
    And the audience date picker should be visible
    And the Columns button should be visible
    And the Export CSV button should be visible
    And the audience table or empty state should be visible

  # ─── Search ────────────────────────────────────────────────────────────────────

  @aud-search
  Scenario: AUD002 - Searching filters the list and clearing the tag with X restores the input
    When I type "yopmail" in the audience search and press Enter
    Then the audience search tag "yopmail" should be visible
    When I remove the audience search tag
    Then the audience search tag should not be visible

  @aud-search
  Scenario: AUD003 - Searching with no match shows the no results state
    When I type "xyzzy-no-match-99999" in the audience search and press Enter
    Then the audience no results message should be visible

  # ─── Date filter ───────────────────────────────────────────────────────────────

  @aud-filter
  Scenario: AUD004 - Date picker Apply filters the list; Cancel discards the selection
    When I open the audience date picker and cancel without applying
    When I open the audience date picker, select a date range and apply
    Then the audience date picker should show the selected range

  # ─── Columns filter ────────────────────────────────────────────────────────────

  @aud-columns
  Scenario: AUD005 - All column flags can be toggled on and off in the audience table
    When I enable all hidden columns in the Columns dropdown
    Then all column headers should be visible in the audience table
    When I disable all columns in the Columns dropdown
    Then no data column headers should be visible in the audience table

  # ─── Export CSV ────────────────────────────────────────────────────────────────

  @aud-export
  Scenario: AUD006 - Export CSV modal can be cancelled or confirmed to send
    When I click the Export CSV button and cancel the modal
    When I click the Export CSV button and confirm the export
    Then the audience export modal should close

  # ─── Ban / Unban ───────────────────────────────────────────────────────────────

  @aud-ban
  Scenario: AUD007 - Banning then unbanning a user cycles the status badge correctly
    When I ban the first audience user
    Then the first audience row status should show "Banned"
    When I unban the first audience user
    Then the first audience row status should show "Active"

  # ─── Integration: end-user signup → Audience (mocked) ─────────────────────────

  @aud-mock
  Scenario: AUD008 - A newly signed-up end-user appears in the Audience list
    Given the audience API is mocked to return a newly signed-up user
    Then the signed-up user should be listed in the audience table
