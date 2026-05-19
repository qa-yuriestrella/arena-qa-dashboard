@eu-sections
Feature: CAT19 - End User – Sections

  # These tests validate that sections configured in the dashboard (CAT15/16)
  # are correctly displayed and interactive on the end-user page.
  # Tests run AFTER CAT15/16 because they depend on published sections.
  #
  # URL Media scenarios verify:
  #   • Section title visible on EU page
  #   • Carousel card style navigates with arrow buttons
  #   • Link cards open the configured URL in a new tab
  #
  # Digital Product scenarios verify:
  #   • Product thumbnail card visible on EU page
  #   • Clicking card opens the landing page (carousel + description + CTA)
  #   • CTA for anonymous user triggers the auth modal
  #   • Full purchase flow: signup → Stripe (fake card) → post-purchase page →
  #     "Access Now" / "Back to Avatar" buttons →
  #     returning to EU shows "Access Now" on the card →
  #     clicking "Access Now" delivers the product

  # ─── URL Media on End User ────────────────────────────────────────────────────

  @eupsn-visible
  Scenario: EUPSN001 - A saved URL Media section appears on the end user page
    Given a URL Media section titled "E2E EU URL Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E EU URL Section" should be visible on the end user page

  @eupsn-carousel
  Scenario: EUPSN002 - A URL Media section with multiple links shows all cards on the end user page
    Given a URL Media section in Stack style titled "E2E Stack Section" with links "https://myavatar.ai/" and "https://arena.im/" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E Stack Section" should be visible on the end user page
    And at least 2 section link cards should be visible

  @eupsn-link
  Scenario: EUPSN003 - Clicking a section link card opens the URL in a new browser tab
    Given a URL Media section titled "E2E Link Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When I navigate to the end user page
    And I click the first section link card
    Then a new tab should open with a URL matching "myavatar.ai"

  # ─── Digital Product on End User ─────────────────────────────────────────────

  @eudps-visible
  Scenario: EUDPS001 - A saved Digital Product section shows the product card with CTA button on the end user page
    Given a Digital Product section titled "E2E Test Product" has been saved in the dashboard
    When I navigate to the end user page
    Then the product card for "E2E Test Product" should be visible on the end user page
    And the product card should show the CTA button

  @eudps-landing
  Scenario: EUDPS002 - Clicking the product card opens the landing page with description and CTA button
    Given a Digital Product section titled "E2E Test Product" has been saved in the dashboard
    When I navigate to the end user page
    And I click the product card for "E2E Test Product"
    Then the product landing page should be visible
    And the landing page should show the product description
    And the landing page should show the CTA button

  @eudps-auth
  Scenario: EUDPS003 - Clicking the CTA button on the landing page shows the auth modal for unauthenticated users
    Given a Digital Product section titled "E2E Test Product" has been saved in the dashboard
    When I navigate to the end user page as an unauthenticated user
    And I click the product card for "E2E Test Product"
    And I click the landing page CTA button
    Then the auth modal should be visible

  @eudps-purchase
  Scenario: EUDPS004 - Full purchase flow: signup, Stripe checkout with fake card, post-purchase page, and product delivery
    Given a Digital Product section titled "E2E Test Product" has been saved in the dashboard
    When I navigate to the end user page as an unauthenticated user
    And I click the product card for "E2E Test Product"
    And I click the landing page CTA button
    Then the auth modal should be visible
    When I select email signup
    And I fill in the signup form with a new user
    And I click Create Account
    And I fill in the display name
    And I click Save
    Then I should be on the Stripe checkout page
    When I fill the Stripe card with number "4242 4242 4242 4242", expiry "11/32", CVC "111", and name "E2E Tester"
    And I complete the Stripe checkout
    Then the post-purchase page should be visible for "E2E Test Product"
    And the post-purchase page should have an "Access Now" button
    And the post-purchase page should have a "Back to" button
    When I click the "Back to" button on the post-purchase page
    Then I should be on the end user page
    And the product card for "E2E Test Product" should show "Access Now" instead of the CTA button
    When I click "Access Now" on the product card for "E2E Test Product"
    And I click the landing page CTA button
    Then the product should be delivered
