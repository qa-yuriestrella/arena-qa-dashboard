@settings-membership-payments
Feature: CAT21 - Settings Membership and Payments
  # =============================================================================
  # CONTEXT FOR NEXT SESSION
  # =============================================================================
  # URL: https://stg-dash-avatar.arena.im/settings  (Membership = nav[2], Payments = nav[3])
  #
  # WHAT THIS CAT COVERS:
  #   Settings > Membership (Assinatura): two tabs — Pricing and Benefits.
  #     - Pricing tab: always shows fixed USD / $4.99 (informational, read-only).
  #     - Both tabs show a red warning banner "Conectar provedor de pagamento"
  #       with a "Setup/Configurar" button ONLY when Stripe is NOT connected.
  #       The Setup button navigates the user to Settings > Payments.
  #     - Benefits tab: lists the perks subscribers get (exclusive content,
  #       more voice call time, unlimited messages, etc.).
  #
  #   Settings > Payments (Pagamentos): Stripe Connect provider card.
  #     - When NOT connected: card shows "Conectar" button.
  #       Clicking it opens a modal "Conectar ao Stripe" with:
  #         • Cancel ("Cancelar") — closes the modal without connecting.
  #         • Connect ("Conectar") — navigates to Stripe Connect onboarding
  #           (https://connect.stripe.com/setup/e/acct_xxx/...).
  #       ⚡ Key behaviour: clicking Connect IMMEDIATELY creates the Stripe
  #          sub-account on the backend (no form completion required).
  #          The dashboard shows "Conectado" badge + "Gerenciar" button as
  #          soon as the user returns from the Stripe page — even without
  #          filling in any Stripe form fields.
  #     - When ALREADY connected: card shows green "Conectado" badge and
  #       a "Gerenciar" button that opens Stripe onboarding in a new tab
  #       (for completing optional profile details: bank account, address…).
  #
  # ⚠️  INCOMPLETE — SMP003 and SMP004 are blocked:
  #   The test account (TEST_USER_EMAIL) already has Stripe connected, so the
  #   "not yet connected" path cannot be exercised from it.
  #   Massa (backend) is evaluating an API to reset the connection for tests.
  #   Stripe's onboarding also uses reCAPTCHA which may block full automation.
  #   Slack thread for context:
  #     https://stationfy.slack.com/archives/C059ZN2LDS4/p1770986365026089
  #
  # PAGE OBJECTS:
  #   support/Pages/SettingsMembershipPage.js  — Membership section
  #   support/Pages/SettingsPaymentsPage.js    — Payments section (Stripe card + modal)
  #
  # WHEN RESUMING:
  #   1. Confirm with Massa whether a backend API to reset the Stripe connection
  #      is available (or if a separate test account without Stripe can be used).
  #   2. Uncomment SMP003 and SMP004 below, implement their Given steps in the
  #      page objects (visitAndSkipIfConnected is already wired up), and run.
  #   3. If Stripe reCAPTCHA blocks SMP003, ask Massa to provide a test-mode
  #      bypass or use a direct API call to simulate the connect action.
  # =============================================================================

  # ─── Membership (Assinatura / Subscription) ───────────────────────────────────
  # The Pricing tab always shows the fixed USD / $4.99 price fields.
  # The Benefits tab lists the perks subscribers receive.
  # When Stripe is NOT connected a red warning banner with a "Setup" button
  # appears on both tabs — this part of the test is pending backend support.

  @smp-membership
  Scenario: SMP001 - Pricing tab shows fixed USD price and Benefits tab lists subscriber perks
    Given I am on the Settings Membership page
    Then the Pricing tab should be active
    And the subscription currency should display "USD" and the price "$4.99"
    When I switch to the Benefits tab
    Then the benefits list should contain subscription benefit items

  # ─── Payments – already connected ─────────────────────────────────────────────

  @smp-payments-connected
  Scenario: SMP002 - Stripe card shows Connected status and Manage button when provider is already connected
    Given I am on the Settings Payments page and Stripe is already connected
    Then the Stripe payment card should be visible
    And the Stripe card should show the "Conectado" badge
    And the Stripe card should show the "Gerenciar" button

  # ─── TODO: implement when backend reset API is available ──────────────────────
  # @smp-payments-connect
  # Scenario: SMP003 - Stripe connect modal can be opened and cancelled, and completing
  #           the flow immediately marks the provider as Connected
  #   Given I am on the Settings Payments page and Stripe is not yet connected
  #   Then the Stripe card should show a "Conectar" button
  #   When I click the Connect button on the Stripe card
  #   Then the Stripe connect modal should be visible
  #   And the Stripe connect modal title should be "Conectar ao Stripe"
  #   And the Stripe connect modal should have "Cancelar" and "Conectar" buttons
  #   When I cancel the Stripe connect modal
  #   Then the Stripe connect modal should be closed
  #   When I click the Connect button on the Stripe card
  #   And I confirm the connection inside the Stripe modal
  #   Then I should be redirected to Stripe onboarding
  #   When I return to the dashboard from Stripe onboarding
  #   Then the Stripe card should show the "Conectado" badge
  #   And the Stripe card should show the "Gerenciar" button
  #
  # @smp-membership-setup
  # Scenario: SMP004 - Setup button in the payment provider warning navigates to Payments
  #   Given I am on the Settings Membership page and Stripe is not yet connected
  #   Then the payment provider warning should be visible with a Setup button
  #   When I click the Setup button in the warning
  #   Then I should be on the Settings Payments page
