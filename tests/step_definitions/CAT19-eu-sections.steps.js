const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then, After } = createBdd(test);

// ─── Section setup helpers ────────────────────────────────────────────────────

After({ tags: '@eupsn-visible or @eupsn-stack or @eupsn-link or @eupsn-horizontal or @eupsn-square or @eupsn-edit' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSections().catch(() => {});
  for (const name of [
    'E2E EU URL Section', 'E2E Stack Section', 'E2E Link Section',
    'E2E Horizontal Section', 'E2E Square Section',
    'E2E Edit Section', 'E2E Edited Section',
  ]) {
    await profileBuilderPage.deleteAllTestSections(name).catch(() => {});
  }
});

After({ tags: '@eudps-visible or @eudps-landing or @eudps-purchase or @eudps-download' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSections().catch(() => {});
  await profileBuilderPage.deleteAllTestSections('E2E Test Product').catch(() => {});
  await profileBuilderPage.deleteAllTestSections('E2E File Product').catch(() => {});
});

// ─── Given – section setup in dashboard ──────────────────────────────────────

Given('a URL Media section titled {string} with link {string} has been saved in the dashboard',
  async ({ profileBuilderPage }, title, url) => {
    await profileBuilderPage.createAndSaveURLMediaSection(title, url);
  }
);

Given('a URL Media section in {string} style titled {string} with link {string} has been saved in the dashboard',
  async ({ profileBuilderPage }, style, title, url) => {
    await profileBuilderPage.createAndSaveURLMediaSection(title, url, null, style);
  }
);

Given('a URL Media section in {string} style titled {string} with links {string} and {string} has been saved in the dashboard',
  async ({ profileBuilderPage }, style, title, url1, url2) => {
    await profileBuilderPage.createAndSaveURLMediaSection(title, url1, url2, style);
  }
);

Given('a Digital Product section titled {string} has been saved in the dashboard',
  async ({ profileBuilderPage }, title) => {
    await profileBuilderPage.createAndSaveDigitalProductSection({
      title,
      price: '9.99',
      slug: 'e2e-test-product',
      landingTitle: `${title} - Landing Page`,
      description: 'This is an automated E2E test product for section validation.',
      ctaText: 'Buy Now!',
      productURL: 'https://myavatar.ai/',
    });
  }
);

Given('a Digital Product section with file delivery titled {string} has been saved in the dashboard',
  async ({ profileBuilderPage }, title) => {
    await profileBuilderPage.createAndSaveDigitalProductSection({
      title,
      price: '4.99',
      slug: 'e2e-file-product',
      landingTitle: `${title} - Landing Page`,
      description: 'This is an automated E2E test product for file download validation.',
      ctaText: 'Buy Now!',
      useFileDelivery: true,
    });
  }
);

// ─── When – navigation ────────────────────────────────────────────────────────

When('I navigate to the end user page', async ({ endUserPage }) => {
  await endUserPage.visit();
});

When('I navigate to the end user page as an unauthenticated user', async ({ endUserPage }) => {
  await endUserPage.visit();
});

// ─── When – section editing ───────────────────────────────────────────────────

When('the section {string} is edited with title {string} in the dashboard',
  async ({ profileBuilderPage }, currentTitle, newTitle) => {
    await profileBuilderPage.editSectionTitle(currentTitle, newTitle);
  }
);

// ─── Then – URL Media section on EU ──────────────────────────────────────────

Then('the section {string} should be visible on the end user page', async ({ endUserPage }, title) => {
  await endUserPage.sectionShouldBeVisibleOnEU(title);
});

Then('at least 2 section link cards should be visible', async ({ endUserPage }) => {
  await endUserPage.atLeastNSectionLinkCardsShouldBeVisible(2);
});

When('I click the first section link card', async ({ endUserPage }) => {
  await endUserPage.clickFirstSectionLinkCard();
});

When('I click the first link card in section {string}', async ({ endUserPage }, sectionTitle) => {
  await endUserPage.clickFirstLinkCardInSection(sectionTitle);
});

Then('a new tab should open with a URL matching {string}', async ({ endUserPage }, urlPattern) => {
  await endUserPage.newTabShouldHaveURL(urlPattern);
});

Then('the first card in section {string} should have a landscape aspect ratio', async ({ endUserPage }, sectionTitle) => {
  await endUserPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'landscape');
});

Then('the first card in section {string} should have a square aspect ratio', async ({ endUserPage }, sectionTitle) => {
  await endUserPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'square');
});

Then('the first card in section {string} should have a portrait aspect ratio', async ({ endUserPage }, sectionTitle) => {
  await endUserPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'portrait');
});

Then('the section should show a carousel', async ({ endUserPage }) => {
  await endUserPage.sectionShouldShowCarousel();
});

// ─── Then – Digital Product card on EU ───────────────────────────────────────

Then('the product card for {string} should be visible on the end user page', async ({ endUserPage }, title) => {
  await endUserPage.productCardShouldBeVisible(title);
});

Then('the product card should show the CTA button', async ({ endUserPage }) => {
  await endUserPage.productCardShouldShowCTAButton();
});

When('I click the product card for {string}', async ({ endUserPage }, title) => {
  await endUserPage.clickProductCard(title);
});

// ─── Then – Landing page ──────────────────────────────────────────────────────

Then('the product landing page should be visible', async ({ endUserPage }) => {
  await endUserPage.productLandingPageShouldBeVisible();
});

Then('the landing page should show the product description', async ({ endUserPage }) => {
  await endUserPage.landingPageShouldHaveDescription();
});

Then('the landing page should show the CTA button', async ({ endUserPage }) => {
  await endUserPage.landingPageShouldHaveCTAButton();
});

When('I click the landing page CTA button', async ({ endUserPage }) => {
  await endUserPage.clickLandingPageCTAButton();
});

// ─── Then – Stripe checkout ───────────────────────────────────────────────────

Then('I should be on the Stripe checkout page', async ({ endUserPage }) => {
  await endUserPage.shouldBeOnStripeCheckout();
});

When('I fill the Stripe card with number {string}, expiry {string}, CVC {string}, and name {string}',
  async ({ endUserPage }, cardNumber, expiry, cvc, name) => {
    await endUserPage.fillStripeCard(cardNumber, expiry, cvc, name);
  }
);

When('I complete the Stripe checkout', async ({ endUserPage }) => {
  await endUserPage.completeStripeCheckout();
});

// ─── Then – Post-purchase page ────────────────────────────────────────────────

Then('the post-purchase page should be visible for {string}', async ({ endUserPage }, productTitle) => {
  await endUserPage.postPurchasePageShouldBeVisible(productTitle);
});

Then('the post-purchase page should have an {string} button', async ({ endUserPage }, buttonText) => {
  await endUserPage.postPurchasePageShouldHaveButton(buttonText);
});

Then('the post-purchase page should have a {string} button', async ({ endUserPage }, buttonText) => {
  await endUserPage.postPurchasePageShouldHaveButton(buttonText);
});

When('I click the {string} button on the post-purchase page', async ({ endUserPage }, buttonText) => {
  await endUserPage.clickPostPurchaseButton(buttonText);
});

// ─── Then – After purchase, EU card state ─────────────────────────────────────

Then('I should be on the end user page', async ({ endUserPage }) => {
  await endUserPage.shouldBeOnEUPage();
});

Then('the product card for {string} should show {string} instead of the CTA button',
  async ({ endUserPage }, title, buttonText) => {
    await endUserPage.productCardShouldShowText(title, buttonText);
  }
);

When('I click {string} on the product card for {string}', async ({ endUserPage }, buttonText, title) => {
  await endUserPage.clickButtonOnProductCard(title, buttonText);
});

Then('the product should be delivered', async ({ endUserPage }) => {
  await endUserPage.productShouldBeDelivered();
});

Then('the product file should be downloaded', async ({ endUserPage }) => {
  await endUserPage.productFileShouldBeDownloaded();
});
