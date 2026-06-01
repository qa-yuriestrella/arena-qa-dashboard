@settings-billing
Feature: CAT22 - Settings Billing - Plans & Subscriptions


  # ─── Plans & Usage overview ───────────────────────────────────────────────────

  @billing-overview
  Scenario: BIL001 - Plans & Usage tab displays current plan information
    Given I am on the Settings Billing page
    Then the Plans & Usage tab should be active
    And the Plan Information section should be visible
    And the Next Renewal date should be visible
    And the Current Plan label should be visible
    And the Quota Limits section should be visible
    And the Usage section should be visible
    And the Manage Plan button should be visible

  # ─── Upgrade ──────────────────────────────────────────────────────────────────

  # TODO (BIL002): This test requires a fresh Starter account to run.
  # Since BIL003 upgrades to Professional and downgrades are only scheduled (not immediate),
  # the account cannot be restored to Starter within the same billing cycle.
  # Solution: create a dedicated Starter account via API before each BIL002 run.
  # Signup flow (5 steps): Google Identity → LinkInBio signup → Chargebee card token
  #   → Arena login → create subscription (POST /billing/subscriptions with plan=starter).
  # Pending: João Lenon (backend) to provide env var values for staging:
  #   GOOGLE_IDENTITY_URL, LINKINBIO_SIGNUP_URL, CHARGEBEE_SITE, CHARGEBEE_API_KEY,
  #   ARENA_AUTH_URL, ARENA_BILLING_API_URL.
  # Once available, implement scripts/createStarterAccount.js as a beforeAll hook for this test.
  @billing-upgrade
  Scenario: BIL002 - Upgrade plan from Starter to Professional
    Given I am on the Settings Billing page with plan "Starter"
    When I click Manage Plan
    Then the plan comparison should show Starter, Professional, and Business cards
    And "Starter" should be marked as the current plan
    And the other plans should have "Choose this plan" buttons enabled

    When I choose the "Professional" plan
    Then the Subscription Payment modal should show plan "Professional"
    And the modal should show price and current credit card info with Confirm Upgrade button

    When I confirm the upgrade
    Then I should be back on Plans & Usage with current plan "Professional"

  # ─── Downgrade ────────────────────────────────────────────────────────────────

  @billing-downgrade
  Scenario: BIL003 - Downgrade plan from Professional to Starter schedules the change
    Given I am on the Settings Billing page with plan "Professional" and no pending changes
    When I click Manage Plan
    Then "Professional" should be marked as the current plan
    And "Starter" and "Business" should have "Choose this plan" buttons enabled

    When I choose the "Starter" plan for downgrade
    Then the downgrade modal should show the "You're downgrading your plan." warning
    And the downgrade modal should show "Keep Professional" and "Confirm Downgrade" buttons

    When I confirm the downgrade
    Then Plans & Usage should show a downgrade scheduled banner mentioning "Starter"
    And the Manage Plan view should show "Active until" on "Professional" and "Downgrade Scheduled" on "Starter"

  # ─── Cancel Downgrade ─────────────────────────────────────────────────────────

  @billing-cancel-downgrade
  Scenario: BIL004 - Cancel scheduled downgrade restores the active plan
    Given I am on the Settings Billing page with a scheduled downgrade
    Then the downgrade scheduled banner should be visible with a Cancel downgrade button

    When I cancel the downgrade from the Plans & Usage banner
    Then a confirmation modal should appear informing the downgrade was cancelled
    When I close the confirmation modal
    Then the downgrade banner should be gone
    And the current plan should be active with no pending changes

  # ─── Cancel Plan ──────────────────────────────────────────────────────────────

  @billing-cancel-plan
  Scenario: BIL005 - Cancel plan via 3-dot menu schedules plan cancellation
    Given I am on the Settings Billing page with an active paid plan and no pending changes
    When I open the More Plan Options menu and select Cancel Plan
    Then the cancel plan alert should appear with "Keep my plan" and "Yes, cancel my plan" buttons

    When I confirm the plan cancellation
    Then Plans & Usage should show a plan cancellation banner with a "Keep my plan" button
    And the Manage Plan view should show "Active until" on the current plan with all buttons disabled

  # ─── Keep Plan ────────────────────────────────────────────────────────────────

  @billing-keep-plan
  Scenario: BIL006 - Keep plan cancels the scheduled cancellation and restores the subscription
    Given I am on the Settings Billing page with a scheduled plan cancellation
    Then the plan cancellation banner should be visible with a "Keep my plan" button

    When I click Keep my plan to restore the subscription
    Then the cancellation banner should disappear
    And the plan should be active with no pending cancellation

  # ─── Payment Method overview ─────────────────────────────────────────────────


  @billing-payment-method
  Scenario: BIL007 - Payment Method tab displays current credit card information
    Given I am on the Settings Billing page
    When I navigate to the Payment Method tab
    Then the Payment Method tab should be active
    And the current credit card section should be visible
    And the card brand and last four digits should be visible
    And the card expiry date should be visible
    And the Change Credit Card button should be visible

  @billing-change-cc
  Scenario: BIL008 - Change Credit Card updates the payment method successfully
    Given I am on the Settings Billing Payment Method tab
    When I click the Change Credit Card button
    Then the Update Payment Method modal should open with Name, Email, and card fields

    When I fill the credit card form with name "Test Automation", card "4111111111111111", expiry "12/29" and CVV "737"
    And I save the new payment method
    Then the Chargebee tokenization and Arena credit card update should both succeed
    And the modal should close and the current credit card section should remain visible

  # ─── Invoices history (TODO) ─────────────────────────────────────────────────

  # TODO (BIL009+): The Invoices history tab lists all transactions with invoice number,
  # date, amount, and a PDF download link.
  # To test this properly we need an account that has at least one completed transaction
  # (e.g. an upgrade from Starter → Professional), so there is a real invoice to verify.
  #
  # The plan is to reuse the same fresh-account signup flow pending from BIL002:
  # once João Lenon (backend) provides the env vars for staging
  #   (GOOGLE_IDENTITY_URL, LINKINBIO_SIGNUP_URL, CHARGEBEE_SITE, CHARGEBEE_API_KEY,
  #    ARENA_AUTH_URL, ARENA_BILLING_API_URL)
  # we will implement scripts/createStarterAccount.js, perform a programmatic upgrade
  # to Professional, and then verify the resulting invoice appears in the history tab
  # with a valid PDF link.
  # Scenarios planned:
  #   BIL009 - Invoices history tab shows at least one invoice after an upgrade
  #   BIL010 - PDF download link for an invoice resolves to a valid document
