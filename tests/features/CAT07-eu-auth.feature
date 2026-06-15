@end-user-auth
Feature: CAT07 - End User Authentication

  # ─── Classic EU ───────────────────────────────────────────────────────────────

  Rule: Classic EU

    Background:
      Given I am on the end user page

    # ─── Entry points ───────────────────────────────────────────────────────────

    @eu-auth
    Scenario: EU001 - Auth modal opens from multiple entry points with all login options
      When I click the end user profile button
      Then the auth modal should be visible
      And the auth modal should show Google, Facebook, X, and Email options
      When I reload the end user page
      And I click the Subscribe button
      Then the auth modal should be visible
      When I reload the end user page
      And I open the text chat
      And I click the profile icon inside the chat
      Then the auth modal should be visible

    # ─── Email signup ────────────────────────────────────────────────────────────

    @eu-signup
    Scenario: EU002 - Complete email signup with display name creates a new account
      When I click the end user profile button
      And I select email signup
      And I fill in the signup form with a new user
      And I click Create Account
      And I fill in the display name
      And I click Save
      Then I should be logged in to the end user

    @eu-signup
    Scenario: EU003 - Password visibility toggles work on both password fields
      When I click the end user profile button
      And I select email signup
      Then the password field should be hidden
      When I click the password toggle
      Then the password field should be visible
      When I click the password toggle again
      Then the password field should be hidden
      And the confirm password field should be hidden
      When I click the confirm password toggle
      Then the confirm password field should be visible

    # ─── Email sign in ───────────────────────────────────────────────────────────

    @eu-signin
    Scenario: EU004 - Signing in with valid email credentials logs the user in
      When I click the end user profile button
      And I select email signup
      And I click the sign in link
      And I fill in the signin email with "yuri+qa@arena.im"
      And I fill in the signin password with "Teste@123"
      And I click Sign In
      Then I should be logged in to the end user

    # ─── Social login ────────────────────────────────────────────────────────────

    @eu-social @skip
    Scenario: EU005 - Login with Google logs into the end user
      When I click the end user profile button
      And I log in with Google in the end user
      Then I should be logged in to the end user

    @eu-social @skip
    Scenario: EU006 - Login with X via Google logs into the end user
      When I click the end user profile button
      And I log in with X in the end user
      Then I should be logged in to the end user

    @eu-social @skip
    Scenario: EU007 - Login with Facebook logs into the end user
      When I click the end user profile button
      And I log in with Facebook in the end user
      Then I should be logged in to the end user

    # ─── User Profile Management ─────────────────────────────────────────────────

    @eu-profile
    Scenario: EU011 - Log out via the profile menu ends the user session
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click Log Out from the profile menu
      Then I should be logged out of the end user

    @eu-profile
    Scenario: EU012 - Editing Display Name and Bio in the profile form persists changes
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click My Profile
      And I click Edit Profile
      And I update the display name to "QA Test User"
      And I update the bio to "Automated test bio for QA validation."
      And I save the profile
      Then the display name "QA Test User" should appear in the profile

    @eu-profile
    Scenario: EU013 - Bio field enforces the 150 character limit
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click My Profile
      And I click Edit Profile
      And I fill the bio with 160 characters
      Then the bio value should not exceed 150 characters

    @eu-profile
    Scenario: EU014 - Share Profile button copies the user profile URL to clipboard
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click My Profile
      And I click the Share Profile button
      Then a copied notification should appear

    @eu-profile
    Scenario: EU015 - Create AI Avatar link carries the correct UTM tracking parameters
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click My Profile
      Then the Create AI Avatar link should have the correct UTM parameters

    @eu-profile
    Scenario: EU016 - Change Password form is accessible from the Settings tab
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click My Profile
      And I click Edit Profile
      And I select the "Settings" tab
      Then the Change Password option should be visible
      When I click Change Password
      Then the change password form should appear

  # ─── Modern EU ────────────────────────────────────────────────────────────────

  Rule: Modern EU

    Background:
      Given I am on the modern end user page

    # ─── Entry points ───────────────────────────────────────────────────────────

    @eu-auth @eu-modern-auth
    Scenario: EU001M - Auth modal opens from multiple entry points with all login options (Modern)
      When I click the end user profile button
      Then the auth modal should be visible
      And the auth modal should show Google, Facebook, X, and Email options
      When I reload the modern end user page
      And I open the text chat
      And I click the profile icon inside the chat
      Then the auth modal should be visible

    # ─── Email signup ────────────────────────────────────────────────────────────

    @eu-signup @eu-modern-signup
    Scenario: EU002M - Complete email signup with display name creates a new account (Modern)
      When I click the end user profile button
      And I select email signup
      And I fill in the signup form with a new user
      And I click Create Account
      And I fill in the display name
      And I click Save
      Then I should be logged in to the end user

    @eu-signup @eu-modern-signup
    Scenario: EU003M - Password visibility toggles work on both password fields (Modern)
      When I click the end user profile button
      And I select email signup
      Then the password field should be hidden
      When I click the password toggle
      Then the password field should be visible
      When I click the password toggle again
      Then the password field should be hidden
      And the confirm password field should be hidden
      When I click the confirm password toggle
      Then the confirm password field should be visible

    # ─── Email sign in ───────────────────────────────────────────────────────────

    @eu-signin @eu-modern-signin
    Scenario: EU004M - Signing in with valid email credentials logs the user in (Modern)
      When I click the end user profile button
      And I select email signup
      And I click the sign in link
      And I fill in the signin email with "yuri+qa@arena.im"
      And I fill in the signin password with "Teste@123"
      And I click Sign In
      And I fill in the display name
      And I click Save
      Then I should be logged in to the end user

    # ─── User Profile Management ─────────────────────────────────────────────────

    @eu-profile @eu-modern-profile
    Scenario: EU011M - Log out via the profile menu ends the user session (Modern)
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click Log Out from the profile menu
      Then I should be logged out of the end user

    @eu-profile @eu-modern-profile
    Scenario: EU012M - Editing Display Name and Bio in Modern EU persists changes
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click View Profile
      And I select the "Profile" tab
      And I click Edit Profile
      And I update the display name to "QA Modern Test"
      And I update the bio to "Modern EU automated test bio update."
      And I save the profile
      Then the display name "QA Modern Test" should appear in the profile

    @eu-profile @eu-modern-profile
    Scenario: EU013M - Bio field enforces the 150 character limit in Modern EU
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click View Profile
      And I select the "Profile" tab
      And I click Edit Profile
      And I fill the bio with 160 characters
      Then the bio value should not exceed 150 characters

    @eu-profile @eu-modern-profile
    Scenario: EU016M - Change Password form is accessible from the Settings tab in Modern EU
      When I sign in to the end user as "yuri+qa@arena.im" with password "Teste@123"
      And I open the profile menu
      And I click View Profile
      And I select the "Settings" tab
      Then the Change Password option should be visible
      When I click Change Password
      Then the change password form should appear
