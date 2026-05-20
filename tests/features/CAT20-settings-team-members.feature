@settings-team
Feature: CAT20 - Settings Team Members

  # ─── UI checks — no member dependency ────────────────────────────────────────

  @stm-ui @sti-ui
  Scenario: STM001 - Settings Team Members page and invite modal load with required UI elements
    Given I am on the Settings Team Members page
    Then the Team Members tab should be active
    And the member list should be visible
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    Then the invite modal should be visible
    And the email input should be visible in the modal
    And the role selector should be visible in the modal

  @sti-list @sti-cancel
  Scenario: STM002 - Invite list supports adding and removing emails, and the modal can be cancelled
    Given I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type "test1@example.com" in the invite email input and press Enter
    And I type "test2@example.com" in the invite email input and press Enter
    Then the invite list should contain 2 entries
    When I remove the first entry from the invite list
    Then the invite list should contain 1 entry
    When I close the invite modal
    Then the invite modal should not be visible

  # ─── Full invite flows — these ADD members to the team ────────────────────────
  # STM003/STM004 must run before STM005/STM006 so non-owner members exist.

  # automation.arena1+2@gmail.com already has a myAvatar account.
  # Acceptance: email pre-filled + password only → login → dashboard.

  @sti-existing
  Scenario: STM003 - Inviting an existing myAvatar user sends an email and allows login to accept
    Given all pending invites are cancelled
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type the existing invite email in the input and press Enter
    And I select the "Member" role
    And I click "Invite Now"
    Then the invite confirmation should be shown
    When I open Gmail and find the latest Arena invite email
    And I click the invite link in the email
    Then the invite acceptance page should show the email pre-filled without a name field
    When I fill in the invite password and submit
    Then the invite acceptance should redirect to the dashboard
    And the invited user should appear in the team members list

  # automation.arena1+N@gmail.com (N≥3, auto-incremented from invite-counter.json)
  # does NOT have a myAvatar account yet.
  # Acceptance: email + name + password → signup → dashboard.

  @sti-new
  Scenario: STM004 - Inviting a new user sends an email and allows signup to accept
    Given all pending invites are cancelled
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type the next new invite email in the input and press Enter
    And I select the "Member" role
    And I click "Invite Now"
    Then the invite confirmation should be shown
    When I open Gmail and find the latest Arena invite email
    And I click the invite link in the email
    Then the invite acceptance page should show a name field for new account signup
    When I fill in the invite name, password and submit
    Then the invite acceptance should redirect to the dashboard
    And the invited user should appear in the team members list

  # ─── Member management — require a non-owner member (created by STM003/STM004) ─

  @stm-role
  Scenario: STM005 - A member's role can be toggled between Member and Admin
    Given I am on the Settings Team Members page
    When I change the first non-owner member role to "Admin"
    Then the first non-owner member should display the "Admin" role
    When I change the first non-owner member role to "Member"
    Then the first non-owner member should display the "Member" role

  @stm-delete
  Scenario: STM006 - Deleting a member via the actions menu removes them from the list
    Given I am on the Settings Team Members page
    When I delete the last member in the team via the actions menu
    Then that member should no longer appear in the team list

  # ─── Invite row actions — Resend / Copy link / Delete ────────────────────────

  @sti-resend
  Scenario: STM007 - Resending an invite sends a new email with a valid invite link
    Given all pending invites are cancelled
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type the existing invite email in the input and press Enter
    And I select the "Member" role
    And I click "Invite Now"
    Then the invite confirmation should be shown
    When I resend the first pending invite
    And I open Gmail and find the latest Arena invite email
    And I click the invite link in the email
    Then the invite acceptance page should show the email pre-filled without a name field
    And I close the invite link page

  @sti-copylink
  Scenario: STM008 - Copying an invite link gives a valid invite URL
    Given all pending invites are cancelled
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type the next new invite email in the input and press Enter
    And I select the "Member" role
    And I click "Invite Now"
    Then the invite confirmation should be shown
    When I copy the link of the first pending invite
    And I open the copied invite link
    Then the invite acceptance page should show a name field for new account signup
    And I close the invite link page

  @sti-delete
  Scenario: STM009 - Deleting an invite makes the link invalid
    Given all pending invites are cancelled
    And I am on the Settings Invite tab
    When I click the "Invite Members" button
    And I type the next new invite email in the input and press Enter
    And I select the "Member" role
    And I click "Invite Now"
    Then the invite confirmation should be shown
    When I open Gmail and find the latest Arena invite email
    And I delete the first pending invite
    And I click the invite link in the email
    Then the invite link should be invalid
