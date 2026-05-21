@health-check
Feature: CAT23 - Avatar Health Check

  # ─── HC001 — auto-open behaviour (fresh browser session) ─────────────────────

  @hc-auto-open
  Scenario: HC001 - Health check panel opens automatically on the first dashboard visit and stays dismissed on revisit
    Given I open the dashboard in a fresh browser session
    Then the health check panel should be open automatically
    When I close the health check panel
    And I log out and log back in
    Then the health check panel should not open automatically again

  # ─── HC002 — exclusive accordion ─────────────────────────────────────────────

  @hc-accordion
  Scenario: HC002 - Clicking a health check item expands it exclusively and collapses all others
    Given I am on the dashboard with the health check panel open
    When I click the "Add your voice" health check item
    Then only the "Add your voice" item should be expanded
    When I click the "Animate a profile picture" health check item
    Then only the "Animate a profile picture" item should be expanded
    When I click the "Add a headline to your profile" health check item
    Then only the "Add a headline to your profile" item should be expanded
    When I click the "Create a profile section" health check item
    Then only the "Create a profile section" item should be expanded
    When I click the "Add a biography source" health check item
    Then only the "Add a biography source" item should be expanded
    When I click the "Add social network sources" health check item
    Then only the "Add social network sources" item should be expanded

  # ─── HC003 — action button navigation ────────────────────────────────────────


  @hc-links
  Scenario: HC003 - Each health check action button navigates to the correct destination
    Given I am on the dashboard with the health check panel open
    When I open the "Animate a profile picture" item and click its action button
    Then the URL should contain "/profile-builder" and "open=headshot"
    When I return to the dashboard with the health check panel open
    And I open the "Add a headline to your profile" item and click its action button
    Then the URL should contain "/profile-builder" and "open=general"
    When I return to the dashboard with the health check panel open
    And I open the "Create a profile section" item and click its action button
    Then the URL should softly contain "/sections"
    When I return to the dashboard with the health check panel open
    And I open the "Add social network sources" item and click its action button
    Then the URL should contain "/knowledge-base"
    When I return to the dashboard with the health check panel open
    And I open the "Add your voice" item and click its action button
    Then the URL should softly contain "/knowledge-base" and "open=voice-clone"
    And a voice clone modal should be open
    When I return to the dashboard with the health check panel open
    And I open the "Add a biography source" item and click its action button
    Then the URL should softly contain "/knowledge-base" and "open=biography"
    And a biography source modal should be open

  # ─── HC004 — progress bar increases then decreases ───────────────────────────
  # Integration and section are tested separately: integration = +10, section = +5.
  # Integration is added first so that when section is added the integration slot is
  # already filled — section then contributes only its own 5 points, not 15.

  @hc-progress
  Scenario: HC004 - Progress bar correctly tracks health check item completion and removal
    Given the controllable health check items are reset to baseline
    When I add a social network integration
    Then the health check percentage should have increased by 10
    When I create a profile section
    Then the health check percentage should have increased by 5
    When I add a headline to the profile
    Then the health check percentage should have increased by 5
    When I add a biography source to the knowledge base
    Then the health check percentage should have increased by 20
    When I add a voice clone
    Then the health check percentage should have increased by 25
    When I generate an animated headshot
    Then the health check percentage should have increased by 25
    When I remove the animated headshot
    Then the health check percentage should have decreased by 25
    When I remove the voice clone
    Then the health check percentage should have decreased by 25
    When I remove the biography source from the knowledge base
    Then the health check percentage should have decreased by 20
    When I remove the headline from the profile
    Then the health check percentage should have decreased by 5
    When I remove all profile sections
    Then the health check percentage should have decreased by 5
    When I remove the social network integration
    Then the health check percentage should have decreased by 10
