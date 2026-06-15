@profile-builder @profile-builder-social
Feature: CAT13 - Profile Builder – Social Links Tab

  Background:
    Given I am on the Profile Builder Social Links tab

  # ─── Form UI ──────────────────────────────────────────────────────────────────

  @pbs-ui
  Scenario: PBS001 - Social Links section is visible with all network input fields
    Then the social links section should be visible
    And input fields for all social networks should be present

  # ─── Real-time preview ────────────────────────────────────────────────────────

  @pbs-realtime
  Scenario: PBS002 - Adding an Instagram URL shows its icon in the real-time preview
    When I fill the social link for "Instagram" with "https://instagram.com/e2e_test_arena"
    Then the "Instagram" icon should appear in the preview

  @pbs-realtime
  Scenario: PBS003 - All six social network icons appear in the preview after adding links
    When I fill social links for all networks
    Then all social network icons should appear in the preview

  @pbs-realtime
  Scenario: PBS004 - Social link icons in the preview are anchor elements pointing to the correct domain
    When I fill the social link for "X" with "https://x.com/e2e_test_arena"
    Then the "X" icon in the preview should link to the correct domain

  # ─── URL normalisation ────────────────────────────────────────────────────────

  @pbs-normalise
  Scenario Outline: PBS005 - Entering a handle for <network> normalises to the full URL after saving
    When I fill the social link for "<network>" with "e2e_test_handle"
    And I save the social links
    Then the "<network>" field should contain the full URL with "e2e_test_handle"

    Examples:
      | network   |
      | Instagram |
      | X         |
      | Youtube   |
      | TikTok    |
      | Facebook  |
      | LinkedIn  |

  # ─── Cancel behaviour ─────────────────────────────────────────────────────────

  @pbs-cancel
  Scenario: PBS006 - Cancelling reverts all social link changes
    When I store the current social link values
    And I fill the social link for "Youtube" with "https://youtube.com/@e2e_cancel_test"
    And I cancel the social link changes
    Then the social link fields should match the stored values
