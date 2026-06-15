const { createBdd } = require('playwright-bdd');
const { test } = require('../fixtures');

const { Given, When, Then, After } = createBdd(test);

// ─── Cleanup ─────────────────────────────────────────────────────────────────
// Classic EU: deletes all "E2E*" sections from the primary avatar.
// Modern EU: deletes all "E2E*" sections from the modern avatar.

After({ tags: '@eupsn-styles or @eupsn-carousel' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSections().catch(() => {});
  await profileBuilderPage.deleteAllTestSections('^E2E').catch(() => {});
});

After({ tags: '@eudps-purchase or @eudps-download' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSections().catch(() => {});
  await profileBuilderPage.deleteAllTestSections('^E2E').catch(() => {});
});

After({ tags: '@eu-modern-sections' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSectionsModern().catch(() => {});
  await profileBuilderPage.deleteAllTestSections('^E2E').catch(() => {});
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

Given('a URL Media section titled {string} with the following links has been saved in the dashboard:',
  async ({ profileBuilderPage }, title, table) => {
    const urls = table.raw().map(([url]) => url);
    await profileBuilderPage.createAndSaveURLMediaSectionWithLinks(title, urls);
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

// ─── When – section style ─────────────────────────────────────────────────────

When('the section {string} is styled as {string} in the dashboard',
  async ({ profileBuilderPage }, sectionTitle, styleSpec) => {
    // styleSpec: "TopStyle / Layout" (2 parts) or "TopStyle / Display / Layout" (3 parts)
    const parts = styleSpec.split('/').map(s => s.trim());
    const [topStyle, second, third] = parts;
    // For Button: "Button / Stack" → topStyle=Button, display=null, layout=Stack
    // For Card:   "Card / Square / Carousel" → topStyle=Card, display=Square, layout=Carousel
    const display = third ? second : null;
    const layout = third || second || null;
    await profileBuilderPage.setURLMediaSectionStyle(sectionTitle, topStyle, display, layout);
  }
);

// ─── Then – URL Media section on EU ──────────────────────────────────────────

Then('the section {string} should be visible on the end user page', async ({ endUserPage }, title) => {
  await endUserPage.sectionShouldBeVisibleOnEU(title);
});

Then('the section {string} should have at least {int} link cards', async ({ endUserPage }, sectionTitle, n) => {
  await endUserPage.sectionShouldHaveAtLeastNLinkCards(sectionTitle, n);
});

When('I click the first link card in section {string}', async ({ endUserPage }, sectionTitle) => {
  await endUserPage.clickFirstLinkCardInSection(sectionTitle);
});

Then('a new tab should open with a URL matching {string}', async ({ endUserPage }, urlPattern) => {
  await endUserPage.newTabShouldHaveURL(urlPattern);
});

Then('the carousel in section {string} should scroll through all {int} links', async ({ endUserPage }, sectionTitle, count) => {
  await endUserPage.carouselInSectionShouldCoverAllLinks(sectionTitle, count);
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

// ─── Modern EU ────────────────────────────────────────────────────────────────

After({ tags: '@eu-modern-sections' }, async ({ profileBuilderPage }) => {
  await profileBuilderPage.visitSectionsModern().catch(() => {});
  await profileBuilderPage.deleteAllTestSections('^E2E').catch(() => {});
});

// ─── Given – Modern EU section setup in dashboard ────────────────────────────

Given('a URL Media section titled {string} with the following links has been saved in the modern avatar dashboard:',
  async ({ profileBuilderPage }, title, table) => {
    const urls = table.raw().map(([url]) => url);
    await profileBuilderPage.createAndSaveURLMediaSectionWithLinks(title, urls, null, { modern: true });
  }
);

Given('a Digital Product section titled {string} has been saved in the modern avatar dashboard',
  async ({ profileBuilderPage }, title) => {
    await profileBuilderPage.createAndSaveDigitalProductSection({
      title,
      price: '9.99',
      slug: 'e2e-test-product-m',
      landingTitle: `${title} - Landing Page`,
      description: 'This is an automated E2E test product for section validation.',
      ctaText: 'Buy Now!',
      productURL: 'https://myavatar.ai/',
    }, { modern: true });
  }
);

Given('a Digital Product section with file delivery titled {string} has been saved in the modern avatar dashboard',
  async ({ profileBuilderPage }, title) => {
    await profileBuilderPage.createAndSaveDigitalProductSection({
      title,
      price: '4.99',
      slug: 'e2e-file-product-m',
      landingTitle: `${title} - Landing Page`,
      description: 'This is an automated E2E test product for file download validation.',
      ctaText: 'Buy Now!',
      useFileDelivery: true,
    }, { modern: true });
  }
);

// ─── When – Modern EU section style ──────────────────────────────────────────

When('the section {string} is styled as {string} in the modern avatar dashboard',
  async ({ profileBuilderPage }, sectionTitle, styleSpec) => {
    const parts = styleSpec.split('/').map(s => s.trim());
    const [topStyle, second, third] = parts;
    const display = third ? second : null;
    const layout = third || second || null;
    await profileBuilderPage.setURLMediaSectionStyle(sectionTitle, topStyle, display, layout, { modern: true });
  }
);

// ─── When – Modern EU navigation ─────────────────────────────────────────────

When('I navigate to the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.visit();
});

When('I navigate to the modern end user page as an unauthenticated user', async ({ endUserModernPage }) => {
  await endUserModernPage.visit();
});

// ─── Then – URL Media section on Modern EU ────────────────────────────────────

Then('the section {string} should be visible on the modern end user page', async ({ endUserModernPage }, title) => {
  await endUserModernPage.sectionShouldBeVisibleOnEU(title);
});

Then('the section {string} should have at least {int} link cards on the modern end user page',
  async ({ endUserModernPage }, sectionTitle, n) => {
    await endUserModernPage.sectionShouldHaveAtLeastNLinkCards(sectionTitle, n);
  }
);

When('I click the first link card in section {string} on the modern end user page',
  async ({ endUserModernPage }, sectionTitle) => {
    await endUserModernPage.clickFirstLinkCardInSection(sectionTitle);
  }
);

Then('the carousel in section {string} should scroll through all {int} links on the modern end user page',
  async ({ endUserModernPage }, sectionTitle, count) => {
    await endUserModernPage.carouselInSectionShouldCoverAllLinks(sectionTitle, count);
  }
);

Then('the first card in section {string} should have a landscape aspect ratio on the modern end user page',
  async ({ endUserModernPage }, sectionTitle) => {
    await endUserModernPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'landscape');
  }
);

Then('the first card in section {string} should have a square aspect ratio on the modern end user page',
  async ({ endUserModernPage }, sectionTitle) => {
    await endUserModernPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'square');
  }
);

Then('the first card in section {string} should have a portrait aspect ratio on the modern end user page',
  async ({ endUserModernPage }, sectionTitle) => {
    await endUserModernPage.firstCardInSectionShouldHaveAspectRatio(sectionTitle, 'portrait');
  }
);

// ─── Then – Digital Product card on Modern EU ─────────────────────────────────

Then('the product card for {string} should be visible on the modern end user page',
  async ({ endUserModernPage }, title) => {
    await endUserModernPage.productCardShouldBeVisible(title);
  }
);

Then('the product card should show the CTA button on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.productCardShouldShowCTAButton();
});

When('I click the product card for {string} on the modern end user page', async ({ endUserModernPage }, title) => {
  await endUserModernPage.clickProductCard(title);
});

// ─── Then – Landing page on Modern EU ────────────────────────────────────────

Then('the product landing page should be visible on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.productLandingPageShouldBeVisible();
});

Then('the landing page should show the product description on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.landingPageShouldHaveDescription();
});

Then('the landing page should show the CTA button on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.landingPageShouldHaveCTAButton();
});

When('I click the landing page CTA button on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.clickLandingPageCTAButton();
});

// ─── Then – After purchase, Modern EU card state ──────────────────────────────

Then('I should be on the modern end user page', async ({ endUserModernPage }) => {
  await endUserModernPage.shouldBeOnEUPage();
});

Then('the product card for {string} should show {string} instead of the CTA button on the modern end user page',
  async ({ endUserModernPage }, title, buttonText) => {
    await endUserModernPage.productCardShouldShowText(title, buttonText);
  }
);

When('I click {string} on the product card for {string} on the modern end user page',
  async ({ endUserModernPage }, buttonText, title) => {
    await endUserModernPage.clickButtonOnProductCard(title, buttonText);
  }
);
