@home
Feature: CAT05 - Home Page

  Background:
    Given I am logged in and on the home page

  @home-greeting
  Scenario: HM001 - Greeting section is visible
    Then the greeting section should be visible

  @home-greeting
  Scenario: HM002 - Greeting text matches the current time of day
    Then the greeting should match the current time of day

  @home-level-up
  Scenario: HM003 - "Add Video AI to your profile" card redirects to /video-ai
    When I click the "Add Video AI to your profile" card
    Then the current URL should contain "/video-ai"

  @home-level-up
  Scenario: HM004 - "Enrich your Knowledge Base" card redirects to /knowledge-base
    When I click the "Enrich your Knowledge Base" card
    Then the current URL should contain "/knowledge-base"

  @home-level-up
  Scenario: HM005 - "Add bio to your profile" card redirects to /profile-builder
    When I click the "Add bio to your profile" card
    Then the current URL should contain "/profile-builder"

  @home-level-up
  Scenario: HM006 - "Clone your voice" card opens voice clone modal in knowledge base
    When I click the "Clone your voice" card
    Then the current URL should contain "/knowledge-base"
    And the current URL should contain "open=voice-clone"

  @home-metrics
  Scenario: HM007 - Avatar Metrics chart loads with data
    Then the metrics section should be loaded with data
