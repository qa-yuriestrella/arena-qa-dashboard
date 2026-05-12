@profile-builder @profile-builder-visual
Feature: CAT14 - Profile Builder – Visual Tab

  Background:
    Given I am on the Profile Builder Visual tab

  # ─── Color picker UI ─────────────────────────────────────────────────────────

  @pbv-ui
  Scenario: PBV001 - Color picker panel opens when clicking the color button
    When I click the color picker button
    Then the color picker panel should be visible

  # ─── Real-time preview ────────────────────────────────────────────────────────

  @pbv-realtime
  Scenario: PBV002 - Clicking a color preset immediately updates the preview
    Given the color picker is open
    When I click a color preset
    Then the preview background color should reflect the selected color

  @pbv-realtime
  Scenario: PBV003 - Typing a hex value in the input immediately updates the preview
    Given the color picker is open
    When I type the hex color "E63946"
    Then the preview should reflect the hex color "#E63946"

  # ─── Save & end-user reflection ───────────────────────────────────────────────

  @pbv-save
  Scenario: PBV004 - Saving a color change reflects it in the end user page
    Given the color picker is open
    When I click a color preset
    And I save the visual settings
    Then the end user page should reflect the updated color
