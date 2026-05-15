@login
Feature: CAT03 - User Login

  Scenario: LN001 - Next page loads within 5 seconds after successful login
    Given I am on the login page
    When I fill in the login form with valid credentials
    And I click the login button
    Then the next page should load within 5 seconds

  Scenario: LN002 - Login button is disabled when all fields are empty
    Given I am on the login page
    Then the login button should be disabled

  Scenario: LN003 - Successful login with valid credentials
    Given I am on the login page
    When I fill in the login form with valid credentials
    And I click the login button
    Then I should be redirected to the dashboard

  Scenario: LN004 - Login with invalid email format shows email field error
    Given I am on the login page
    When I fill in the login email with "invalidemail"
    And I fill in the login password with "Test@12345"
    Then I should see an error on the login email field

  Scenario: LN005 - Toggle login password visibility
    Given I am on the login page
    When I fill in the login password with "MyPassword@123"
    And I click the login password toggle
    Then the login password should be visible
    When I click the login password toggle again
    Then the login password should be hidden

  Scenario: LN006 - Navigate to sign up page
    Given I am on the login page
    When I click the sign up link
    Then I should be redirected to the sign up page

  Scenario: LN007 - Forgot password link opens reset modal
    Given I am on the login page
    When I click the forgot password link
    Then the password reset modal should be visible

  Scenario: LN008 - Valid email in reset form sends password reset link
    Given the password reset modal is open
    When I enter a valid email in the reset form
    And I submit the password reset request
    Then I should see a password reset confirmation message

  Scenario: LN009 - Password reset modal can be closed
    Given the password reset modal is open
    When I close the password reset modal
    Then the password reset modal should not be visible

  @ln-google
  Scenario: LN010 - Login with Google redirects to the dashboard
    Given I am on the login page
    When I log in with Google
    Then I should be redirected to the dashboard
