@profile-builder @profile-builder-sections
Feature: CAT15 - Profile Builder – Sections Tab

  # Sections are blocks of content displayed on the end-user page.
  # Each section is added via the "+ Add Section" button and comes in
  # different types; currently URL and Media is available.
  #
  # URL and Media section editor has two tabs:
  #   • URL  – add/reorder/edit/delete link cards
  #   • Visual – set section title and card display style

  Background:
    Given I am on the Sections page

  # ─── Add Section modal ───────────────────────────────────────────────────────

  @psn-ui
  Scenario: PSN001 - Add Section opens the type selector; selecting URL and Media opens the two-tab editor
    When I click Add Section
    Then the section type selector should be visible
    And the URL and Media option should be available
    When I select URL and Media
    Then the section editor modal should be visible
    And the URL tab should be active

  # ─── URL tab – adding links ──────────────────────────────────────────────────

  @psn-url-add
  Scenario: PSN002 - URL validation, adding a link, and card content display
    Given the URL and Media section editor is open on the URL tab
    When I enter the section URL "not-a-valid-url!!!"
    Then the Add URL button should be disabled
    When I add the section URL "https://myavatar.ai/"
    Then the section API request should be fired
    And the URL input should be empty
    And a URL card for "arena.im" should be visible in the section editor
    And the URL card for "arena.im" should show the URL text
    And the URL card options button for "arena.im" should be visible

  @psn-url-add
  Scenario: PSN003 - Multiple URLs can be added in sequence to the same section
    Given the URL and Media section editor is open on the URL tab
    When I add the section URL "https://myavatar.ai/"
    And I add the section URL "https://arena.im/"
    Then 2 URL cards should be visible in the section editor

  # ─── URL tab – reorder ───────────────────────────────────────────────────────

  @psn-url-reorder
  Scenario: PSN004 - URL cards can be reordered by drag-and-drop
    Given the URL and Media section editor is open on the URL tab
    When I add the section URL "https://myavatar.ai/"
    And I add the section URL "https://arena.im/"
    And I drag the URL card "arena.im" below "example.com"
    Then the URL card "example.com" should appear before "arena.im" in the list

  # ─── URL tab – edit ──────────────────────────────────────────────────────────

  @psn-url-edit
  Scenario: PSN005 - Edit Link updates the card on save and reverts it on cancel
    Given a URL card for "https://myavatar.ai/" exists in the section editor
    When I open the options menu for URL card "arena.im"
    And I click Edit Link
    Then the edit link form should be visible
    When I change the link URL to "https://google.com"
    And I change the link title to "Google"
    And I save the link edit
    Then the URL card for "google.com" should be visible in the section editor
    And the URL card for "arena.im" should not be visible in the section editor
    When I open the options menu for URL card "google.com"
    And I click Edit Link
    And I change the link URL to "https://changed.com"
    And I cancel the link edit
    Then the URL card for "google.com" should be visible in the section editor
    And the URL card for "changed.com" should not be visible in the section editor

  # ─── URL tab – image & delete ────────────────────────────────────────────────

  @psn-url-edit
  Scenario: PSN006 - Edit Link allows replacing the card image
    Given a URL card for "https://myavatar.ai/" exists in the section editor
    When I open the options menu for URL card "arena.im"
    And I click Edit Link
    And I click Choose image and upload an image
    Then the URL card for "arena.im" should show a custom image

  @psn-url-delete
  Scenario: PSN007 - Delete Link removes the URL card from the section editor
    Given a URL card for "https://myavatar.ai/" exists in the section editor
    When I open the options menu for URL card "arena.im"
    And I click Delete Link
    Then the URL card for "arena.im" should not be visible in the section editor

  # ─── Visual tab ──────────────────────────────────────────────────────────────

  @psn-visual
  Scenario: PSN008 - Visual tab: default title placeholder, custom title, and card style updates
    Given the URL and Media section editor is open on the URL tab
    When I switch to the Visual tab
    Then the section title should show a default placeholder like "Section 1"
    When I set the section title to "My Favourite Links"
    Then the section title input should show "My Favourite Links"
    When I click through the available card styles
    Then the preview should update for each card style selected

  # ─── Save ────────────────────────────────────────────────────────────────────

  @psn-save
  Scenario: PSN009 - Saving the section fires the API request and the section appears on the page
    Given the URL and Media section editor is open on the URL tab
    When I add the section URL "https://myavatar.ai/"
    And I switch to the Visual tab
    And I set the section title to "E2E Test Section"
    And I save the section
    Then the section save request should be fired
    And the section "E2E Test Section" should be visible on the sections page

  # ─── Visual tab – card styles ────────────────────────────────────────────────

  @psn-visual
  Scenario: PSN011 - Visual tab offers Button, Card, and Stack display styles
    Given the URL and Media section editor is open on the URL tab
    When I add the section URL "https://myavatar.ai/"
    And I switch to the Visual tab
    Then the following card styles should be available: Button, Card, Stack

  @psn-visual
  Scenario: PSN012 - Selecting each card style updates the section preview
    Given the URL and Media section editor is open on the URL tab
    When I add the section URL "https://myavatar.ai/"
    And I add the section URL "https://arena.im/"
    And I switch to the Visual tab
    And I select the Stack card style
    Then the section editor modal should be visible
    When I select the Button card style
    Then the section editor modal should be visible
    When I select the Card card style
    Then the section editor modal should be visible

  # ─── Discard modal ───────────────────────────────────────────────────────────

  @psn-discard
  Scenario: PSN010 - Discard modal: Cancel and X open it; Go back returns to the editor; Discard closes it
    Given the URL and Media section editor is open on the URL tab
    When I click the section Cancel button
    Then the discard confirmation modal should be visible
    When I click Go back
    Then the section editor modal should still be visible
    When I click the section close (X) button
    Then the discard confirmation modal should be visible
    When I click Discard
    Then the section editor modal should not be visible
