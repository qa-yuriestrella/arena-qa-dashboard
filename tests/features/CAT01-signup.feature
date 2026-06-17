@signup
Feature: CAT01 - User Sign Up

  Scenario: CT001 - Next page loads within 7 seconds after successful sign up
    Given I am on the sign up page
    When I fill in the sign up form with valid data
    And I click the sign up button
    Then the onboarding page should load within 7 seconds

  Scenario: CT002 - Successful sign up with valid data
    Given I am on the sign up page
    When I fill in the sign up form with valid data
    And I click the sign up button
    Then I should be redirected to onboarding

  Scenario: CT003 - Sign up button is disabled when all fields are empty
    Given I am on the sign up page
    Then the sign up button should be disabled

  Scenario: CT004 - Sign up with invalid name shows name field error
    Given I am on the sign up page
    When I fill in the "name" field with "a"
    And I fill in the "email" field with "valid@email.com"
    And I fill in the "password" field with "Test@12345"
    Then the sign up button should be disabled
    And I should see an error on the name field

  Scenario: CT005 - Sign up with invalid email shows email field error
    Given I am on the sign up page
    When I fill in the "name" field with "Test User"
    And I fill in the "email" field with "invalidemail"
    And I fill in the "password" field with "Test@12345"
    Then the sign up button should be disabled
    And I should see an error on the email field

  Scenario: CT006 - Sign up with invalid password shows password field error
    Given I am on the sign up page
    When I fill in the "name" field with "Test User"
    And I fill in the "email" field with "invalidemail"
    And I fill in the "password" field with "Test1"
    Then the sign up button should be disabled
    And I should see an error on the password field

  Scenario: CT007 - Toggle password visibility
    Given I am on the sign up page
    When I fill in the password field with "MyPassword@123"
    And I click the toggle password button
    Then the password field should show plain text
    When I click the toggle password button again
    Then the password field should hide the text

  Scenario: CT008 - Navigate to sign in page
    Given I am on the sign up page
    When I click the "Sign in now" link
    Then I should be redirected to the sign in page
