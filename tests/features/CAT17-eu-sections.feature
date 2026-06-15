@eu-sections
Feature: CAT17 - End User – Sections

  # ─── URL Media on End User ────────────────────────────────────────────────────

  @eupsn-styles
  Scenario: EUPSN001 - All URL Media styles (Button/Stack, Card/Square/Carousel, Card/Horizontal/Stack, Card/Horizontal/Carousel, Card/Vertical/Carousel) render correctly
    Given a URL Media section titled "E2E Styles Section" with the following links has been saved in the dashboard:
      | https://open.spotify.com/playlist/2ID1itDFQDN33Z1MwaDJUG?si=779526133d1b44af |
      | https://www.amazon.com/dp/B09G9FPHY6?th=1                                      |
      | https://g1.globo.com/                                                           |
      | https://myavatar.ai/                                                            |
      | https://github.com/                                                             |
    When the section "E2E Styles Section" is styled as "Button / Stack" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Styles Section" should be visible on the end user page
    And the first card in section "E2E Styles Section" should have a landscape aspect ratio
    When the section "E2E Styles Section" is styled as "Card / Square / Carousel" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Styles Section" should be visible on the end user page
    And the first card in section "E2E Styles Section" should have a square aspect ratio
    And the carousel in section "E2E Styles Section" should scroll through all 5 links
    When the section "E2E Styles Section" is styled as "Card / Horizontal / Stack" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Styles Section" should be visible on the end user page
    And the first card in section "E2E Styles Section" should have a landscape aspect ratio
    When the section "E2E Styles Section" is styled as "Card / Horizontal / Carousel" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Styles Section" should be visible on the end user page
    And the first card in section "E2E Styles Section" should have a landscape aspect ratio
    And the carousel in section "E2E Styles Section" should scroll through all 5 links
    When the section "E2E Styles Section" is styled as "Card / Vertical / Carousel" in the dashboard
    And I navigate to the end user page
    Then the section "E2E Styles Section" should be visible on the end user page
    And the first card in section "E2E Styles Section" should have a portrait aspect ratio
    And the carousel in section "E2E Styles Section" should scroll through all 5 links

  @eupsn-carousel
  Scenario: EUPSN002 - A section with many links shows all cards reachable and link opens correct URL
    Given a URL Media section titled "E2E Carousel Section" with the following links has been saved in the dashboard:
      | https://open.spotify.com/playlist/2ID1itDFQDN33Z1MwaDJUG?si=779526133d1b44af |
      | https://www.amazon.com/dp/B09G9FPHY6?th=1                                      |
      | https://g1.globo.com/                                                           |
      | https://myavatar.ai/                                                            |
      | https://github.com/                                                             |
    When I navigate to the end user page
    Then the section "E2E Carousel Section" should be visible on the end user page
    And the section "E2E Carousel Section" should have at least 4 link cards
    And I click the first link card in section "E2E Carousel Section"
    Then a new tab should open with a URL matching "spotify.com"

  # ─── Digital Product on End User ─────────────────────────────────────────────

  @eudps-purchase
  Scenario: EUDPS001 - Full purchase flow via URL delivery: card visible, landing page, Stripe checkout, post-purchase, and access
    Given a Digital Product section titled "E2E Test Product" has been saved in the dashboard
    When I navigate to the end user page as an unauthenticated user
    Then the product card for "E2E Test Product" should be visible on the end user page
    And the product card should show the CTA button
    When I click the product card for "E2E Test Product"
    Then the product landing page should be visible
    And the landing page should show the product description
    And the landing page should show the CTA button
    When I click the landing page CTA button
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
  Scenario: EUDPS002 - Full purchase flow with file download delivery: card visible, landing page, Stripe checkout, and file download
    Given a Digital Product section with file delivery titled "E2E File Product" has been saved in the dashboard
    When I navigate to the end user page as an unauthenticated user
    Then the product card for "E2E File Product" should be visible on the end user page
    And the product card should show the CTA button
    When I click the product card for "E2E File Product"
    Then the product landing page should be visible
    And the landing page should show the CTA button
    When I click the landing page CTA button
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

  # ─── Modern EU Sections ────────────────────────────────────────────────────────

  Rule: Modern EU

    @eupsn-styles @eu-modern-sections
    Scenario: EUPSN001M - All URL Media styles render correctly on the Modern EU page
      Given a URL Media section titled "E2E Styles Section M" with the following links has been saved in the modern avatar dashboard:
        | https://open.spotify.com/playlist/2ID1itDFQDN33Z1MwaDJUG?si=779526133d1b44af |
        | https://www.amazon.com/dp/B09G9FPHY6?th=1                                      |
        | https://g1.globo.com/                                                           |
        | https://myavatar.ai/                                                            |
        | https://github.com/                                                             |
      When the section "E2E Styles Section M" is styled as "Button / Stack" in the modern avatar dashboard
      And I navigate to the modern end user page
      Then the section "E2E Styles Section M" should be visible on the modern end user page
      And the first card in section "E2E Styles Section M" should have a landscape aspect ratio on the modern end user page
      When the section "E2E Styles Section M" is styled as "Card / Square / Carousel" in the modern avatar dashboard
      And I navigate to the modern end user page
      Then the section "E2E Styles Section M" should be visible on the modern end user page
      And the first card in section "E2E Styles Section M" should have a square aspect ratio on the modern end user page
      And the carousel in section "E2E Styles Section M" should scroll through all 5 links on the modern end user page
      When the section "E2E Styles Section M" is styled as "Card / Horizontal / Stack" in the modern avatar dashboard
      And I navigate to the modern end user page
      Then the section "E2E Styles Section M" should be visible on the modern end user page
      And the first card in section "E2E Styles Section M" should have a landscape aspect ratio on the modern end user page
      When the section "E2E Styles Section M" is styled as "Card / Horizontal / Carousel" in the modern avatar dashboard
      And I navigate to the modern end user page
      Then the section "E2E Styles Section M" should be visible on the modern end user page
      And the first card in section "E2E Styles Section M" should have a landscape aspect ratio on the modern end user page
      And the carousel in section "E2E Styles Section M" should scroll through all 5 links on the modern end user page
      When the section "E2E Styles Section M" is styled as "Card / Vertical / Carousel" in the modern avatar dashboard
      And I navigate to the modern end user page
      Then the section "E2E Styles Section M" should be visible on the modern end user page
      And the first card in section "E2E Styles Section M" should have a portrait aspect ratio on the modern end user page
      And the carousel in section "E2E Styles Section M" should scroll through all 5 links on the modern end user page

    @eupsn-carousel @eu-modern-sections
    Scenario: EUPSN002M - A Modern EU section with many links shows all cards reachable and link opens correct URL
      Given a URL Media section titled "E2E Carousel Section M" with the following links has been saved in the modern avatar dashboard:
        | https://open.spotify.com/playlist/2ID1itDFQDN33Z1MwaDJUG?si=779526133d1b44af |
        | https://www.amazon.com/dp/B09G9FPHY6?th=1                                      |
        | https://g1.globo.com/                                                           |
        | https://myavatar.ai/                                                            |
        | https://github.com/                                                             |
      When I navigate to the modern end user page
      Then the section "E2E Carousel Section M" should be visible on the modern end user page
      And the section "E2E Carousel Section M" should have at least 4 link cards on the modern end user page
      And I click the first link card in section "E2E Carousel Section M" on the modern end user page
      Then a new tab should open with a URL matching "spotify.com"

    @eudps-purchase @eu-modern-sections
    Scenario: EUDPS001M - Full purchase flow via URL delivery on the Modern EU page
      Given a Digital Product section titled "E2E Test Product M" has been saved in the modern avatar dashboard
      When I navigate to the modern end user page as an unauthenticated user
      Then the product card for "E2E Test Product M" should be visible on the modern end user page
      And the product card should show the CTA button on the modern end user page
      When I click the product card for "E2E Test Product M" on the modern end user page
      Then the product landing page should be visible on the modern end user page
      And the landing page should show the product description on the modern end user page
      And the landing page should show the CTA button on the modern end user page
      When I click the landing page CTA button on the modern end user page
      Then the auth modal should be visible
      When I select email signup
      And I fill in the signup form with a new user
      And I click Create Account
      And I fill in the display name
      And I click Save
      Then I should be on the Stripe checkout page
      When I fill the Stripe card with number "4242 4242 4242 4242", expiry "11/32", CVC "111", and name "E2E Tester"
      And I complete the Stripe checkout
      Then the post-purchase page should be visible for "E2E Test Product M"
      And the post-purchase page should have an "Access Now" button
      And the post-purchase page should have a "Back to" button
      When I click the "Back to" button on the post-purchase page
      Then I should be on the modern end user page
      And the product card for "E2E Test Product M" should show "Access Now" instead of the CTA button on the modern end user page
      When I click "Access Now" on the product card for "E2E Test Product M" on the modern end user page
      And I click the landing page CTA button on the modern end user page
      Then the product should be delivered

    @eudps-download @eu-modern-sections
    Scenario: EUDPS002M - Full purchase flow with file download delivery on the Modern EU page
      Given a Digital Product section with file delivery titled "E2E File Product M" has been saved in the modern avatar dashboard
      When I navigate to the modern end user page as an unauthenticated user
      Then the product card for "E2E File Product M" should be visible on the modern end user page
      And the product card should show the CTA button on the modern end user page
      When I click the product card for "E2E File Product M" on the modern end user page
      Then the product landing page should be visible on the modern end user page
      And the landing page should show the CTA button on the modern end user page
      When I click the landing page CTA button on the modern end user page
      Then the auth modal should be visible
      When I select email signup
      And I fill in the signup form with a new user
      And I click Create Account
      And I fill in the display name
      And I click Save
      Then I should be on the Stripe checkout page
      When I fill the Stripe card with number "4242 4242 4242 4242", expiry "11/32", CVC "111", and name "E2E Tester"
      And I complete the Stripe checkout
      Then the post-purchase page should be visible for "E2E File Product M"
      When I click the "Access Now" button on the post-purchase page
      Then the product file should be downloaded
