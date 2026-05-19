@eu-sections
Feature: CAT19 - End User – Sections

  # ─── URL Media on End User ────────────────────────────────────────────────────

  @eupsn-visible
  Scenario: EUPSN001 - A saved URL Media section appears on the end user page
    Given a URL Media section titled "E2E EU URL Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E EU URL Section" should be visible on the end user page

  @eupsn-stack
  Scenario: EUPSN002 - A URL Media section in Stack style with diverse links shows all cards on the end user page
    Given a URL Media section in "Stack" style titled "E2E Stack Section" with links "https://open.spotify.com/playlist/2ID1itDFQDN33Z1MwaDJUG?si=779526133d1b44af" and "https://www.amazon.com/dp/B09G9FPHY6?th=1" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E Stack Section" should be visible on the end user page
    And at least 2 section link cards should be visible

  @eupsn-link
  Scenario: EUPSN003 - Clicking a section link card opens the URL in a new browser tab
    Given a URL Media section titled "E2E Link Section" with link "https://g1.globo.com/" has been saved in the dashboard
    When I navigate to the end user page
    And I click the first link card in section "E2E Link Section"
    Then a new tab should open with a URL matching "globo.com"

  @eupsn-horizontal
  Scenario: EUPSN004 - A URL Media section in Button style shows landscape cards on the end user page
    Given a URL Media section in "Button" style titled "E2E Horizontal Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E Horizontal Section" should be visible on the end user page
    And the first card in section "E2E Horizontal Section" should have a landscape aspect ratio

  @eupsn-square
  Scenario: EUPSN005 - A URL Media section in Card style shows near-square cards on the end user page
    Given a URL Media section in "Card" style titled "E2E Square Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When I navigate to the end user page
    Then the section "E2E Square Section" should be visible on the end user page
    And the first card in section "E2E Square Section" should have a square aspect ratio

  @eupsn-edit
  Scenario: EUPSN007 - Editing a URL Media section title is reflected on the end user page after refresh
    Given a URL Media section titled "E2E Edit Section" with link "https://myavatar.ai/" has been saved in the dashboard
    When the section "E2E Edit Section" is edited with title "E2E Edited Section" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Edited Section" should be visible on the end user page

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

  @eudps-purchase
  Scenario: EUDPS003 - Full purchase flow via URL delivery: signup, Stripe checkout, post-purchase, and access
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

  @eudps-download
  Scenario: EUDPS004 - Full purchase flow with file download delivery
    Given a Digital Product section with file delivery titled "E2E File Product" has been saved in the dashboard
    When I navigate to the end user page as an unauthenticated user
    And I click the product card for "E2E File Product"
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
    Then the post-purchase page should be visible for "E2E File Product"
    When I click the "Access Now" button on the post-purchase page
    Then the product file should be downloaded
