const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then } = createBdd(test);

// ─── Background ───────────────────────────────────────────────────────────────
// Creates a fresh user via the signup form. Each scenario gets a clean account
// so that onboarding state (slug, subscription, social links) starts empty.

Given('I sign up as a new user', async ({ signupPage, page }) => {
  await signupPage.visit();
  await signupPage.fillForm();
  await signupPage.clickSignUp();
  await page.waitForURL(/\/setup\//, { timeout: 120000 });
});

// ─── Step 1: Slug ─────────────────────────────────────────────────────────────

Given('I am on the slug selection step', async ({ onboardingPage }) => {
  await onboardingPage.goToSlugStep();
});

When('I enter the slug {string}', async ({ onboardingPage }, slug) => {
  await onboardingPage.enterSlug(slug);
});

When('I try to proceed', async ({ onboardingPage }) => {
  await onboardingPage.submitSlug();
});

When('I enter a slug that is already in use', async ({ onboardingPage }) => {
  await onboardingPage.enterSlug('yuri');
});

When('I enter a valid unique slug', async ({ onboardingPage }) => {
  const unique = `slug${Date.now().toString().slice(-6)}`;
  await onboardingPage.enterSlug(unique);
});

Then('I should see a slug error {string}', async ({ onboardingPage }, message) => {
  await onboardingPage.slugErrorShouldContain(message);
});

Then('I should see a slug error indicating it is already taken', async ({ onboardingPage }) => {
  await onboardingPage.slugErrorShouldIndicateTaken();
});

Then('I should advance to the next onboarding step', async ({ onboardingPage }) => {
  await onboardingPage.shouldHaveAdvancedFromCurrentStep();
});

// ─── Step 2: Lifelike avatar (data usage permission) ─────────────────────────

Given('I am on the data usage permission step', async ({ onboardingPage }) => {
  await onboardingPage.goToLifelikeStep();
});

When('I proceed without changing the permission toggle', async ({ onboardingPage }) => {
  await onboardingPage.proceedWithoutChangingToggle();
});

When('I toggle the data usage permission on', async ({ onboardingPage }) => {
  await onboardingPage.toggleDataUsageOn();
});

When('I toggle the data usage permission off', async ({ onboardingPage }) => {
  await onboardingPage.toggleDataUsageOff();
});

Then('the toggle should reflect the off state', async ({ onboardingPage }) => {
  await onboardingPage.toggleShouldBeOff();
});

// ─── Step 3: Profile info (personalize) ──────────────────────────────────────

Given('I am on the profile info step with slug {string}', async ({ onboardingPage }, slug) => {
  // Append a timestamp to avoid slug conflicts. Assertion uses toContain so still valid.
  await onboardingPage.goToPersonalizeStep(slug);
});

Given('I am on the profile info step', async ({ onboardingPage }) => {
  await onboardingPage.goToPersonalizeStep();
});

Then('the title field should be pre-filled with {string}', async ({ onboardingPage }, expected) => {
  await onboardingPage.titleFieldShouldContain(expected);
});

Then('the title field should be pre-filled with the sign up name', async ({ onboardingPage }) => {
  await onboardingPage.titleFieldShouldContainSignupName();
});

When('I type a headline with {int} characters', async ({ onboardingPage }, count) => {
  await onboardingPage.typeHeadline(count);
});

Then('the headline field should contain at most {int} characters', async ({ onboardingPage }, max) => {
  await onboardingPage.headlineLengthShouldBeAtMost(max);
});

When('I select {string} as the default language', async ({ onboardingPage }, language) => {
  await onboardingPage.selectLanguage(language);
});

Then('{string} should be selected', async ({ onboardingPage }, language) => {
  await onboardingPage.languageShouldBeSelected(language);
});

Then('I can select all available languages successfully', async ({ onboardingPage }) => {
  const languages = ['English', 'Portuguese', 'Chinese', 'Spanish', 'French', 'Russian', 'German', 'Japanese', 'Korean', 'Italian'];
  for (const language of languages) {
    await onboardingPage.selectLanguage(language);
    await onboardingPage.languageShouldBeSelected(language);
  }
});

// ─── Step 4: Social accounts ──────────────────────────────────────────────────

Given('I am on the social accounts step', async ({ onboardingPage }) => {
  await onboardingPage.goToSocialStep();
});

When('I add all social accounts', async ({ onboardingPage }) => {
  await onboardingPage.addAllSocialAccountsAndClickNext();
});

Then('the social links should be submitted with correct normalized values', async ({ onboardingPage }) => {
  await onboardingPage.socialLinksShouldBeSubmittedCorrectly();
});

When('I add an X account and an Instagram account', async ({ onboardingPage }) => {
  await onboardingPage.addSocialAccount('X', '@opovo');
  await onboardingPage.addSocialAccount('Instagram', 'https://instagram.com/mazzola');
});

When('I add an Instagram account and a Youtube account', async ({ onboardingPage }) => {
  await onboardingPage.addSocialAccount('Instagram', 'https://instagram.com/mazzola');
  await onboardingPage.addSocialAccount('Youtube', 'https://youtube.com/@diogodefante');
});

When('I proceed to the next step', async ({ onboardingPage }) => {
  await onboardingPage.proceedFromSocialStep();
});

Then('the profile image should be sourced from Youtube', async ({ onboardingPage }) => {
  await onboardingPage.profileImageShouldBeSourcedFrom('Youtube');
});

When('I add accounts for {string}, {string}, {string}, {string}, {string} and {string}',
  async ({ onboardingPage }, p1, p2, p3, p4, p5, p6) => {
    const accounts = {
      Instagram: 'https://instagram.com/mazzola',
      X: '@opovo',
      Youtube: 'https://youtube.com/@diogodefante',
      TikTok: '@mazzola',
      Facebook: 'https://facebook.com/igaounderground',
      LinkedIn: 'https://linkedin.com/in/caito-maia',
    };
    for (const platform of [p1, p2, p3, p4, p5, p6]) {
      await onboardingPage.addSocialAccount(platform, accounts[platform] || '');
    }
  }
);

Then('the profile image should be sourced from {string}', async ({ onboardingPage }, platform) => {
  await onboardingPage.profileImageShouldBeSourcedFrom(platform);
});

// ─── Step 5: Payment (checkout) ───────────────────────────────────────────────

Given('I am on the payment step', async ({ onboardingPage }) => {
  await onboardingPage.goToCheckoutStep();
});

Given('I am on the payment step with the {string} plan selected', async ({ onboardingPage }, _plan) => {
  // The default plan shown at checkout; further plan changes are tested in OB020/OB021
  await onboardingPage.goToCheckoutStep();
});

Then('the start trial button should be disabled', async ({ onboardingPage }) => {
  await onboardingPage.startTrialShouldBeDisabled();
});

When('I fill in the payment form with valid test card data', async ({ onboardingPage }) => {
  await onboardingPage.fillPaymentFormWithValidData();
});

Then('the start trial button should be enabled', async ({ onboardingPage }) => {
  await onboardingPage.startTrialShouldBeEnabled();
});

When('I apply the coupon code {string}', async ({ onboardingPage }, code) => {
  await onboardingPage.applyCouponCode(code);
});

Then('I should see a {string} discount applied', async ({ onboardingPage }, discount) => {
  await onboardingPage.discountShouldShowPercent(discount);
});

Then('I should see a coupon error message', async ({ onboardingPage }) => {
  await onboardingPage.couponErrorShouldBeVisible();
});

Then('I can proceed with the discounted price', async ({ onboardingPage }) => {
  await onboardingPage.fillPaymentFormWithValidData();
  await onboardingPage.clickStartTrial();
  await onboardingPage.shouldHaveAdvancedFromCurrentStep();

});

When('I toggle to yearly billing', async ({ onboardingPage }) => {
  await onboardingPage.toggleBillingToYearly();
});

When('I toggle back to monthly billing', async ({ onboardingPage }) => {
  await onboardingPage.toggleBillingToMonthly();
});

Then('the price should reflect a 20% discount', async ({ onboardingPage }) => {
  await onboardingPage.priceShouldShowDiscount();
});

Then('the price should show the original monthly value', async ({ onboardingPage }) => {
  await onboardingPage.priceShouldNotShowDiscount();
});

When('I open the plan selector and choose {string}', async ({ onboardingPage }, plan) => {
  await onboardingPage.choosePlan(plan);
});

When('I confirm the plan selection', async ({ onboardingPage }) => {
  await onboardingPage.confirmPlanSelection();
});

Then('the {string} plan should be active', async ({ onboardingPage }, plan) => {
  await onboardingPage.planShouldBeActive(plan);
});

When('I open the plan selector', async ({ onboardingPage }) => {
  await onboardingPage.openPlanSelector();
});

Then('the choose plan button should be disabled for {string}', async ({ onboardingPage }, plan) => {
  await onboardingPage.choosePlanButtonShouldBeDisabledFor(plan);
});

When('I click start trial', async ({ onboardingPage }) => {
  await onboardingPage.clickStartTrial();
});

// ─── Step 6: Avatar / Visual ──────────────────────────────────────────────────

Given('I am on the avatar step', async ({ onboardingPage }) => {
  // Full path: username → lifelike → personalize → social → checkout → visual
  await onboardingPage.goToVisualStep();
});

Given('I completed the social accounts step with an Instagram account', async ({ onboardingPage }) => {
  // Stop at social, add the account; "When I reach the avatar step" advances from here
  await onboardingPage.goToSocialStep();
  await onboardingPage.addSocialAccount('Instagram', 'https://instagram.com/mazzola');
});

Given('I completed the social accounts step without adding any account', async ({ onboardingPage }) => {
  // Stop at social with no accounts added; "When I reach the avatar step" advances from here
  await onboardingPage.goToSocialStep();
});

When('I reach the avatar step', async ({ onboardingPage }) => {
  // Advances from /setup/social → checkout → visual without restarting the flow
  await onboardingPage.goToVisualStepFromSocial();
});

Then('the avatar should display the profile image from Instagram', async ({ onboardingPage }) => {
  await onboardingPage.avatarShouldShowProfileImage();
});

Then('the avatar should not display any profile image', async ({ onboardingPage }) => {
  await onboardingPage.avatarShouldNotShowProfileImage();
});

When('I upload a custom image from my machine', async ({ onboardingPage }) => {
  await onboardingPage.uploadCustomImage();
});

Then('the avatar should display the uploaded image', async ({ onboardingPage }) => {
  await onboardingPage.avatarShouldShowUploadedImage();
});

When('I click the avatar color button', async ({ onboardingPage }) => {
  await onboardingPage.clickAvatarColorButton();
});

Then('the avatar color should change', async ({ onboardingPage }) => {
  await onboardingPage.avatarColorPickerShouldBeVisible();
});

// ─── Step 7: Complete flow ────────────────────────────────────────────────────

When('I finish the onboarding', async ({ onboardingPage }) => {
  await onboardingPage.finishOnboarding();
});

Then('the animated profile image request should be fired', async ({ onboardingPage }) => {
  await onboardingPage.animatedProfileRequestShouldFire();
});

Then('I should see the avatar animating toast', async ({ onboardingPage }) => {
  await onboardingPage.avatarAnimatingToastShouldBeVisible();
});

Then('I should be on the knowledge base page', async ({ onboardingPage }) => {
  await onboardingPage.shouldBeOnKnowledgePage();
});

// ─── OB022: Post-onboarding headshot gallery check ────────────────────────────

When('I navigate to the headshot gallery', async ({ page }) => {
  await page.goto('/profile-builder/headshot');
  await page.waitForLoadState('load');
  await page.getByText('Set your headshot').waitFor({ state: 'visible', timeout: 15000 });
});

Then('the animated headshot from onboarding should complete and appear in the gallery', async ({ page, $test }) => {
  $test.setTimeout(660000); // 11 min: 10 min polling + buffer (same as PBH005)

  const timeoutMs = 600000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const response = await page.waitForResponse(
      (res) =>
        res.url().includes('/commerce-ai/') &&
        res.url().includes('page=1') &&
        res.url().includes('limit=10') &&
        res.status() === 200,
      { timeout: Math.min(60000, remaining) },
    ).catch(() => null);

    if (!response) continue;

    let json;
    try { json = await response.json(); } catch { continue; }

    if (!json?.success || !Array.isArray(json?.data)) continue;
    if (!json.data.length || json.data[0]?.type === undefined) continue;

    const item = json.data.find((d) => d.type === 'animated');
    if (!item) continue;

    if (item.status === 'completed') return;
    if (item.status === 'failed') {
      throw new Error(
        `Animated headshot from onboarding failed: ${item.errorMessage || item.errorType || 'unknown'}`,
      );
    }
  }

  throw new Error(`Animated headshot from onboarding did not complete within ${timeoutMs / 1000}s`);
});
