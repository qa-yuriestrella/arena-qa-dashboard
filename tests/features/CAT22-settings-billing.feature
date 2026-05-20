@settings-billing
Feature: CAT22 - Settings Billing - Plans & Subscriptions

  # =============================================================================
  # CONTEXT
  # =============================================================================
  # URL: https://stg-dash-avatar.arena.im/settings → Billing tab (nav index 4)
  #
  # WHAT THIS CAT COVERS:
  #   Settings > Billing: three tabs — Plans & Usage, Payment Method, Invoices history.
  #   Focus: Plans & Usage tab and the full plan management lifecycle.
  #
  #   Plans available: Starter (US$ 29), Professional (US$ 99), Business (US$ 299)
  #   Test account starts on Starter plan.
  #
  #   Plans & Usage tab shows:
  #     - Plan Information card: Next Renewal, Current Plan, Quota Limits, Usage
  #     - "Manage Plan" button → navigates to #compare-plans view
  #     - 3-dot "More plan options" menu → Cancel Plan option
  #
  #   Compare Plans view (#compare-plans):
  #     - 3 plan cards with "Your Current Plan" (disabled) or "Choose this plan"
  #     - Clicking "Choose this plan" opens a Subscription Payment modal
  #
  #   Upgrade behaviour (e.g. Starter → Professional):
  #     - Modal: "Subscription Payment" with plan name, price, credit card info
  #     - Buttons: "Change Credit Card" and "Confirm Upgrade"
  #     - After confirm: plan changes immediately, redirected to Plans & Usage
  #
  #   Downgrade behaviour (e.g. Professional → Starter):
  #     - Modal: shows "You're downgrading your plan." warning, plan comparison
  #     - Buttons: "Keep <current plan>" (closes modal) and "Confirm Downgrade"
  #     - After confirm: plan is SCHEDULED for end of cycle (not immediate)
  #     - Plans & Usage shows banner: "Your downgrade to X is scheduled for [date]"
  #       with "Cancel downgrade" button
  #     - Compare Plans: target plan shows "Downgrade Scheduled" (disabled),
  #       current plan shows "Your current plan" + "Active until [date]",
  #       all buttons disabled
  #
  #   Cancel Downgrade:
  #     - Clicking "Cancel downgrade" fires request → shows confirmation modal ([role="dialog"])
  #     - Modal has "Done" button; after closing, downgrade banner disappears
  #
  #   Cancel Plan (3-dot menu → Cancel Plan):
  #     - Modal [role="alertdialog"]: "Keep my plan" + "Yes, cancel my plan"
  #     - After cancel: banner on Plans & Usage with "Keep my plan" button
  #     - Compare Plans: current plan shows "Active until [date]", all buttons disabled
  #     - No informational modal on Plans & Usage for keep plan
  #
  #   Keep Plan (reverse cancel):
  #     - Clicking "Keep my plan" fires request immediately (no modal)
  #     - Banner disappears, subscription restored to active
  #
  # PAGE OBJECT: support/Pages/SettingsBillingPage.js
  #
  # STATE DEPENDENCY (run in order for full coverage):
  #   BIL001 — always runnable (read-only)
  #   BIL002 — requires Starter; ends on Professional
  #   BIL003 — requires Professional active; ends on Professional + downgrade scheduled
  #   BIL004 — requires downgrade scheduled; ends on Professional active
  #   BIL005 — requires Professional active; ends on Professional + cancellation scheduled
  #   BIL006 — requires cancellation scheduled; ends on Professional active
  #   To re-run from BIL002: manually downgrade to Starter (wait for billing cycle reset).
  # =============================================================================

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
