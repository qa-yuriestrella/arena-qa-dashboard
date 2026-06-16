# @onboarding
# Feature: CAT02 - Onboarding Flow

#   Background:
#     Given I sign up as a new user

#   # ─── Step 1: Slug ────────────────────────────────────────────────────────────

#   @onboarding-slug
#   Scenario: OB001 - Slug validation: format errors, already taken, and valid slug advances
#     Given I am on the slug selection step
#     When I enter the slug "ab"
#     And I try to proceed
#     Then I should see a slug error "Slug must be at least 3 characters"
#     When I enter the slug "this-slug-is-way-too-long"
#     And I try to proceed
#     Then I should see a slug error "Slug must be at most 20 characters"
#     When I enter the slug "invalid slug!"
#     And I try to proceed
#     Then I should see a slug error "Slug may only contain letters, numbers, and hyphens"
#     When I enter a slug that is already in use
#     And I try to proceed
#     Then I should see a slug error indicating it is already taken
#     When I enter a valid unique slug
#     And I try to proceed
#     Then I should advance to the next onboarding step

#   # ─── Step 2: Data usage permission ───────────────────────────────────────────

#   @onboarding-permissions
#   Scenario: OB002 - Data usage permission: toggle can be switched on and off; proceeding without change advances
#     Given I am on the data usage permission step
#     When I toggle the data usage permission on
#     And I toggle the data usage permission off
#     Then the toggle should reflect the off state
#     When I proceed without changing the permission toggle
#     Then I should advance to the next onboarding step

#   # ─── Step 3: Title, Headline and Language ────────────────────────────────────

#   @onboarding-profile
#   Scenario: OB003 - Profile info: title pre-filled, headline capped at 160 chars, all languages selectable
#     Given I am on the profile info step
#     Then the title field should be pre-filled with the sign up name
#     When I type a headline with 161 characters
#     Then the headline field should contain at most 160 characters
#     And I can select all available languages successfully

#   # ─── Step 4: Social Accounts ─────────────────────────────────────────────────

#   @onboarding-social
#   Scenario: OB004 - User can add all social accounts and data is submitted correctly
#     Given I am on the social accounts step
#     When I add all social accounts
#     Then the social links should be submitted with correct normalized values

#   @onboarding-social
#   Scenario: OB005 - Profile image is pulled from the highest priority social account
#     Given I am on the social accounts step
#     When I add an Instagram account and a Youtube account
#     And I proceed to the next step
#     Then the profile image should be sourced from Youtube

#   @onboarding-social
#   Scenario: OB006 - X takes priority over Instagram when Youtube is absent
#     Given I am on the social accounts step
#     When I add an X account and an Instagram account
#     And I proceed to the next step
#     Then the profile image should be sourced from "X"

#   # ─── Step 5: Payment ─────────────────────────────────────────────────────────

#   @onboarding-payment
#   Scenario: OB007 - Payment form enables Start Trial; completing payment advances to the next step
#     Given I am on the payment step
#     Then the start trial button should be disabled
#     When I fill in the payment form with valid test card data
#     Then the start trial button should be enabled
#     When I click start trial
#     Then I should advance to the next onboarding step

#   @onboarding-payment
#   Scenario: OB008 - Coupon validation shows error for invalid code and discount for valid code
#     Given I am on the payment step with the "Starter" plan selected
#     When I apply the coupon code "INVALIDCODE"
#     Then I should see a coupon error message
#     When I apply the coupon code "30PROYEAR"
#     Then I should see a coupon error message
#     When I apply the coupon code "starter10"
#     Then I should see a "10%" discount applied
#     Then I can proceed with the discounted price

#   @onboarding-payment
#   Scenario: OB009 - Billing toggle changes price; plan selector shows current plan disabled and allows switching
#     Given I am on the payment step
#     When I toggle to yearly billing
#     Then the price should reflect a 20% discount
#     When I toggle back to monthly billing
#     Then the price should show the original monthly value
#     When I open the plan selector
#     Then the choose plan button should be disabled for "Starter"
#     When I open the plan selector and choose "Professional"
#     And I confirm the plan selection
#     Then the "Professional" plan should be active

#   # ─── Step 6: Avatar ──────────────────────────────────────────────────────────

#   @onboarding-avatar
#   Scenario: OB010 - Profile image from social account is shown on avatar step
#     Given I completed the social accounts step with an Instagram account
#     When I reach the avatar step
#     Then the avatar should display the profile image from Instagram

#   @onboarding-avatar
#   Scenario: OB011 - No profile image is shown when no social accounts were added
#     Given I completed the social accounts step without adding any account
#     When I reach the avatar step
#     Then the avatar should not display any profile image

#   @onboarding-avatar
#   Scenario: OB012 - User can upload a custom avatar image and change the avatar color
#     Given I am on the avatar step
#     When I upload a custom image from my machine
#     Then the avatar should display the uploaded image
#     When I click the avatar color button
#     Then the avatar color should change

#   # ─── Step 7: Complete flow ────────────────────────────────────────────────────

#   @onboarding-complete
#   Scenario: OB013 - Completing onboarding fires the animated image request and the headshot completes in the gallery
#     Given I am on the avatar step
#     When I upload a custom image from my machine
#     And I finish the onboarding
#     Then the animated profile image request should be fired
#     And I should see the avatar animating toast
#     And I should be on the knowledge base page
#     When I navigate to the headshot gallery
#     Then the animated headshot from onboarding should complete and appear in the gallery
