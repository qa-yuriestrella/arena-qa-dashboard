const { expect } = require('@playwright/test');
const path = require('path');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

const TEST_AUDIO_PATH = path.resolve(__dirname, '../fixtures/audios/test-audio-35s.mp3');

const platformNameMap = {
  Youtube: 'YouTube',
  X: 'X (Twitter)',
  Instagram: 'Instagram',
  Facebook: 'Facebook',
  TikTok: 'TikTok',
  URL: 'Website',
  Shopify: 'Shopify',
  Text: 'Text',
  Biography: 'Biography',
  LinkedIn: 'LinkedIn',
  Reddit: 'Reddit',
};

// Maps platform display names to the React Flow node CSS class suffix.
// e.g. Youtube → .react-flow__node-youtube
const nodeTypeMap = {
  Youtube: 'youtube',
  X: 'x',
  Instagram: 'instagram',
  Facebook: 'facebook',
  TikTok: 'tiktok',
  URL: 'website',
  Shopify: 'shopify',
  Text: 'text',
  Biography: 'biography',
  LinkedIn: 'linkedin',
  Reddit: 'reddit',
};

const selectors = {
  btnCancelModal: 'button:has-text("Cancel")',
  btnSaveModal: 'button:text-is("Save")',
  // For filling URL/username fields (URL platforms only)
  modalInput: 'input[placeholder*="username"], input[placeholder*="http"], input[placeholder*="URL"], input[placeholder*="Url"]',
  // For detecting if ANY integration panel is open — includes Text/Biography which use textarea
  modalAny: 'input[placeholder*="username"], input[placeholder*="http"], input[placeholder*="URL"], input[placeholder*="Url"], textarea',
};

class KnowledgeBasePage {
  constructor(page) {
    this.page = page;
    this._completedCountBeforeAction = 0;
    this._currentPlatform = null;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');

    // The admin may redirect to the "Lock in your Identity" setup page for a
    // newly-created avatar. Claim the identity and re-enter the KB.
    const lockItIn = this.page.getByRole('button', { name: 'Lock It In' });
    if (await lockItIn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await lockItIn.click();
      await this.page.waitForLoadState('networkidle', { timeout: 15000 });
      await ensurePrimaryAvatar(this.page);
      await this.page.goto('/knowledge-base');
      await this.page.waitForLoadState('load');
    }

    // Capture the first avatarIntegrations response for post-count assertions in KB007
    this._integrationDataReady = this.page.waitForResponse(
      res => res.request().method() === 'POST' &&
             res.url().includes('graphql') &&
             (res.request().postData() ?? '').includes('avatarIntegrations'),
      { timeout: 30000 }
    ).then(r => r.json()).then(b => b?.data?.avatarIntegrations ?? []).catch(() => []);

    // Wait for the React Flow canvas to render at least the preview node before
    // clicking Fit view — without this the button fires before the canvas initialises.
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 30000 });
    await this.page.getByRole('button', { name: 'Fit view' }).click();
    // Extra wait for content behind the nodes to finish rendering after canvas init
    await this.page.waitForTimeout(2000);

    // Auto-dismiss Avatar Quality panel whenever it appears.
    // On automation2arena it's a fixed-position panel; on automation1arena it's a Radix popover.
    // Case-insensitive match handles both "AVATAR QUALITY" (dom text) and "Avatar Quality" (CSS uppercase).
    await this.page.addLocatorHandler(
      this.page.locator('p, span, div').filter({ hasText: /^avatar quality$/i }),
      async () => {
        // Only dismiss while on the KB admin page.
        if (!this.page.url().includes('/knowledge-base')) return;
        await this.page.evaluate(() => {
          const heading = [...document.querySelectorAll('p, span, div')]
            .find(el => /^avatar quality$/i.test(el.textContent?.trim()));
          if (!heading) return;
          // Walk up to find either a Radix popper wrapper OR the fixed-position panel.
          // Check for Radix wrapper first (automation1arena: Avatar Health popover).
          let el = heading.parentElement;
          while (el && el !== document.body) {
            if (el.hasAttribute('data-radix-popper-content-wrapper')) {
              el.style.display = 'none';
              return;
            }
            el = el.parentElement;
          }
          // Not a Radix popper — find the fixed-position panel (automation2arena).
          let panel = heading.parentElement;
          while (panel && panel !== document.body) {
            if (window.getComputedStyle(panel).position === 'fixed') break;
            panel = panel.parentElement;
          }
          if (!panel || panel === document.body) return;
          const closeBtn = panel.querySelector(
            '[aria-label="Close"], [aria-label="close"], [aria-label="Dismiss"]'
          ) || [...panel.querySelectorAll('button')].find(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            if (label.includes('close') || label.includes('dismiss')) return true;
            const txt = b.textContent?.trim();
            return ['×', '✕', '✖', 'X', 'Close'].includes(txt);
          });
          if (closeBtn) closeBtn.click();
          else panel.style.display = 'none';
        });
        await this.page.waitForTimeout(500);
      }
    );

    await this.page.waitForTimeout(1500);
    await this._dismissOverlays();
  }

  async _dismissOverlays() {
    // Dismiss Avatar Quality panel if present (appears on both automation1arena and automation2arena).
    // Case-insensitive match handles CSS text-transform: uppercase variants.
    // Guard: only dismiss on the KB admin page.
    try {
      if (!this.page.url().includes('/knowledge-base')) return;
      const panelHeading = this.page.locator('p, span, div').filter({ hasText: /^avatar quality$/i });
      if (await panelHeading.count() > 0 && await panelHeading.first().isVisible({ timeout: 500 }).catch(() => false)) {
        await this.page.evaluate(() => {
          const heading = [...document.querySelectorAll('p, span, div')]
            .find(el => /^avatar quality$/i.test(el.textContent?.trim()));
          if (!heading) return;
          // Check for Radix popper wrapper first (automation1arena).
          let el = heading.parentElement;
          while (el && el !== document.body) {
            if (el.hasAttribute('data-radix-popper-content-wrapper')) {
              el.style.display = 'none';
              return;
            }
            el = el.parentElement;
          }
          // Fixed-position panel (automation2arena).
          let panel = heading.parentElement;
          while (panel && panel !== document.body) {
            if (window.getComputedStyle(panel).position === 'fixed') break;
            panel = panel.parentElement;
          }
          if (!panel || panel === document.body) return;
          const closeBtn = panel.querySelector(
            '[aria-label="Close"], [aria-label="close"], [aria-label="Dismiss"]'
          ) || [...panel.querySelectorAll('button')].find(b => {
            const label = (b.getAttribute('aria-label') || '').toLowerCase();
            if (label.includes('close') || label.includes('dismiss')) return true;
            const txt = b.textContent?.trim();
            return ['×', '✕', '✖', 'X', 'Close'].includes(txt);
          });
          if (closeBtn) closeBtn.click();
          else panel.style.display = 'none';
        });
        await this.page.waitForTimeout(400);
      }
    } catch { }

    // Close any open skill drawer (z-50 fixed panel without integration inputs).
    // This can open accidentally if the drag-select in bulkDeleteAllIntegrations lands on a skill node.
    try {
      const drawer = this.page.locator('.fixed.right-0.top-0.z-50');
      if (await drawer.count() > 0 && await drawer.first().isVisible()) {
        const hasIntegrationInput = await drawer.locator(selectors.modalAny).count() > 0;
        if (!hasIntegrationInput) {
          await drawer.locator('button').first().click();
          await this.page.waitForTimeout(300);
        }
      }
    } catch { }
  }

  _resolveLabel(platform) {
    return platformNameMap[platform] || platform;
  }

  async platformButtonShouldBeVisible(platform) {
    const label = this._resolveLabel(platform);
    await expect(this.page.getByRole('button', { name: label })).toBeVisible({ timeout: 10000 });
  }

  async allMainButtonsShouldBeVisible() {
    const platforms = ['Youtube', 'X', 'Instagram', 'Facebook', 'TikTok', 'URL', 'Shopify'];
    for (const platform of platforms) {
      await this.platformButtonShouldBeVisible(platform);
    }
  }

  async allAdditionalButtonsShouldBeVisible() {
    const platforms = ['Text', 'Biography', 'LinkedIn', 'Reddit'];
    for (const platform of platforms) {
      await this.platformButtonShouldBeVisible(platform);
    }
  }

  async openAddMoreMenu() {
    // Text mode: button shows the label "More" (default fresh-session layout)
    const byName = this.page.getByRole('button', { name: 'More' });
    if (await byName.isVisible({ timeout: 4000 }).catch(() => false)) {
      await byName.click();
      return;
    }
    // Icon mode: toolbar collapsed; source-type buttons have no text, aria-label, or title.
    // The "More" button is always the sibling immediately before the "Skills" button in DOM order.
    const clicked = await this.page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('button'));
      const skillsIdx = all.findIndex(b => (b.textContent || '').trim() === 'Skills');
      if (skillsIdx > 0) {
        all[skillsIdx - 1].click();
        return true;
      }
      return false;
    });
    if (!clicked) {
      throw new Error('Could not find "More" button: "Skills" button not found in KB toolbar DOM');
    }
  }

  async clickPlatformButton(platform) {
    this._currentPlatform = platform;
    const label = this._resolveLabel(platform);
    // Dismiss any overlay BEFORE each attempt so the click registers cleanly
    for (let attempt = 0; attempt < 3; attempt++) {
      await this._dismissOverlays();
      await this.page.waitForTimeout(300);
      await this.page.getByRole('button', { name: label }).click();
      try {
        // Confirm the modal opened — modalAny covers URL inputs + textarea (Text/Biography)
        await this.page.locator(selectors.modalAny).first().waitFor({ state: 'visible', timeout: 8000 });
        return;
      } catch {
        if (attempt === 2) throw new Error(`Integration panel for "${platform}" did not open after 3 attempts`);
      }
    }
  }

  async integrationModalShouldBeVisible() {
    await expect(this.page.locator(selectors.modalAny).first()).toBeVisible({ timeout: 5000 });
  }

  async integrationModalShouldBeClosed() {
    await expect(this.page.locator(selectors.modalAny).first()).not.toBeVisible({ timeout: 5000 });
  }

  async pendingCardShouldNotBeVisible() {
    await expect(this._pendingNodeLocator()).not.toBeVisible({ timeout: 5000 });
  }

  async clickCancelInModal() {
    await this.page.locator(selectors.btnCancelModal).click();
  }

  async closeModalWithX() {
    // The X button is the first button in the integration panel (2 ancestors above Cancel)
    await this.page
      .locator('button:has-text("Cancel")')
      .locator('xpath=ancestor::*[2]//button[1]')
      .click();
  }

  async clickOutsideModal() {
    await this.page.mouse.click(10, 10);
  }

  // Returns a locator for the platform-specific React Flow node, e.g. .react-flow__node-youtube
  _pendingNodeLocator() {
    const nodeType = nodeTypeMap[this._currentPlatform] ?? (this._currentPlatform ?? '').toLowerCase();
    return this.page.locator(`.react-flow__node-${nodeType}`).first();
  }

  async _pendingCardShouldBeVisible() {
    await expect(this._pendingNodeLocator()).toBeVisible({ timeout: 8000 });
  }

  // Cycles through every platform button (main + additional), verifies that clicking each
  // one opens the integration modal and creates a visible pending card in the KB graph.
  async everyButtonShouldOpenModalWithPendingCard() {
    // Shopify is excluded: clicking it opens an OAuth redirect in a new tab instead of a modal.
    const mainPlatforms = ['Youtube', 'X', 'Instagram', 'Facebook', 'TikTok', 'URL'];
    const additionalPlatforms = ['Text', 'Biography', 'LinkedIn', 'Reddit'];

    for (const platform of mainPlatforms) {
      await this.clickPlatformButton(platform);
      // Check pending card first — modal open is already confirmed by clickPlatformButton
      await this._pendingCardShouldBeVisible();
      await this.integrationModalShouldBeVisible();
      await this.clickCancelInModal();
      await this.integrationModalShouldBeClosed();
      await this.pendingCardShouldNotBeVisible();
    }

    // Additional platforms require reopening the "More" menu before each click
    for (const platform of additionalPlatforms) {
      await this.openAddMoreMenu();
      await this.clickPlatformButton(platform);
      await this._pendingCardShouldBeVisible();
      await this.integrationModalShouldBeVisible();
      await this.clickCancelInModal();
      await this.integrationModalShouldBeClosed();
      await this.pendingCardShouldNotBeVisible();
    }
  }

  async enterIntegrationUrl(url) {
    await this.page.locator(selectors.modalInput).first().fill(url);
  }

  async _submitIntegrationForPlatform(platform, url) {
    await this.enterIntegrationUrl(url);
    await this.submitIntegration();
  }

  async submitIntegration() {
    // Force-click to bypass disabled state; validation errors surface regardless
    await this.page.locator(selectors.btnSaveModal).click({ force: true });
  }

  // ─── KB004: Invalid URL validation (all platforms, single session) ────────────

  async everyIntegrationShouldRejectInvalidUrl() {
    const INVALID_URL = 'https://not-a-valid-url.com';
    const mainPlatforms = ['Youtube', 'X', 'Instagram', 'Facebook', 'TikTok'];

    for (const platform of mainPlatforms) {
      await this.clickPlatformButton(platform);
      await this.enterIntegrationUrl(INVALID_URL);
      await this.submitIntegration();
      await this.shouldSeeAnyValidationError();
      await this.clickCancelInModal();
      await this.integrationModalShouldBeClosed();
    }

    // LinkedIn is in the "More" menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('LinkedIn');
    await this.enterIntegrationUrl(INVALID_URL);
    await this.submitIntegration();
    await this.shouldSeeAnyValidationError();
    await this.clickCancelInModal();
    await this.integrationModalShouldBeClosed();
  }

  // ─── KB005: Wrong-platform URL validation (all platforms, single session) ─────

  async everyIntegrationShouldRejectWrongPlatformUrl() {
    const wrongUrls = {
      Youtube: 'https://www.instagram.com/guimaturana/',
      X: 'https://www.tiktok.com/@mazzola',
      Instagram: 'https://www.youtube.com/@orochidois1692',
      Facebook: 'https://www.twitter.com/opovo',
      TikTok: 'https://www.instagram.com/guimaturana/',
    };

    for (const [platform, url] of Object.entries(wrongUrls)) {
      await this.clickPlatformButton(platform);
      await this.enterIntegrationUrl(url);
      await this.submitIntegration();
      await this.shouldSeeAnyValidationError();
      await this.clickCancelInModal();
      await this.integrationModalShouldBeClosed();
    }

    // LinkedIn is in the "More" menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('LinkedIn');
    await this.enterIntegrationUrl('https://www.instagram.com/guimaturana/');
    await this.submitIntegration();
    await this.shouldSeeAnyValidationError();
    await this.clickCancelInModal();
    await this.integrationModalShouldBeClosed();
  }

  // ─── KB006: Create all social integrations (submission only) ────────────────

  async createSocialIntegrations() {
    const mainIntegrations = [
      { platform: 'Youtube', url: 'orochidois1692' },
      { platform: 'X', url: 'opovo' },
      { platform: 'Instagram', url: 'https://www.instagram.com/guimaturana/' },
      { platform: 'Facebook', url: 'https://www.facebook.com/igaounderground' },
      { platform: 'TikTok', url: 'https://www.tiktok.com/@mazzola' },
    ];

    for (const { platform, url } of mainIntegrations) {
      await this.clickPlatformButton(platform);
      await this._submitIntegrationForPlatform(platform, url);
      await this.integrationModalShouldBeClosed();
    }

    // LinkedIn is in the "More" menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('LinkedIn');
    await this._submitIntegrationForPlatform('LinkedIn', 'https://www.linkedin.com/in/caito-maia');
    await this.integrationModalShouldBeClosed();
  }

  async shouldSeeError(message) {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
  }

  async shouldSeeAnyValidationError() {
    // Matches inline validation errors from any integration platform
    await expect(
      this.page.getByText(/valid url|not supported|invalid|please enter/i).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async integrationCardShouldShowSpinner() {
    await expect(
      this.page.locator('[class*="animate-spin"]').first()
    ).toBeVisible({ timeout: 15000 });
  }

  async connectionLineShouldBeDashed() {
    await expect(this.page.locator('.vkb-animated-edge').first()).toBeVisible({ timeout: 15000 });
  }

  // ─── Loaded integration helpers ───────────────────────────────────────────────

  // Locates the first integration node card that is in "completed" state
  // (identified by the green CheckCircle2 icon with class text-green-500).
  _completedNodeLocator() {
    return this.page.locator('.react-flow__node:not(.react-flow__node-linkedin)').filter({
      has: this.page.locator('.text-green-500'),
    }).first();
  }

  // Opens the side-drawer config modal for the first completed integration node.
  async _openConfigModalAndWait() {
    // Collapse any floating toolbar left open from a previous node interaction
    await this.page.locator('.react-flow__pane').first().click({ force: true });
    await this.page.waitForTimeout(300);

    const node = this._completedNodeLocator();
    await expect(node).toBeVisible({ timeout: 15000 });
    await node.click();

    const configBtn = this.page.locator('button[aria-label="Config"]');
    await configBtn.waitFor({ state: 'visible', timeout: 5000 });
    await configBtn.click();

    // The drawer is open when the shadcn Tabs with "Profile" tab become visible
    await this.page.getByRole('tab', { name: 'Profile' }).waitFor({ state: 'visible', timeout: 8000 });
  }

  // Closes the side drawer by clicking the backdrop overlay (top-left corner).
  async _closeSideDrawer() {
    await this.page.mouse.click(10, 10);
    await this.page.waitForTimeout(500);
  }

  async _fitView() {
    await this.page.getByRole('button', { name: 'Fit view' }).click();
    await this.page.waitForTimeout(1000);
  }

  // ─── KB010: Given preconditions ──────────────────────────────────────────────

  // Creates social integrations (if none loaded) and waits for completion.
  // Used by "Given I have an existing loaded integration" to be self-healing.
  async ensureSocialIntegrationsLoaded() {
    await this._fitView();
    const count = await this._completedNodeLocator().count();
    if (count > 0) return;
    await this.createSocialIntegrations();
    await this._waitForSocialIntegrationsCompleted();
    await this._fitView();
  }

  // Waits for all 6 social integrations to reach completed status.
  // Does NOT enforce minimum post counts — that validation is exclusive to KB006.
  async _waitForSocialIntegrationsCompleted() {
    const expectedTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin'];
    let latestIntegrations = [];

    const onResponse = async (response) => {
      if (response.request().method() !== 'POST') return;
      if (!response.url().includes('graphql')) return;
      if (!(response.request().postData() ?? '').includes('avatarIntegrations')) return;
      try {
        const body = await response.json();
        const integrations = body?.data?.avatarIntegrations;
        if (Array.isArray(integrations)) latestIntegrations = integrations;
      } catch {}
    };

    this.page.on('response', onResponse);
    const deadline = Date.now() + 600000;
    try {
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(5000);

        for (const type of expectedTypes) {
          const i = latestIntegrations.find(x => x.type === type);
          if (i?.status === 'failed') throw new Error(`Integration "${type}" has status "failed"`);
        }

        const allCompleted = expectedTypes.every(
          type => latestIntegrations.find(x => x.type === type)?.status === 'completed'
        );
        if (allCompleted) return;
      }

      const report = expectedTypes.map(type => {
        const i = latestIntegrations.find(x => x.type === type);
        return `  ${type}: ${i ? i.status : 'not yet seen'}`;
      }).join('\n');
      throw new Error(`Timed out after 10 minutes:\n${report}`);
    } finally {
      this.page.off('response', onResponse);
    }
  }

  // Creates other-source integrations (website/text/biography/reddit) only if any are missing.
  async ensureOtherIntegrationsLoaded() {
    const nodeTypes = ['website', 'text', 'biography', 'reddit'];
    for (const t of nodeTypes) {
      if (!await this.page.locator(`.react-flow__node-${t}`).first().isVisible()) {
        await this.createOtherIntegrations();
        return;
      }
    }
  }

  // Bulk-deletes all integration nodes. No-op if none exist.
  // Called from the After hook so every test starts from a clean canvas.
  async bulkDeleteAllIntegrations() {
    if (!this.page.url().includes('/knowledge-base')) {
      await this.page.goto('/knowledge-base');
      await this.page.waitForLoadState('load');
      await this.page.locator('.react-flow__node').first()
        .waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);
    }

    await this._fitView();

    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin',
                       'website', 'text', 'biography', 'reddit'];
    let hasAny = false;
    for (const t of nodeTypes) {
      if (await this.page.locator(`.react-flow__node-${t}`).first().isVisible()) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) return;

    const pane = this.page.locator('.react-flow__pane');
    const bounds = await pane.boundingBox().catch(() => null);
    if (!bounds) return;

    // Press Escape first so no node is focused/active — prevents the drag from being
    // interpreted as a node-move interaction if it starts on top of a skill node.
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);

    await this.page.mouse.move(bounds.x + 5, bounds.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + bounds.width - 5, bounds.y + bounds.height - 5, { steps: 20 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);

    const deleteAllBtn = this.page.getByRole('button', { name: 'Delete all' });
    if (!await deleteAllBtn.isVisible()) return;

    await deleteAllBtn.click();
    const confirmBtn = this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete all' });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async firstLoadedIntegrationShouldExist() {
    await this.ensureSocialIntegrationsLoaded();
  }

  // Ensures the first loaded integration is in the enabled state before the test runs.
  async ensureIntegrationEnabled() {
    await this._fitView();
    await this._openConfigModalAndWait();
    await this.page.getByRole('tab', { name: 'Settings' }).click();
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      await toggle.click();
      await this.page.waitForTimeout(1500);
    }
    await this._closeSideDrawer();
    await this._fitView();
  }

  // Ensures the first loaded integration is in the disabled state before the test runs.
  async ensureIntegrationDisabled() {
    await this._fitView();
    await this._openConfigModalAndWait();
    await this.page.getByRole('tab', { name: 'Settings' }).click();
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) === 'checked') {
      await toggle.click();
      await this.page.waitForTimeout(1500);
    }
    await this._closeSideDrawer();
    await this._fitView();
  }

  // ─── KB010–KB011: Card assertions ────────────────────────────────────────────

  async cardShouldShowProfileName() {
    const nodes = this.page.locator('.react-flow__node').filter({
      has: this.page.locator('.text-green-500'),
    });
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = await nodes.nth(i).locator('h3.font-semibold').first()
        .textContent({ timeout: 5000 }).catch(() => '');
      expect(
        text?.trim().length,
        `Integration card ${i + 1} should show a profile name`
      ).toBeGreaterThan(0);
    }
  }

  async cardShouldShowProfileImage() {
    const nodes = this.page.locator('.react-flow__node').filter({
      has: this.page.locator('.text-green-500'),
    });
    const count = await nodes.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const img = nodes.nth(i).locator('img.w-full.h-full.object-cover').first();
      await expect(img).toBeVisible({ timeout: 10000 });
      const src = await img.getAttribute('src');
      expect(src, `Integration card ${i + 1} image src should not be empty`).toBeTruthy();
    }
  }

  // ─── KB007: Post count per card ───────────────────────────────────────────────

  async allLoadedCardsShouldShowPostCount() {
    const integrations = await this._integrationDataReady;
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin'];
    for (const type of nodeTypes) {
      const integration = integrations.find(i => i.type === type);
      if (!integration) continue;
      const expectedCount = integration.metadata?.totalFetchedCount;
      if (expectedCount == null) continue;
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      const countEl = node.locator('p.text-xs.text-slate-700.leading-4').first();
      const text = await countEl.textContent({ timeout: 5000 }).catch(() => '');
      expect(text, `${type} card should show "${expectedCount} posts"`).toContain(String(expectedCount));
    }
  }

  // ─── Config modal ─────────────────────────────────────────────────────────────

  async openIntegrationConfigModal() {
    this._completedCountBeforeAction = await this.page
      .locator('.react-flow__node').filter({ has: this.page.locator('.text-green-500') })
      .count();
    await this._openConfigModalAndWait();
  }

  async navigateToTab(tabName) {
    const tab = this.page.getByRole('tab', { name: tabName });
    await tab.waitFor({ state: 'visible', timeout: 8000 });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  // Text and Biography don't have a Profile tab — open at Settings instead.
  _getDefaultTabForType(type) {
    return ['text', 'biography'].includes(type) ? 'Settings' : 'Profile';
  }

  // Opens config modal for a specific platform node type (e.g. 'youtube', 'instagram')
  async _openConfigModalForType(type) {
    // Collapse any floating toolbar left open from a previous node interaction
    await this.page.locator('.react-flow__pane').first().click({ force: true });
    await this.page.waitForTimeout(300);

    const node = this.page.locator(`.react-flow__node-${type}`).first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click();
    const configBtn = this.page.locator('button[aria-label="Config"]');
    await configBtn.waitFor({ state: 'visible', timeout: 5000 });
    await configBtn.click();
    const defaultTab = this._getDefaultTabForType(type);
    await this.page.getByRole('tab', { name: defaultTab }).waitFor({ state: 'visible', timeout: 8000 });
  }

  // ─── KB008: Profile tab (all cards) ──────────────────────────────────────────

  async eachIntegrationProfileTabShouldShowBioAndAccountInformation() {
    const profileFields = {
      youtube:   ['URL', 'Posts', 'Followers'],
      facebook:  ['URL', 'Posts', 'Followers'],
      x:         ['URL', 'Posts', 'Followers', 'Following'],
      instagram: ['URL', 'Posts', 'Followers', 'Following'],
      tiktok:    ['URL', 'Posts', 'Followers', 'Following'],
      linkedin:  null, // skip — profile tab not validated for LinkedIn
    };
    const failures = [];
    for (const type of Object.keys(profileFields)) {
      if (profileFields[type] === null) continue;
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      try {
        await this._openConfigModalForType(type);
        // Bio: rounded gray box must have text content
        const bioBox = this.page.locator('.rounded-md.bg-gray-50').first();
        await expect(bioBox).toBeVisible({ timeout: 8000 });
        const bioText = await bioBox.innerText({ timeout: 3000 }).catch(() => '');
        expect(bioText.trim().length, `${type}: bio should have text`).toBeGreaterThan(0);
        // Account info fields specific to this network
        for (const label of profileFields[type]) {
          await this._accountInfoFieldShouldHaveValue(label, type);
        }
      } catch (err) {
        failures.push(`${type}: ${err.message}`);
      } finally {
        await this._closeSideDrawer();
      }
    }
    if (failures.length > 0) {
      throw new Error(`KB008 profile tab failures:\n${failures.map(f => `  ${f}`).join('\n')}`);
    }
  }

  async _accountInfoFieldShouldHaveValue(label, context = '') {
    const row = this.page
      .locator('div.flex.items-center.justify-between.py-3.border-b')
      .filter({ hasText: label })
      .first();
    await expect(row).toBeVisible({ timeout: 5000 });
    const value = await row.locator('span').first().textContent({ timeout: 3000 }).catch(() => '');
    expect(
      value?.trim().length,
      `${context ? context + ': ' : ''}"${label}" should have a non-empty value`
    ).toBeGreaterThan(0);
  }

  // ─── KB011: Profile tab (single card, legacy) ────────────────────────────────

  async profileTabShouldShowBio() {
    await expect(this.page.locator('.rounded-md.bg-gray-50').first()).toBeVisible({ timeout: 8000 });
  }

  async profileTabShouldShowAccountInformation() {
    await expect(this.page.getByText('Account Information')).toBeVisible({ timeout: 5000 });
  }

  // ─── KB012–KB013: Posts tab ───────────────────────────────────────────────────

  async postsShouldBeListedWithTitleAndDate() {
    await expect(
      this.page.locator('table tbody tr').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async eachPostShouldHaveActionMenu() {
    await expect(this.page.locator('button.h-8.w-8').first()).toBeVisible({ timeout: 5000 });
  }

  async clickActionOnFirstPost(action) {
    // Scroll the first row into view before clicking (posts list may be long)
    const firstRow = this.page.locator('table tbody tr').first();
    await firstRow.scrollIntoViewIfNeeded();
    await firstRow.locator('button.h-8.w-8').click();
    await this.page.getByRole('menuitem', { name: action }).click();
  }

  // ─── KB009: Posts tab — all integration cards ────────────────────────────────

  async eachIntegrationPostsTabShouldListPostsWithTitleDateAndActions() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok'];
    const minRows = { youtube: 10, default: 20 };
    const integrationData = await this._integrationDataReady;
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.navigateToTab('Posts');
      // Scroll to trigger lazy loading
      await this._scrollPostsListToBottom();
      // Assert minimum row count
      const rows = this.page.locator('table tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10000 });
      const count = await rows.count();
      const configuredMin = minRows[type] ?? minRows.default;
      const apiIntegration = integrationData.find(i => i.type === type);
      const totalFetched = apiIntegration?.metadata?.totalFetchedCount ?? Infinity;
      const required = Math.min(configuredMin, totalFetched);
      expect(count, `${type}: should have at least ${required} post rows`).toBeGreaterThanOrEqual(required);
      // Assert first row has a date (td[1]); title may be empty for some posts
      const cells = rows.first().locator('td');
      const date = await cells.nth(1).textContent({ timeout: 3000 }).catch(() => '');
      expect(date?.trim().length, `${type}: post date should not be empty`).toBeGreaterThan(0);
      // Assert action menu button is present
      await expect(this.page.locator('button.h-8.w-8').first()).toBeVisible({ timeout: 5000 });
      await this._closeSideDrawer();
    }
  }

  async _scrollPostsListToBottom() {
    await this.page.locator('table').first().evaluate(el => {
      const scrollable = el.closest('[class*="overflow-y"]')
        || el.closest('[style*="overflow"]')
        || el.parentElement;
      if (scrollable) scrollable.scrollTo(0, scrollable.scrollHeight);
    }).catch(() => {});
    await this.page.waitForTimeout(1500);
    // Scroll again after potential lazy-load render
    await this.page.locator('table').first().evaluate(el => {
      const scrollable = el.closest('[class*="overflow-y"]')
        || el.closest('[style*="overflow"]')
        || el.parentElement;
      if (scrollable) scrollable.scrollTo(0, scrollable.scrollHeight);
    }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async postDetailsShouldBeVisible() {
    await this.eachIntegrationPostDetailsShouldShowFullMetadata();
  }

  async eachIntegrationPostDetailsShouldShowFullMetadata() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok'];
    const withTranscription = ['youtube', 'instagram', 'tiktok'];
    const failures = [];

    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;

      try {
        await this._openConfigModalForType(type);
        await this.navigateToTab('Posts');
        await this.clickActionOnFirstPost('More details');

        const dialog = this.page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 8000 });

        // Post text is always abbreviated — "Read more" button confirms it has content
        await expect(dialog.getByRole('button', { name: /read more/i }).first()).toBeVisible({ timeout: 5000 });

        // Transcription section — only for video platforms
        if (withTranscription.includes(type)) {
          await expect(dialog.getByText(/transcription/i).first()).toBeVisible({ timeout: 5000 });
        }

        // Post Informations fields — scroll each row into view before asserting
        for (const label of ['Posted on', 'Comments', 'View Post', 'Author Profile']) {
          const row = dialog
            .locator('div.flex.items-center.justify-between.py-3.border-b')
            .filter({ hasText: label })
            .first();
          await row.scrollIntoViewIfNeeded({ timeout: 5000 });
          await expect(row).toBeVisible({ timeout: 5000 });
          const value = await row.locator('span').first().textContent({ timeout: 3000 }).catch(() => '');
          expect(value?.trim().length, `${type}: "${label}" should have a non-empty value`).toBeGreaterThan(0);
        }
      } catch (err) {
        failures.push(`${type}: ${err.message}`);
      } finally {
        // Close dialog then config drawer before next iteration
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
        await this._closeSideDrawer();
      }
    }

    if (failures.length > 0) {
      throw new Error(`KB010 post details failures:\n${failures.map(f => `  ${f}`).join('\n')}`);
    }
  }

  // ─── KB014: Load latest posts ────────────────────────────────────────────────

  async clickLoadLatestPosts() {
    await this.page.getByRole('button', { name: /load latest posts/i }).click();
  }

  async integrationShouldShowLoadingState() {
    // Clicking Load Latest Posts triggers a success toast with this message
    await expect(
      this.page.getByText(/loading latest posts/i).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async eachIntegrationLoadLatestPostsShouldTriggerRefresh() {
    // Instagram excluded: Load Latest Posts is not supported for Instagram
    const nodeTypes = ['youtube', 'x', 'facebook', 'tiktok'];

    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;

      await this._openConfigModalForType(type);
      await this.navigateToTab('Posts');

      // Intercept the updateAvatarIntegration request before clicking
      const updateRequest = this.page.waitForRequest(
        req => req.method() === 'POST' &&
               req.url().includes('graphql') &&
               (req.postData() ?? '').includes('updateAvatarIntegration'),
        { timeout: 10000 }
      );

      await this.page.getByRole('button', { name: /load latest posts/i }).click();

      // UI: loading state toast should appear
      await expect(this.page.getByText(/loading latest posts/i).first()).toBeVisible({ timeout: 5000 });

      // API: updateAvatarIntegration request must have been fired
      await updateRequest;

      await this._closeSideDrawer();
    }
  }

  // ─── KB012: Metadata tab (all cards, no LinkedIn) ────────────────────────────

  async metadataShouldShowIntegrationDetails() {
    await expect(
      this.page.locator('.flex.items-center.justify-between.py-3').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async eachIntegrationMetadataTabShouldShowDetails() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.navigateToTab('Metadata');
      await expect(
        this.page.locator('.flex.items-center.justify-between.py-3').first()
      ).toBeVisible({ timeout: 5000 });
      await this._closeSideDrawer();
    }
  }

  // ─── KB013–KB015: Settings tab (all cards, no LinkedIn) ──────────────────────

  async enableSourceToggleShouldBeVisible() {
    await expect(this.page.getByRole('switch').first()).toBeVisible({ timeout: 5000 });
  }

  async eachIntegrationSettingsTabShouldHaveToggle() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.navigateToTab('Settings');
      await expect(this.page.getByRole('switch').first()).toBeVisible({ timeout: 5000 });
      await this._closeSideDrawer();
    }
  }

  async eachIntegrationSourceShouldBeDisableable() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'text', 'biography'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.navigateToTab('Settings');
      const toggle = this.page.getByRole('switch').first();
      if ((await toggle.getAttribute('data-state')) !== 'checked') {
        await toggle.click();
        await this.page.waitForTimeout(1000);
      }
      await toggle.click();
      await expect(toggle).toHaveAttribute('data-state', 'unchecked', { timeout: 15000 });
      await this._closeSideDrawer();
    }
  }

  async eachIntegrationSourceShouldBeEnableable() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'text', 'biography'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.navigateToTab('Settings');
      const toggle = this.page.getByRole('switch').first();
      if ((await toggle.getAttribute('data-state')) === 'checked') {
        await toggle.click();
        await this.page.waitForTimeout(1000);
      }
      await toggle.click();
      await expect(toggle).toHaveAttribute('data-state', 'checked', { timeout: 15000 });
      await this._closeSideDrawer();
    }
  }

  // ─── KB013 (merged): Delete half via config modal, half via card button ───────

  async socialIntegrationsShouldBeDeletedViaBothMethods() {
    for (const type of ['youtube', 'x', 'instagram']) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      // Wait for integration to finish loading before attempting deletion
      await expect(node.locator('.text-green-500')).toBeVisible({ timeout: 120000 });
      await this._openConfigModalForType(type);
      await this.clickDeleteInConfigModal();
      await expect(node).not.toBeVisible({ timeout: 8000 });
    }
    for (const type of ['facebook', 'tiktok', 'linkedin']) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      // Wait for integration to finish loading before attempting deletion
      await expect(node.locator('.text-green-500')).toBeVisible({ timeout: 120000 });
      await this.page.locator('.react-flow__pane').first().click({ force: true });
      await this.page.waitForTimeout(300);
      await node.click();
      const deleteBtn = this.page.locator('button[aria-label="Delete"]');
      await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
      await deleteBtn.click();
      await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
      await expect(node).not.toBeVisible({ timeout: 8000 });
    }
  }

  // ─── KB016–KB017: Delete (all cards, including LinkedIn) ─────────────────────

  async eachIntegrationShouldBeDeletedFromConfigModal() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin', 'website', 'text', 'biography', 'reddit'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this._openConfigModalForType(type);
      await this.clickDeleteInConfigModal();
      await expect(node).not.toBeVisible({ timeout: 8000 });
    }
  }

  async eachIntegrationShouldBeDeletedFromCardButton() {
    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin', 'website', 'text', 'biography', 'reddit'];
    for (const type of nodeTypes) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;
      await this.page.locator('.react-flow__pane').first().click({ force: true });
      await this.page.waitForTimeout(300);
      await node.click();
      const deleteBtn = this.page.locator('button[aria-label="Delete"]');
      await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
      await deleteBtn.click();
      await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
      await expect(node).not.toBeVisible({ timeout: 8000 });
    }
  }

  // ─── KB018: Duplicate URL (all platforms) ────────────────────────────────────

  async everyIntegrationShouldShowDuplicateError() {
    const platforms = [
      { platform: 'Youtube',   url: 'orochidois1692' },
      { platform: 'X',         url: 'opovo' },
      { platform: 'Instagram', url: 'https://www.instagram.com/guimaturana/' },
      { platform: 'Facebook',  url: 'https://www.facebook.com/igaounderground' },
      { platform: 'TikTok',    url: 'https://www.tiktok.com/@mazzola' },
      { platform: 'LinkedIn',  url: 'https://www.linkedin.com/in/caito-maia' },
      { platform: 'URL',       url: 'https://kyliecosmetics.com' },
      { platform: 'Reddit',    url: 'https://www.reddit.com/r/leagueoflegends/' },
    ];
    for (const { platform, url } of platforms) {
      await this.clickPlatformButton(platform).catch(async () => {
        await this.openAddMoreMenu();
        await this.clickPlatformButton(platform);
      });
      await this._submitIntegrationForPlatform(platform, url);
      await this.integrationModalShouldBeClosed();

      await this.clickPlatformButton(platform).catch(async () => {
        await this.openAddMoreMenu();
        await this.clickPlatformButton(platform);
      });
      await this._submitIntegrationForPlatform(platform, url);
      await this.shouldSeeError(
        'This profile is already connected. Remove the existing integration before adding it again.'
      );
      await this.clickCancelInModal();
      await this.page.waitForTimeout(300);
      // After a duplicate error, Cancel may not fully close the panel — click outside as fallback
      await this.clickOutsideModal();
      await this.integrationModalShouldBeClosed();
    }
  }



  // ─── KB013: Submit Text and Biography integrations ──────────────────────────

  async _submitTextIntegration(text) {
    await this.page.locator('textarea').first().fill(text);
    await this.submitIntegration();
  }

  async _submitBiographyIntegration(headline, bio) {
    // Bio textarea has id="bio-description"; the headline input immediately precedes it in DOM.
    const bioTextarea = this.page.locator('#bio-description');
    await bioTextarea.waitFor({ state: 'visible', timeout: 8000 });
    await this.page.locator('xpath=//textarea[@id="bio-description"]/preceding::input[1]').fill(headline);
    await bioTextarea.fill(bio);
    await this.submitIntegration();
  }

  // Creates Website, Text, Biography and Reddit sources (no completion wait).
  async createOtherIntegrations() {
    // Website (URL) — main toolbar
    await this.clickPlatformButton('URL');
    await this._submitIntegrationForPlatform('URL', 'https://kyliecosmetics.com');
    await this.integrationModalShouldBeClosed();

    // Text — More menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('Text');
    await this._submitTextIntegration(
      'Our products and services are designed to meet your needs with the highest quality standards and exceptional customer support.'
    );
    await this.integrationModalShouldBeClosed();

    // Biography — More menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('Biography');
    await this._submitBiographyIntegration(
      'Test Company Profile',
      'We are a leading company in our industry, providing exceptional products and services to customers worldwide since 2010.'
    );
    await this.integrationModalShouldBeClosed();

    // Reddit — More menu
    await this.openAddMoreMenu();
    await this.clickPlatformButton('Reddit');
    await this._submitIntegrationForPlatform('Reddit', 'https://www.reddit.com/r/leagueoflegends/');
    await this.integrationModalShouldBeClosed();
  }

  // Creates all social + other integrations (no completion wait).
  async createAllIntegrations() {
    await this.createSocialIntegrations();
    await this.createOtherIntegrations();
  }

  async otherIntegrationCardsShouldBeVisible() {
    for (const type of ['website', 'text', 'biography', 'reddit']) {
      await expect(
        this.page.locator(`.react-flow__node-${type}`).first()
      ).toBeVisible({ timeout: 15000 });
    }
  }

  // Polls the commerce-ai REST GET endpoint until website (scraperOverview) and
  // reddit (integrations[].status) both reach completed status.
  async websiteAndRedditIntegrationsShouldComplete() {
    let latestData = null;

    const onResponse = async (response) => {
      if (response.request().method() !== 'GET') return;
      if (!response.url().includes('commerce-ai')) return;
      if (response.status() !== 200) return;
      try {
        const body = await response.json();
        // Agent-details response always has _id; filter out list/other endpoints
        if (body?._id !== undefined) latestData = body;
      } catch {}
    };

    this.page.on('response', onResponse);
    const deadline = Date.now() + 300000; // 5 minutes
    try {
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(5000);

        if (!latestData) continue;

        // Website: tracked via scraperOverview.status (REST field, not in GraphQL)
        const scraperStatus = latestData.scraperOverview?.status;
        if (scraperStatus === 'failed') {
          throw new Error('Website scraper has status "failed"');
        }

        // Reddit: tracked via integrations[].status
        const redditEntry = (latestData.integrations ?? []).find(i => i.type === 'reddit');
        if (redditEntry?.status === 'failed') {
          throw new Error('Reddit integration has status "failed"');
        }

        const websiteCompleted = scraperStatus === 'completed';
        const redditCompleted = redditEntry?.status === 'completed';

        if (websiteCompleted && redditCompleted) return;
      }

      const scraperStatus = latestData?.scraperOverview?.status ?? 'not yet seen';
      const redditStatus =
        (latestData?.integrations ?? []).find(i => i.type === 'reddit')?.status ?? 'not yet seen';
      throw new Error(
        `Timed out after 5 minutes:\n  website scraper: ${scraperStatus}\n  reddit: ${redditStatus}`
      );
    } finally {
      this.page.off('response', onResponse);
    }
  }

  // ─── KB014: Edit Text and Biography from config modal ────────────────────────

  async editTextAndBiographyIntegrations() {
    for (const type of ['text', 'biography']) {
      const node = this.page.locator(`.react-flow__node-${type}`).first();
      if (!await node.isVisible()) continue;

      await this.page.locator('.react-flow__pane').first().click({ force: true });
      await this.page.waitForTimeout(300);
      await node.click();
      const configBtn = this.page.locator('button[aria-label="Config"]');
      await configBtn.waitFor({ state: 'visible', timeout: 5000 });
      await configBtn.click();

      if (type === 'text') {
        const textarea = this.page.locator('textarea').first();
        await textarea.waitFor({ state: 'visible', timeout: 8000 });
        await textarea.fill('Updated text content for our product and service information.');
      } else {
        const bioTextarea = this.page.getByRole('textbox', { name: /biography/i });
        await bioTextarea.waitFor({ state: 'visible', timeout: 8000 });
        const headlineInput = this.page.getByRole('textbox', { name: /headline/i });
        if (await headlineInput.count() > 0) {
          await headlineInput.fill('Updated Company Profile');
        }
        await bioTextarea.fill(
          'Updated biography describing our mission, values, and dedication to excellent service.'
        );
      }

      await this.page.locator(selectors.btnSaveModal).click({ force: true });
      await this.page.waitForTimeout(500);
      await this._closeSideDrawer();
    }
  }

  async toggleSourceOff() {
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) === 'checked') {
      await toggle.click();
    }
  }

  async toggleSourceOn() {
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      await toggle.click();
    }
  }

  async integrationShouldBeMarkedAsDisabled() {
    await expect(
      this.page.getByRole('switch').first()
    ).toHaveAttribute('data-state', 'unchecked', { timeout: 5000 });
  }

  async integrationShouldBeMarkedAsEnabled() {
    await expect(
      this.page.getByRole('switch').first()
    ).toHaveAttribute('data-state', 'checked', { timeout: 5000 });
  }

  // ─── KB019: Delete from config modal ─────────────────────────────────────────

  async clickDeleteInConfigModal() {
    // Footer "Delete Source" button opens the ConfirmationDialog
    await this.page.getByRole('button', { name: /delete source/i }).click();
    // Confirm inside the AlertDialog
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  }

  // ─── KB019–KB020: Shared deletion assertion ───────────────────────────────────

  async integrationCardShouldNotBeVisible() {
    // Verify the completed-node count decreased from the count captured before the action
    const currentCount = await this.page
      .locator('[class*="w-72"]')
      .filter({ has: this.page.locator('.text-green-500') })
      .count();
    expect(currentCount).toBeLessThan(this._completedCountBeforeAction);
  }

  // ─── KB020: Delete directly from card ────────────────────────────────────────

  async clickDeleteButtonDirectlyOnCard() {
    this._completedCountBeforeAction = await this.page
      .locator('[class*="w-72"]')
      .filter({ has: this.page.locator('.text-green-500') })
      .count();

    const node = this._completedNodeLocator();
    await expect(node).toBeVisible({ timeout: 15000 });
    await node.click();

    // NodeActionToolbar renders a red Delete button (aria-label="Delete")
    const deleteBtn = this.page.locator('button[aria-label="Delete"]');
    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
    await deleteBtn.click();

    // Confirm inside the AlertDialog rendered by VisualKnowledgeBaseInner
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  }

  // ─── KB022: Bulk drag-select ──────────────────────────────────────────────────

  async dragSelectAllIntegrations() {
    this._completedCountBeforeAction = await this.page
      .locator('[class*="w-72"]')
      .filter({ has: this.page.locator('.text-green-500') })
      .count();

    const pane = this.page.locator('.react-flow__pane');
    await pane.waitFor({ state: 'visible', timeout: 10000 });
    const bounds = await pane.boundingBox();
    if (!bounds) throw new Error('ReactFlow pane not found');

    await this.page.mouse.move(bounds.x + 5, bounds.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(
      bounds.x + bounds.width - 5,
      bounds.y + bounds.height - 5,
      { steps: 20 }
    );
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);
  }

  async bulkActionBarShouldBeVisible() {
    await expect(this.page.getByText('Sources selected')).toBeVisible({ timeout: 5000 });
    await expect(this.page.getByRole('button', { name: 'Delete all' })).toBeVisible({ timeout: 5000 });
  }

  async clickDeleteAllInBulkBar() {
    await this.page.getByRole('button', { name: 'Delete all' }).click();
  }

  async bulkDeleteConfirmationShouldBeVisible() {
    await expect(this.page.getByRole('alertdialog')).toBeVisible({ timeout: 5000 });
  }

  async confirmBulkDelete() {
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete all' }).click();
  }

  // ─── KB023–KB025: Skills ──────────────────────────────────────────────────────

  async clickSkillsButton() {
    // Dismiss any Radix popper (e.g. Avatar Health panel) blocking pointer events.
    const popper = this.page.locator('[data-radix-popper-content-wrapper]');
    if (await popper.isVisible({ timeout: 1000 }).catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await popper.waitFor({ state: 'hidden', timeout: 3000 }).catch(async () => {
        // Escape didn't close it — hide via JS as last resort
        await this.page.evaluate(() => {
          document.querySelectorAll('[data-radix-popper-content-wrapper]')
            .forEach(el => { el.style.display = 'none'; });
        });
      });
      await this.page.waitForTimeout(300);
    }
    await this.page.getByRole('button', { name: 'Skills' }).click();
  }

  async clickSkillInPopover(skillName) {
    // Retry loop: if the Skills popover was inadvertently closed (e.g. by the Avatar Quality
    // panel dismiss handler), re-open it and try again.
    for (let attempt = 0; attempt < 3; attempt++) {
      const btn = this.page.getByRole('button', { name: skillName });
      const visible = await btn.isVisible({ timeout: 4000 }).catch(() => false);
      if (visible) {
        await btn.click();
        return;
      }
      // Button not found: re-open the Skills popover and retry
      await this._dismissOverlays();
      await this.clickSkillsButton();
    }
    throw new Error(`Could not find skill "${skillName}" in Skills popover after 3 attempts`);
  }

  async skillDrawerShouldBeVisible() {
    // All skill drawers render as a fixed right-side panel
    await expect(
      this.page.locator('.fixed.right-0.top-0').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async conversationsSkillShouldShowAlwaysActive() {
    await expect(this.page.getByText('Always Active')).toBeVisible({ timeout: 5000 });
  }

  // ─── KB024: Seller skill ──────────────────────────────────────────────────────

  _setupCommerceAiInterception() {
    // Intercept the GET re-fetch that fires after the action update
    this._commerceAiResponsePromise = this.page.waitForResponse(
      (res) =>
        res.url().includes('commerce-ai') &&
        res.request().method() === 'GET' &&
        res.status() === 200,
      { timeout: 15000 }
    );
  }

  async enableSellerSkill() {
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) === 'checked') {
      this._commerceAiResponsePromise = null; // already enabled, no click → no request
      return;
    }
    this._setupCommerceAiInterception();
    await toggle.click();
  }

  async disableSellerSkill() {
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      this._commerceAiResponsePromise = null; // already disabled, no click → no request
      return;
    }
    this._setupCommerceAiInterception();
    await toggle.click();
  }

  async _verifySellerEnabledState(expectedEnabled) {
    if (this._commerceAiResponsePromise === null) {
      // No click was needed (toggle already in correct state) — verify via toggle attribute
      const toggle = this.page.getByRole('switch').first();
      const isChecked = (await toggle.getAttribute('data-state')) === 'checked';
      expect(isChecked).toBe(expectedEnabled);
      return;
    }
    const response = await this._commerceAiResponsePromise;
    const body = await response.json();
    const sellProductsAction = (body.actions ?? []).find((a) => a.type === 'sell_products');
    expect(sellProductsAction?.enabled).toBe(expectedEnabled);
  }

  async sellerSkillShouldBeEnabledInResponse() {
    await this._verifySellerEnabledState(true);
  }

  async sellerSkillShouldBeDisabledInResponse() {
    await this._verifySellerEnabledState(false);
  }

  async sellProductsNodeShouldBeVisible() {
    await expect(
      this.page.locator('[data-testid^="rf__node-sell-products"]')
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── KB025: Voice Call skill ──────────────────────────────────────────────────

  async voiceCallSkillDrawerShouldBeVisible() {
    await expect(
      this.page.locator('.fixed.right-0').filter({ hasText: /voice|audio call/i }).first()
    ).toBeVisible({ timeout: 10000 });
  }

  async uploadVoiceAudioFile() {
    // If the upload button is not present, audio already exists — skip upload.
    const uploadButtonVisible = await this.page.getByText(/upload existing recording/i).first()
      .isVisible({ timeout: 2000 }).catch(() => false);
    if (!uploadButtonVisible) {
      return;
    }

    // The React component captures a reference to showOpenFilePicker at module
    // load (e.g. via .bind or an early assignment), so overriding window.showOpen-
    // FilePicker after the page is already running has no effect.  The fix is to
    // inject the override via addInitScript and then navigate to KB — the init
    // script runs before any React modules initialize, so the mock is the only
    // reference the component ever captures.
    const audioBase64 = require('fs').readFileSync(TEST_AUDIO_PATH).toString('base64');
    await this.page.addInitScript(() => {
      window.__fileInputLog = [];

      // Log addEventListener on file inputs
      const origAdd = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, fn, ...args) {
        if (this instanceof HTMLInputElement && this.type === 'file') {
          window.__fileInputLog.push({ action: 'addListener', type });
          console.log(`[FILE-INPUT] addEventListener('${type}')`);
          const wrapped = function (...a) {
            console.log(`[FILE-INPUT] '${type}' fired, files:`, this.files?.length ?? -1);
            window.__fileInputLog.push({ action: 'fired', type, filesLen: this.files?.length ?? -1 });
            return fn.apply(this, a);
          };
          return origAdd.call(this, type, wrapped, ...args);
        }
        return origAdd.call(this, type, fn, ...args);
      };

      // Remove showOpenFilePicker so the component uses the file input fallback path
      // (the fallback path attaches event listeners; the showOpenFilePicker path doesn't)
      delete window.showOpenFilePicker;
      console.log('[FILE-INPUT] showOpenFilePicker deleted, using fallback path');

      // Append file input INSIDE the dialog so change events bubble through it
      // (the component likely uses event delegation on the dialog element)
      const originalClick = HTMLInputElement.prototype.click;
      HTMLInputElement.prototype.click = function () {
        if (this.type === 'file' && !document.body.contains(this)) {
          const dialog = document.querySelector('[role="dialog"]') || document.body;
          console.log('[FILE-INPUT] click() — appending to', dialog.getAttribute('role') || 'body');
          this.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
          dialog.appendChild(this);
        }
        return originalClick.call(this);
      };
    });

    // Close the dialog and navigate to KB — the init script applies on this load
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 30000 });
    await this.page.waitForTimeout(1000);

    // Re-open the Audio Skill dialog with the override now in place.
    // Use force:true on the skill button — the addInitScript addEventListener override
    // can cause the popover button to remain "not stable" due to micro-layout thrashing.
    await this.clickSkillsButton();
    await this.page.waitForTimeout(500);
    await this.page.getByRole('button', { name: 'Make Audio Calls' }).click({ force: true });
    await this.page.getByRole('dialog', { name: /audio skill/i })
      .waitFor({ state: 'visible', timeout: 8000 });

    // Listen to page console so [FILE-INPUT] messages from the init script show up
    const consoleMessages = [];
    const onConsole = msg => {
      if (msg.text().startsWith('[FILE-INPUT]')) {
        consoleMessages.push(msg.text());
        console.log('[TEST]', msg.text());
      }
    };
    this.page.on('console', onConsole);

    // The init script ensures the file input is in the DOM before native click fires.
    // Use waitForEvent('filechooser') + setFiles — this properly closes the native
    // dialog and dispatches change events through the same path as real user selection.
    const [fc] = await Promise.all([
      this.page.waitForEvent('filechooser', { timeout: 8000 }),
      this.page.getByText(/upload existing recording/i).first().click(),
    ]);
    await fc.setFiles(TEST_AUDIO_PATH);

    // Wait and log what the input log shows
    await this.page.waitForTimeout(2000);
    const fileInputLog = await this.page.evaluate(() => window.__fileInputLog || []);
    console.log('[KB022] File input log:', JSON.stringify(fileInputLog));

    this.page.off('console', onConsole);

    // After upload, the toggle appears once the blob is ready.
    // For avatars that already have a Settings tab (existing voice clone infrastructure),
    // the toggle lives on Settings — _ensureVoiceToggleVisible handles the tab switch.
    await this._ensureVoiceToggleVisible();
  }

  async clickRecordNewAudio() {
    // Card may be a button or a clickable div — try both
    const card = this.page.getByText(/record new audio now/i).first();
    await card.click();
  }

  async recordingCountdownShouldBeVisible() {
    // The countdown shows "Starting in X..." before recording begins
    await expect(
      this.page.getByText(/starting in/i).first()
    ).toBeVisible({ timeout: 5000 });
  }

  async recordingIndicatorShouldBeVisibleAfterCountdown() {
    // The red pulsing dot indicates active recording
    await expect(
      this.page.locator('.bg-red-500.animate-pulse').first()
    ).toBeVisible({ timeout: 10000 });
  }

  async pauseButtonShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: 'Pause' })
    ).toBeVisible({ timeout: 5000 });
  }

  async clickPauseRecording() {
    await this.page.getByRole('button', { name: 'Pause' }).click();
  }

  async resumeAndRestartButtonsShouldBeVisible() {
    await expect(
      this.page.getByRole('button', { name: 'Resume' })
    ).toBeVisible({ timeout: 5000 });
    // Restart button uses a Tooltip with text "Restart Recording"; locate by tooltip trigger
    await expect(
      this.page.locator('button').filter({ has: this.page.locator('svg') }).nth(0)
    ).toBeVisible({ timeout: 5000 });
  }

  async clickResumeRecording() {
    await this.page.getByRole('button', { name: 'Resume' }).click();
  }

  async waitForMinimumRecordingTime() {
    // Wait 16 seconds so recording time >= MIN_RECORDING_TIME (15s)
    await this.page.waitForTimeout(16000);
  }

  async stopRecording() {
    // After 15s the button label changes from "Cancel" to "Stop"
    await this.page.getByRole('button', { name: 'Stop' }).click();
  }

  async voiceCallToggleShouldBeVisible() {
    // When audio already exists the toggle is on the Settings tab, not "Your voice".
    // _ensureVoiceToggleVisible navigates to the correct tab and returns the locator.
    const toggle = await this._ensureVoiceToggleVisible();
    await expect(toggle).toBeVisible({ timeout: 5000 });
  }

  async enableVoiceCallSkill() {
    const toggle = this.page.getByRole('switch').first();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      // Intercept the create-voice-clone Supabase edge function request
      this._voiceCloneResponsePromise = this.page.waitForResponse(
        (res) => res.url().includes('create-voice-clone'),
        { timeout: 30000 }
      );
      await toggle.click();
    } else {
      // Clone already exists — mark so voiceCloneRequestShouldSucceed skips.
      this._voiceCloneResponsePromise = null;
    }
  }

  // Lightweight toggle ON — used after the clone already exists (no create-voice-clone call expected).
  // Navigates to the Settings tab if the toggle is not visible on the current tab
  // (when the voice clone already exists, the enable/disable switch lives in Settings).
  // Scoped to the skill drawer panel (.fixed.right-0.top-0) so page-level switches
  // (e.g. React Flow toggle nodes in automation2arena) are never matched by accident.
  async _ensureVoiceToggleVisible() {
    // Use the Audio Skill dialog role locator — same as ensureVoiceCallEnabled uses,
    // more reliable than CSS class selector which varies across avatar types.
    const drawer = this.page.getByRole('dialog', { name: /audio skill/i });
    // Re-open the drawer if it was closed
    const drawerVisible = await drawer.isVisible({ timeout: 2000 }).catch(() => false);
    if (!drawerVisible) {
      await this._dismissOverlays();
      await this.clickSkillsButton();
      await this.clickSkillInPopover('Make Audio Calls');
      await drawer.waitFor({ state: 'visible', timeout: 10000 });
    }
    const toggle = drawer.getByRole('switch').first();
    const visibleOnCurrentTab = await toggle.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visibleOnCurrentTab) {
      // Audio Skill drawer "Settings" tab-like buttons do NOT carry role="tab" —
      // use text match instead of ARIA role.
      await drawer.getByText('Settings', { exact: true }).first().click();
      await toggle.waitFor({ state: 'visible', timeout: 5000 });
    }
    return toggle;
  }

  // Waits for a commerce-ai response where the voice-clone action reflects
  // the expected enabled state. This filters out pre-click polling responses
  // that would otherwise resolve the promise early.
  _setupVoiceStateResponseInterceptor(expectedEnabled) {
    return this.page.waitForResponse(
      async (res) => {
        if (!res.url().includes('commerce-ai')) return false;
        try {
          const json = await res.json();
          const actions = json?.actions || [];
          const voiceAction = actions.find(a => a.type === 'voice-clone');
          return voiceAction !== undefined && voiceAction.enabled === expectedEnabled;
        } catch {
          return false;
        }
      },
      { timeout: 15000 }
    ).catch(() => null);
  }

  async enableVoiceCallToggle() {
    await this.page.getByRole('dialog', { name: /audio skill/i }).waitFor({ state: 'visible', timeout: 10000 });
    const toggle = await this._ensureVoiceToggleVisible();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      const stateConfirmed = this._setupVoiceStateResponseInterceptor(true);
      await toggle.click();
      const result = await stateConfirmed;
      if (result === null) {
        await this.page.waitForTimeout(8000);
      }
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async disableVoiceCallSkill() {
    await this.page.getByRole('dialog', { name: /audio skill/i }).waitFor({ state: 'visible', timeout: 10000 });
    const toggle = await this._ensureVoiceToggleVisible();
    if ((await toggle.getAttribute('data-state')) === 'checked') {
      const stateConfirmed = this._setupVoiceStateResponseInterceptor(false);
      await toggle.click();
      const result = await stateConfirmed;
      // If commerce-ai didn't respond in time (non-commerce-ai avatar or slow poll),
      // give extra time for the backend state change to propagate before the EU visits.
      if (result === null) {
        await this.page.waitForTimeout(8000);
      }
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  // Precondition helper: ensures the voice call skill is enabled for this avatar.
  // Determines what action is needed by inspecting the dialog state directly:
  //   - "Upload existing recording" visible → no audio yet, must upload then enable
  //   - toggle visible on "Your voice" tab → audio ready, just enable (creates clone)
  //   - neither → clone already created, toggle is on "Settings" tab
  async ensureVoiceCallEnabled() {
    if (!this.page.url().includes('/knowledge-base')) {
      await this.visit();
    }

    await this.clickSkillsButton();
    await this.clickSkillInPopover('Make Audio Calls');

    const audioDialog = this.page.getByRole('dialog', { name: /audio skill/i });
    await audioDialog.waitFor({ state: 'visible', timeout: 8000 });

    const needsUpload = await this.page.getByText(/upload existing recording/i).first()
      .isVisible({ timeout: 2000 }).catch(() => false);

    if (needsUpload) {
      // No audio at all — uploadVoiceAudioFile closes this dialog, navigates,
      // re-opens the dialog and uploads; toggle appears afterwards (may be on Settings tab).
      await this.uploadVoiceAudioFile();
      const toggle = await this._ensureVoiceToggleVisible();
      if ((await toggle.getAttribute('data-state')) !== 'checked') {
        this._voiceCloneResponsePromise = this.page.waitForResponse(
          (res) => res.url().includes('create-voice-clone'),
          { timeout: 30000 }
        );
        await toggle.click();
        await this._voiceCloneResponsePromise.catch(() => {});
      }
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      return;
    }

    // Audio exists (upload button not present) — find and enable the toggle.
    // When the clone was already created the toggle lives on the Settings tab.
    const toggle = await this._ensureVoiceToggleVisible();
    if ((await toggle.getAttribute('data-state')) !== 'checked') {
      await toggle.click();
      await this.page.waitForTimeout(1500);
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  async voiceCloneRequestShouldSucceed() {
    const response = await this._voiceCloneResponsePromise;
    if (response === null) return; // clone already existed before this run — skip
    const body = await response.json();
    // Supabase edge function returns { success: true, voice_id: '...' }
    expect(body.success).toBe(true);
    expect(body.voice_id ?? body.voiceId ?? body.id).toBeTruthy();
  }

  async voiceCallsNodeShouldBeVisible() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);
    await expect(
      this.page.getByText('VOICE CALLS')
    ).toBeVisible({ timeout: 10000 });
  }

  // ─── KB026: Canvas controls ────────────────────────────────────────────────────

  async clickSelectMode() {
    await this.page.getByRole('button', { name: 'Select' }).click();
  }

  async selectModeShouldBeActive() {
    await expect(
      this.page.getByRole('button', { name: 'Select' })
    ).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
  }

  async selectModeShouldBeInactive() {
    await expect(
      this.page.getByRole('button', { name: 'Select' })
    ).toHaveAttribute('aria-pressed', 'false', { timeout: 3000 });
  }

  async clickMoveMode() {
    await this.page.getByRole('button', { name: 'Move' }).click();
  }

  async moveModeShouldBeActive() {
    await expect(
      this.page.getByRole('button', { name: 'Move' })
    ).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
  }

  async _getViewportScale() {
    const viewport = this.page.locator('.react-flow__viewport').first();
    const style = await viewport.getAttribute('style') ?? '';
    const match = style.match(/scale\(([^)]+)\)/);
    return match ? parseFloat(match[1]) : 1;
  }

  async clickZoomIn() {
    this._zoomBeforeIn = await this._getViewportScale();
    await this.page.getByRole('button', { name: 'Zoom in' }).click();
    await this.page.waitForTimeout(400);
  }

  async zoomLevelShouldHaveIncreased() {
    const after = await this._getViewportScale();
    expect(after).toBeGreaterThan(this._zoomBeforeIn);
  }

  async clickZoomOut() {
    this._zoomBeforeOut = await this._getViewportScale();
    await this.page.getByRole('button', { name: 'Zoom out' }).click();
    await this.page.waitForTimeout(400);
  }

  async zoomLevelShouldHaveDecreased() {
    const after = await this._getViewportScale();
    expect(after).toBeLessThan(this._zoomBeforeOut);
  }

  async clickFitView() {
    await this.page.getByRole('button', { name: 'Fit view' }).click();
    await this.page.waitForTimeout(500);
  }

  async knowledgeBaseNodeShouldBeVisible() {
    // After fit view the central avatar node (always present) must be in viewport
    await expect(
      this.page.locator('.react-flow__node').first()
    ).toBeVisible({ timeout: 5000 });
  }

  async clickFullscreen() {
    // Enters fullscreen: hides the app sidebar
    await this.page.getByRole('button', { name: 'Hide Sidebar' }).click();
    await this.page.waitForTimeout(400);
  }

  async sidebarShouldBeHidden() {
    // In fullscreen mode the button changes to "Show Sidebar" / "Dashboard"
    await expect(
      this.page.getByRole('button', { name: 'Show Sidebar' })
    ).toBeVisible({ timeout: 5000 });
  }

  async clickShowSidebar() {
    await this.page.getByRole('button', { name: 'Show Sidebar' }).click();
    await this.page.waitForTimeout(400);
  }

  async sidebarShouldBeVisible() {
    // After exiting fullscreen the expand button returns
    await expect(
      this.page.getByRole('button', { name: 'Hide Sidebar' })
    ).toBeVisible({ timeout: 5000 });
  }

  // ─── KB006: Wait for all 6 social integrations to reach completed status ─────

  async socialIntegrationsShouldComplete() {
    const expectedTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin'];
    let latestIntegrations = [];

    const onResponse = async (response) => {
      if (response.request().method() !== 'POST') return;
      if (!response.url().includes('graphql')) return;
      if (!(response.request().postData() ?? '').includes('avatarIntegrations')) return;
      try {
        const body = await response.json();
        const integrations = body?.data?.avatarIntegrations;
        if (Array.isArray(integrations)) latestIntegrations = integrations;
      } catch {}
    };

    this.page.on('response', onResponse);

    // Minimum posts each integration must have fetched before we consider it done.
    const minFetched = { youtube: 10, x: 100, linkedin: 30, default: 30 };
    const deadline = Date.now() + 600000;
    try {
      // Poll until every integration exits "pending" — even if one already completed
      // with an insufficient post count, keep waiting so the others aren't left pending
      // and blocking subsequent tests.
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(5000);

        const allSettled = expectedTypes.every(type => {
          const i = latestIntegrations.find(x => x.type === type);
          return i && i.status !== 'pending';
        });
        if (allSettled) break;
      }

      // All integrations have settled (or deadline was reached).
      // Collect every failure and throw once with the full picture.
      const failures = [];
      for (const type of expectedTypes) {
        const i = latestIntegrations.find(x => x.type === type);
        if (!i || i.status === 'pending') {
          failures.push(`  ${type}: ${i ? 'still pending' : 'not seen'} after 10 min`);
          continue;
        }
        if (i.status === 'failed') {
          failures.push(`  ${type}: status="failed"`);
          continue;
        }
        const min = minFetched[type] ?? minFetched.default;
        const fetched = i.metadata?.totalFetchedCount ?? 0;
        if (fetched < min) {
          failures.push(
            `  ${type}: completed with only ${fetched} posts (need>=${min})`
          );
        }
      }

      if (failures.length > 0) {
        throw new Error(`Integration validation failed:\n${failures.join('\n')}`);
      }
    } finally {
      this.page.off('response', onResponse);
    }
  }
}

module.exports = { KnowledgeBasePage };
