@sections @sections-digital-product
Feature: CAT16 - Sections – Digital Product

  # Digital Product is a section type opened via the "+ Add Section" modal.
  # The editor has three tabs: Thumbnail → Landing Page → Product.
  # Tab 1 (Thumbnail): Cancel + Next buttons (Next disabled until Title + Price filled).
  # Tab 2 (Landing Page): Back + Next buttons (tab-click bypasses required-field validation).
  # Tab 3 (Product): Back + Save buttons (Save disabled until all required fields filled).
  # Cancel / X / blur trigger the same discard confirmation modal used by URL and Media.

  Background:
    Given I am on the Sections page

  # ─── Type selector ───────────────────────────────────────────────────────────

  @dpd-ui
  Scenario: DPS001 - Digital Product button opens a 3-tab editor with Thumbnail tab active
    When I click Add Section
    And I select Digital Product
    Then the digital product editor should be visible
    And the Thumbnail tab should be active

  # ─── Thumbnail tab ───────────────────────────────────────────────────────────

  @dpd-thumbnail
  Scenario: DPS002 - Thumbnail required fields enable Next; currency is locked to USD; price format is validated
    Given the Digital Product editor is open on the Thumbnail tab
    Then the Next button should be disabled
    And the currency should be locked to USD
    When I fill the product title with "Test Product"
    And I fill the product price with "999999.99"
    Then the Next button should be enabled
    And the price field should show "999999.99"

  @dpd-thumbnail
  Scenario: DPS003 - Title enforces 50-character maximum and short description enforces 150-character maximum
    Given the Digital Product editor is open on the Thumbnail tab
    When I fill the product title with a 51-character string
    Then the product title should be limited to 50 characters
    When I fill the product short description with a 151-character string
    Then the product short description should be limited to 150 characters

  @dpd-thumbnail
  Scenario: DPS004 - Selecting a thumbnail image opens the crop dialog and saves the selection
    Given the Digital Product editor is open on the Thumbnail tab
    When I click the thumbnail image selector
    And I upload and crop the product image
    Then the product thumbnail image should be set

  # ─── Tab navigation ──────────────────────────────────────────────────────────

  @dpd-tab-nav
  Scenario: DPS005 - Clicking the Landing Page tab directly bypasses required field validation
    Given the Digital Product editor is open on the Thumbnail tab
    When I click the Landing Page tab directly
    Then the Landing Page tab content should be visible

  # ─── Landing Page tab ────────────────────────────────────────────────────────

  @dpd-landing
  Scenario: DPS006 - Landing Page title enforces 300-character maximum and description has a formatting toolbar
    Given the Digital Product editor is open on the Landing Page tab
    When I fill the landing page title with a 301-character string
    Then the landing page title should be limited to 300 characters
    And the description formatting toolbar should be visible

  @dpd-landing
  Scenario: DPS007 - Slug field shows a live URL preview; CTA defaults to "Buy Now!" and enforces 30 characters
    Given the Digital Product editor is open on the Landing Page tab
    When I fill the product slug with "my-e2e-product"
    Then the slug preview should include "my-e2e-product"
    And the CTA field should default to "Buy Now!"
    When I fill the CTA field with a 31-character string
    Then the CTA field should be limited to 30 characters

  @dpd-landing
  Scenario: DPS008 - Landing Page gallery supports up to 5 images and the Add button disables at the limit
    Given the Digital Product editor is open on the Landing Page tab
    When I add images until the gallery has 5
    Then the Add image button should be disabled

  # ─── Product tab ─────────────────────────────────────────────────────────────

  @dpd-product
  Scenario: DPS009 - Upload file button opens the file browser
    Given the Digital Product editor is open on the Product tab
    When I click the Upload file button
    Then a file input should be available for upload

  @dpd-product
  Scenario: DPS010 - External URL field validates format; Save button is disabled without all required fields
    Given the Digital Product editor is open on the Product tab
    When I fill the external product URL with "not-a-valid-url"
    Then the external URL error should be visible
    And the digital product editor Save button should be disabled

  @dpd-product
  Scenario: DPS011 - File upload and External URL are mutually exclusive
    Given the Digital Product editor is open on the Product tab
    When I upload a product file
    Then the External URL field should be disabled or hidden
    When I clear the product file
    Then the External URL field should be available

  # ─── Validation ──────────────────────────────────────────────────────────────

  @dpd-validation
  Scenario: DPS012 - Clicking Next without required fields shows a validation error and stays on the Thumbnail tab
    Given the Digital Product editor is open on the Thumbnail tab
    When I click Next without filling required fields
    Then a validation error should be visible
    And the Thumbnail tab should be active

  # ─── Preview ─────────────────────────────────────────────────────────────────

  @dpd-preview
  Scenario: DPS013 - Product preview updates in real time as the title is filled
    Given the Digital Product editor is open on the Thumbnail tab
    When I fill the product title with "Live Preview Test"
    Then the digital product preview should show "Live Preview Test"

  # ─── Discard modal ───────────────────────────────────────────────────────────

  # ─── Save ────────────────────────────────────────────────────────────────────

  @dpd-save
  Scenario: DPS015 - Saving a fully configured Digital Product fires the save request and the section appears on the page
    Given the Digital Product editor is open on the Thumbnail tab
    When I fill the product title with "E2E Digital Product"
    And I fill the product price with "9.99"
    And I click Next to go to Landing Page
    And I fill the product slug with "e2e-digital-product"
    And I fill the landing page description with "E2E test product description."
    And I click Next to go to Product tab
    And I fill the external product URL with "https://myavatar.ai/"
    And I save the digital product
    Then the digital product save request should be fired
    And the section "E2E Digital Product" should be visible on the sections page

  # ─── Discard modal ───────────────────────────────────────────────────────────

  @dpd-discard1
  Scenario: DPS014 - Cancel button and X button both open the discard confirmation modal
    Given the Digital Product editor is open on the Thumbnail tab
    When I click the digital product Cancel button
    Then the discard confirmation modal should be visible
    When I click Go back
    Then the digital product editor should still be visible
    When I click the digital product close (X) button
    Then the discard confirmation modal should be visible
