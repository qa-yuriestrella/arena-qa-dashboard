const { expect } = require('@playwright/test');
const path = require('path');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');
const { KnowledgeBasePage } = require('./KnowledgeBasePage');
const { ProfileBuilderPage } = require('./ProfileBuilderPage');

const TEST_IMAGE_PATH = path.resolve(__dirname, '../fixtures/images/test-face.jpg');
const TEST_AUDIO_PATH = path.resolve(__dirname, '../fixtures/audios/test-audio.mp3');
const HC_ANIMATED_HEADSHOT_NAME = 'HC Progress Animated Headshot';

const ALL_ITEMS = [
  'Add your voice',
  'Animate a profile picture',
  'Add a headline to your profile',
  'Create a profile section',
  'Add a biography source',
  'Add social network sources',
];

class HealthCheckPage {
  constructor(page) {
    this.page = page;
  }

  // Suppresses the health check popover from auto-opening on every subsequent page load.
  // Called once at the start of HC004/HC005 operations so the popover never interferes
  // with form save buttons during cleanup and setup steps.
  async _suppressHealthPopper() {
    await this.page.addInitScript(() => {
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (key && key.startsWith('avatar-health-shown-')) return 'true';
        return orig.call(this, key);
      };
    });
  }

  // Used by HC002/HC003/HC004/HC005 — regular authenticated session
  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.waitForLoadState('networkidle');
  }

  // Used by HC001 — fresh context needs the primary avatar active before checking auto-open.
  // ensurePrimaryAvatar() may navigate to '/' multiple times (triggering the health panel
  // early), so we clear the shown-flag from localStorage afterwards so the panel will
  // auto-open again on the final goto('/').
  async visitFresh() {
    await ensurePrimaryAvatar(this.page);
    await this.page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('avatar-health-shown-')) localStorage.removeItem(key);
      });
    });
    await this.page.goto('/');
    await this.page.waitForLoadState('load');
  }

  // The percentage card in the sidebar acts as the toggle button for the panel.
  // It has "Avatar Health" as its accessible name (aria-label or text).
  _trigger() {
    return this.page.getByRole('button', { name: /avatar health/i });
  }

  _panelLocator() {
    return this.page.locator('[data-radix-popper-content-wrapper]');
  }

  async openPanel() {
    const btn = this._trigger();
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    const expanded = await btn.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await btn.click();
      await this.page.waitForTimeout(500);
    }
    await this._panelLocator().waitFor({ state: 'visible', timeout: 5000 });
  }

  async closePanel() {
    const btn = this._trigger();
    const expanded = await btn.getAttribute('aria-expanded').catch(() => null);
    if (expanded === 'true') {
      await btn.click();
      await this.page.waitForTimeout(400);
    }
  }

  // ─── HC001 assertions ─────────────────────────────────────────────────────

  async panelShouldBeAutoVisible() {
    // Health check should have opened on its own without user clicking
    await expect(this._panelLocator()).toBeVisible({ timeout: 10000 });
  }

  async panelShouldNotBeAutoVisible() {
    // After closing once, navigating back should NOT reopen the panel
    await this.page.waitForTimeout(2000);
    const btn = this._trigger();
    const expanded = await btn.getAttribute('aria-expanded').catch(() => 'false');
    expect(expanded, 'Health check panel should not auto-open on revisit').not.toBe('true');
  }

  async logoutAndLoginAgain() {
    // Open the sidebar user/avatar menu — same button ensurePrimaryAvatar uses
    const switcherBtn = this.page.locator('[data-sidebar="menu-button"][aria-haspopup="menu"]');
    const hasSwitcher = await switcherBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasSwitcher) {
      await switcherBtn.click();
    } else {
      // Fallback: last button in sidebar
      const sidebarBtn = this.page.locator('aside, nav').getByRole('button').last();
      if (await sidebarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sidebarBtn.click();
      }
    }
    await this.page.waitForTimeout(600);

    // Look for a logout/sign-out option in the opened menu
    const logoutLocator = this.page
      .getByRole('menuitem', { name: /log.?out|sign.?out/i })
      .or(this.page.getByRole('button', { name: /log.?out|sign.?out/i }))
      .or(this.page.getByRole('link', { name: /log.?out|sign.?out/i }));

    const menuItemVisible = await logoutLocator.first()
      .waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);

    if (menuItemVisible) {
      await logoutLocator.first().click();
    } else {
      // Evaluate-based fallback: click any element whose text matches logout patterns
      const clicked = await this.page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], button, a'));
        const el = candidates.find(e => /log.?out|sign.?out/i.test((e.textContent || '').trim()));
        if (el) { el.click(); return true; }
        return false;
      });
      if (!clicked) {
        await this.page.keyboard.press('Escape');
        // No logout UI found — log the available menu items for diagnosis
        console.warn('[HC001] Logout option not found in sidebar menu');
      }
    }

    // Wait for redirect to /login (or handle if the URL stays the same)
    await this.page.waitForURL(/\/login/, { timeout: 15000 }).catch(async () => {
      // May already be redirected to login or the app uses a different flow
      await this.page.goto('/login');
      await this.page.waitForLoadState('load');
    });

    await this.page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 10000 });
    await this.page.fill('[placeholder="Email"]', process.env.TEST_USER_EMAIL || '');
    await this.page.fill('[placeholder="Password"]', process.env.TEST_USER_PASSWORD || '');
    await this.page.locator('button[type="submit"]').click();
    await this.page.waitForURL(/^(?!.*\/login)/, { timeout: 15000 });
    await this.page.waitForLoadState('load');
  }

  // ─── HC002 — accordion ────────────────────────────────────────────────────

  _itemTrigger(itemName) {
    return this._panelLocator()
      .locator('button')
      .filter({ hasText: new RegExp(itemName, 'i') });
  }

  // Each item is a <button> inside a <div class="border-none"> wrapper.
  // When expanded, a content <div> appears as a sibling of the button INSIDE the wrapper.
  // When collapsed, the content div is removed from DOM entirely (count=0).
  _itemContent(itemName) {
    return this._panelLocator()
      .locator(`xpath=.//button[contains(., "${itemName}")]/following-sibling::div`);
  }

  async clickItem(itemName) {
    const trigger = this._itemTrigger(itemName);
    await trigger.waitFor({ state: 'visible', timeout: 5000 });
    // The panel opens with the first uncompleted item already expanded.
    // Clicking an already-expanded item would collapse it (toggle), so skip the click.
    const content = this._itemContent(itemName);
    if (!await content.isVisible({ timeout: 500 }).catch(() => false)) {
      await trigger.click();
      await this.page.waitForTimeout(600);
    }
  }

  async itemShouldBeExpanded(itemName) {
    // Try standard ARIA accordion pattern: trigger button gets aria-expanded="true" when open.
    const trigger = this._itemTrigger(itemName);
    const ariaExpanded = await trigger.getAttribute('aria-expanded', { timeout: 5000 }).catch(() => null);
    if (ariaExpanded === 'true') return;

    // Fallback: visible sibling content div (custom accordion without ARIA)
    const content = this._itemContent(itemName);
    if (await content.count() > 0) {
      const visible = await content.isVisible({ timeout: 5000 }).catch(() => false);
      if (visible) return;
    }

    // Neither pattern matched — log panel HTML to aid diagnosis, then fail
    const html = await this._panelLocator().innerHTML({ timeout: 2000 }).catch(() => '(panel gone)');
    throw new Error(`"${itemName}" did not expand. aria-expanded="${ariaExpanded}". Panel HTML:\n${html.substring(0, 3000)}`);
  }

  async allOtherItemsShouldBeCollapsed(openItemName) {
    for (const item of ALL_ITEMS) {
      if (item.toLowerCase() === openItemName.toLowerCase()) continue;
      const trigger = this._itemTrigger(item);
      if (await trigger.count() > 0) {
        // If the trigger has aria-expanded it must NOT be 'true'
        const expanded = await trigger.getAttribute('aria-expanded').catch(() => null);
        if (expanded !== null) {
          expect(expanded, `Item "${item}" should be collapsed`).not.toBe('true');
          continue;
        }
      }
      // Fallback: sibling content div must not be visible
      const content = this._itemContent(item);
      if (await content.count() > 0) {
        await expect(content).not.toBeVisible({ timeout: 3000 });
      }
    }
  }

  // ─── HC003 — action button navigation ────────────────────────────────────

  async openItemAndClickActionButton(itemName) {
    const startUrl = this.page.url();

    // If the content is already visible (item already open), skip the trigger click.
    // Clicking an open trigger would close it, hiding the action button.
    const content = this._itemContent(itemName);
    const isAlreadyOpen = await content.isVisible({ timeout: 500 }).catch(() => false);

    if (!isAlreadyOpen) {
      await this.clickItem(itemName);

      // Completed items (✅) navigate directly when clicked.
      // Uncompleted items (○) open an accordion — navigation comes from the action link inside content.
      // Some items have a delayed navigation (animated accordion before link appears), hence 4500ms.
      const navigatedDirectly = await this.page.waitForURL(
        url => url.href !== startUrl, { timeout: 4500 }
      ).then(() => true).catch(() => false);

      if (navigatedDirectly) {
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        return;
      }

      // No direct navigation — accordion content appeared.
      await this.page.waitForTimeout(600);
    }

    // Content is open (either was already open or just opened) — click the action element.
    try {
      const actionElement = content.locator('a, button, [role="button"], [role="link"]').first();
      if (await actionElement.count() > 0) {
        await actionElement.click({ timeout: 5000 });
        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      }
    } catch {
      // Page navigated (delayed full-page reload) during accordion interaction — wait for it to settle
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    }
  }

  async urlShouldContain(...fragments) {
    const url = this.page.url();
    for (const fragment of fragments) {
      expect(url, `Expected URL to contain "${fragment}" but got "${url}"`).toContain(fragment);
    }
  }

  // Asserts the voice clone drawer is open after clicking "Add your voice" action button.
  // The voice clone panel renders as a fixed right-side drawer (.fixed.right-0) containing
  // audio-specific UI that cannot appear in the health check panel or elsewhere on the page.
  async voiceCloneModalShouldBeOpen() {
    const drawer = this.page.locator('.fixed.right-0').filter({
      hasText: /voice.*clone|add.*voice|upload.*file|record.*audio/i,
    }).first();
    await expect(drawer).toBeVisible({ timeout: 8000 });
  }

  // Asserts the biography integration panel is open after clicking "Add a biography source" action button.
  // The panel renders as a fixed right-side drawer (.fixed.right-0) containing #bio-description,
  // which is specific to the biography form and cannot appear anywhere else on the page.
  async biographyModalShouldBeOpen() {
    const drawer = this.page.locator('.fixed.right-0').filter({
      has: this.page.locator('#bio-description'),
    }).first();
    await expect(drawer).toBeVisible({ timeout: 8000 });
  }

  async returnToDashboardAndOpenPanel() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    await this.openPanel();
  }

  // ─── HC004/HC005 — progress bar ───────────────────────────────────────────

  // Reads the numeric percentage from the health widget.
  //
  // The widget renders with a cached/stale value immediately on page load, then
  // updates in-place once the API responds (typically 5-15 s after load).
  // Strategy: load the dashboard once, then poll the widget every 2 s on the
  // SAME page until the value has been stable for 5 consecutive reads (≥ 10 s of
  // stability).  Reloading the page between reads would always show the stale
  // cached value again and never converge on the real one.
  async getPercentage() {
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.goto('/');
      await this.page.waitForLoadState('load');
      await this.page.waitForTimeout(4000); // let initial render complete

      const btn = this._trigger();
      const visible = await btn.waitFor({ state: 'visible', timeout: 12000 })
        .then(() => true).catch(() => false);
      if (!visible) {
        await this.page.waitForTimeout(6000);
        continue;
      }

      // Poll every 2 s for up to 40 s, waiting for 5 consecutive matching reads (10 s stable)
      let lastScore = -1;
      let stableCount = 0;
      for (let poll = 0; poll < 20; poll++) {
        const text = await btn.innerText().catch(() => '');
        const match = text.match(/^(\d+)/);
        if (match) {
          const s = parseInt(match[1], 10);
          if (s === lastScore) {
            stableCount++;
            if (stableCount >= 5) return s;
          } else {
            lastScore = s;
            stableCount = 1;
          }
        }
        await this.page.waitForTimeout(2000);
      }
      // Score never stabilised on this page load — try a fresh load
      await this.page.waitForTimeout(5000);
    }
    // Last resort: return whatever is currently showing
    const btn = this._trigger();
    if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = await btn.innerText().catch(() => '');
      const match = text.match(/^(\d+)/);
      if (match) return parseInt(match[1], 10);
    }
    throw new Error('Could not read a stable health check percentage after multiple attempts');
  }

  // Zeroes the controllable health check items (headline, sections, biography).
  // After cleanup, visits KB and waits for all canvas nodes to finish loading so
  // that any auto-restoring nodes (voice-clone, instagram) are fully stable before
  // getPercentage() captures the baseline.
  async resetControllableItems() {
    // Ensure the primary avatar (automation1arena) is active before doing any cleanup.
    // Previous test runs may have left a different avatar active.
    await ensurePrimaryAvatar(this.page);
    await this._clearHeadline();
    await this._deleteAllSections();
    await this._deleteBiographyIntegration();
    await this._deleteSocialIntegration();
    await this._deleteVoiceClone();
    await this._deleteAnimatedHeadshot();
    // Visit KB so any auto-restoring canvas nodes (voice, instagram) finish loading
    // before getPercentage() captures the baseline.  Use a short node wait —
    // if the canvas is empty, we proceed after 5 s rather than blocking longer.
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.page.waitForTimeout(2000);
  }

  async addSocialIntegration() {
    await this._addSocialIntegration();
  }

  async removeSocialIntegration() {
    await this._deleteSocialIntegration();
  }

  async addVoiceClone() {
    await this._addVoiceClone();
  }

  async removeVoiceClone() {
    await this._deleteVoiceClone();
  }

  async generateAnimatedHeadshot() {
    await this._generateAnimatedHeadshot();
  }

  async removeAnimatedHeadshot() {
    await this._deleteAnimatedHeadshot();
  }

  async addHeadline() {
    await this._addHeadline();
  }

  async createSection() {
    await this._createSection();
  }

  async addBiography() {
    await this._addBiography();
  }

  async removeBiography() {
    await this._deleteBiographyIntegration();
  }

  async removeAllSections() {
    await this._deleteAllSections();
  }

  async removeHeadline() {
    await this._clearHeadline();
  }

  // ─── Private helpers — dismiss health check panel when navigating ─────────

  async _dismissHealthPanel() {
    const popper = this.page.locator('[data-radix-popper-content-wrapper]');
    if (await popper.isVisible({ timeout: 2000 }).catch(() => false)) {
      const trigger = this.page.locator('button').filter({ hasText: /Avatar Health/i }).first();
      if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
        await trigger.click({ force: true });
      } else {
        await this.page.mouse.click(720, 50);
      }
      await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(async () => {
        await this.page.mouse.click(720, 300);
        await popper.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      });
    }
  }

  // ─── Private helpers — item management ───────────────────────────────────

  async _clearHeadline() {
    await this.page.goto('/profile-builder');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    const bio = this.page.locator('#bio');
    await bio.waitFor({ state: 'visible', timeout: 15000 });
    const current = await bio.inputValue();
    if (!current) return;
    await bio.fill('');
    // Wait for the save button to become enabled (form dirty) before clicking
    const saveBtn = this.page.getByRole('button', { name: /^save$/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 8000 }).catch(() => {});
    await saveBtn.click();
    await this.page.waitForTimeout(5000); // give health score time to recalculate
  }

  async _addHeadline() {
    await this.page.goto('/profile-builder');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    const bio = this.page.locator('#bio');
    await bio.waitFor({ state: 'visible', timeout: 15000 });
    await bio.fill('Automation headline for health check progress test');
    // Wait for the save button to become enabled (form dirty) before clicking
    const saveBtn = this.page.getByRole('button', { name: /^save$/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 8000 }).catch(() => {});
    await saveBtn.click();
    await this.page.waitForTimeout(5000); // give health score time to recalculate
  }

  async _deleteAllSections() {
    await this.page.goto('/sections');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();

    // Wait for the Add Section button to confirm the page is ready
    await this.page.getByRole('button', { name: /add section/i }).first()
      .waitFor({ state: 'visible', timeout: 30000 });
    // Extra wait for section list to finish rendering
    await this.page.waitForTimeout(2000);

    // Section cards have a draggable container (cursor-move). Find all cards and
    // delete each one via its options button (last button in the card).
    for (let i = 0; i < 30; i++) {
      // Re-query each iteration so we always have the current live list
      const cards = this.page.locator('[class*="cursor-move"]');
      const cardCount = await cards.count();
      if (cardCount === 0) break;

      const card = cards.first();
      if (!await card.isVisible({ timeout: 3000 }).catch(() => false)) break;

      const optionsBtn = card.getByRole('button').last();
      const clicked = await optionsBtn.click({ timeout: 5000 }).then(() => true).catch(() => false);
      if (!clicked) break;

      const deleteOption = this.page.getByRole('button', { name: 'Delete Section' });
      const menuFound = await deleteOption.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
      if (!menuFound) { await this.page.keyboard.press('Escape'); break; }
      await deleteOption.click();

      const confirmBtn = this.page.getByRole('button', { name: /^delete$|^confirm/i }).first();
      if (await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
        await confirmBtn.click();
      }
      await card.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    }
  }

  async _createSection() {
    await this.page.goto('/sections');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();

    await this.page.getByRole('button', { name: /add section/i }).first().click();

    // Type selector — choose URL/Media
    const typeDialog = this.page.getByRole('dialog').filter({ hasText: /choose section type/i });
    await typeDialog.waitFor({ state: 'visible', timeout: 10000 });
    await typeDialog.getByText(/url.*media/i).first().click();

    // Section editor opens on the URL tab.
    // A URL/Media section requires at least one URL card before Save is enabled.
    const urlInput = this.page.getByPlaceholder('Enter an URL')
      .or(this.page.locator('input[type="url"]')).first();
    await urlInput.waitFor({ state: 'visible', timeout: 10000 });
    await urlInput.fill('https://arena.im');
    await this.page.getByRole('button', { name: /^add$/i }).first().click();
    await this.page.waitForTimeout(2000); // wait for card to appear

    // Save is now enabled
    const editor = this.page.getByRole('dialog').filter({ hasText: /visual/i }).first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });
    const saveBtn = editor.getByRole('button', { name: /^save$/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 10000 });
    await saveBtn.click();
    await editor.waitFor({ state: 'hidden', timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async _deleteAllKBIntegrations() {
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    // Health panel popover intercepts pointer events over the canvas — must dismiss first
    await this._dismissHealthPanel();
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);

    const nodeTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin',
                       'website', 'text', 'biography', 'reddit', 'voice-clone'];
    let hasAny = false;
    for (const t of nodeTypes) {
      if (await this.page.locator(`.react-flow__node-${t}`).first()
          .isVisible({ timeout: 1000 }).catch(() => false)) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) return;

    const pane = this.page.locator('.react-flow__pane');
    const bounds = await pane.boundingBox().catch(() => null);
    if (!bounds) return;

    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.mouse.move(bounds.x + 5, bounds.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(bounds.x + bounds.width - 5, bounds.y + bounds.height - 5, { steps: 20 });
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);

    const deleteAllBtn = this.page.getByRole('button', { name: 'Delete all' });
    if (!await deleteAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) return;
    await deleteAllBtn.click();
    const confirmBtn = this.page.getByRole('alertdialog').getByRole('button', { name: 'Delete all' });
    await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
    await confirmBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async _addBiography() {
    await ensurePrimaryAvatar(this.page);
    // Delegate page setup to KnowledgeBasePage.visit() which correctly initialises the KB
    // canvas, dismisses overlays (including the skills drawer that collapses the toolbar),
    // and leaves the page in a state where the "More" button is accessible.
    const kbPage = new KnowledgeBasePage(this.page);
    await kbPage.visit();
    await kbPage.openAddMoreMenu();
    await kbPage.clickPlatformButton('Biography');
    await kbPage._submitBiographyIntegration(
      'Health Check Test Profile',
      'Automated test biography created during health check progress bar testing.'
    );
    await this.page.waitForTimeout(3000);
  }

  async _deleteBiographyIntegration() {
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);

    const biographyNode = this.page.locator('.react-flow__node-biography').first();
    if (!await biographyNode.isVisible({ timeout: 3000 }).catch(() => false)) return;

    // React-flow positions nodes with CSS transforms — the node may be outside the
    // physical browser viewport even though it's "visible" in the DOM.
    // Click "Fit view" to pan/zoom the canvas so all nodes are within the visible area.
    const fitViewBtn = this.page.getByRole('button', { name: 'Fit view' });
    if (await fitViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fitViewBtn.click();
      await this.page.waitForTimeout(700);
    }

    // The KB source toolbar (fixed, z-40) sits at left-[280px] and intercepts pointer
    // events over the canvas.  Use force:true to bypass the overlay for hover and click.
    await biographyNode.hover({ force: true });
    const deleteBtn = biographyNode.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click({ force: true });
    } else {
      // Fallback: open config modal and delete from there
      await biographyNode.click({ force: true });
      await this.page.getByRole('button', { name: /delete/i }).first().click();
    }

    // Confirm deletion
    const confirmBtn = this.page.getByRole('alertdialog').getByRole('button', { name: /delete/i }).first();
    if (await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
      await confirmBtn.click();
    }
    await biographyNode.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  // ─── Private helpers — social network integration ────────────────────────────

  async _addSocialIntegration() {
    const kbPage = new KnowledgeBasePage(this.page);
    await kbPage.visit();

    // Listen for avatarIntegrations GraphQL responses BEFORE clicking so no
    // completion event is missed while the modal is open or closing.
    let latestIntegrations = [];
    const onResponse = async (response) => {
      if (response.request().method() !== 'POST') return;
      if (!response.url().includes('graphql')) return;
      if (!(response.request().postData() ?? '').includes('avatarIntegrations')) return;
      try {
        const body = await response.json();
        const list = body?.data?.avatarIntegrations;
        if (Array.isArray(list)) latestIntegrations = list;
      } catch {}
    };
    this.page.on('response', onResponse);

    try {
      // In text mode (first KB visit) the button carries its label.
      // In icon mode (subsequent visits) the toolbar collapses to icons only — no
      // text, aria-label or title — so getByRole fails.  Fall back to the same
      // positional evaluate used by openAddMoreMenu(): toolbar order is
      // Youtube › X › Instagram › Facebook › TikTok › URL › Shopify › More › Skills,
      // therefore Instagram sits 6 positions before Skills in DOM order.
      const textBtn = this.page.getByRole('button', { name: 'Instagram' });
      if (await textBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textBtn.click();
      } else {
        const clicked = await this.page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('button'));
          const skillsIdx = all.findIndex(b => (b.textContent || '').trim() === 'Skills');
          if (skillsIdx >= 6) { all[skillsIdx - 6].click(); return true; }
          return false;
        });
        if (!clicked) throw new Error('Could not find Instagram button in KB toolbar (text or icon mode)');
      }

      await kbPage.enterIntegrationUrl('https://www.instagram.com/guimaturana/');
      await kbPage.submitIntegration();
      await kbPage.integrationModalShouldBeClosed();

      // Wait for the Instagram integration to reach completed status.
      // The health check score is only updated once the integration is fully processed.
      const deadline = Date.now() + 300000; // 5 minutes
      while (Date.now() < deadline) {
        await this.page.waitForTimeout(5000);
        const ig = latestIntegrations.find(x => x.type === 'instagram');
        if (ig?.status === 'failed') throw new Error('Instagram integration reached failed status');
        if (ig?.status === 'completed') break;
      }
      const ig = latestIntegrations.find(x => x.type === 'instagram');
      if (ig?.status !== 'completed') {
        throw new Error(
          `Instagram integration did not complete within 5 minutes (status: ${ig?.status ?? 'not yet seen'})`
        );
      }
    } finally {
      this.page.off('response', onResponse);
    }
  }

  // Deletes every social/source integration node except biography and voice-clone,
  // which are tracked as separate health check items and reset independently.
  // Uses drag-select + "Delete all" — the same reliable pattern as
  // KnowledgeBasePage.bulkDeleteAllIntegrations() — so nodes off-screen or
  // behind the KB toolbar overlay are included in the selection.
  async _deleteSocialIntegration() {
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);

    const fitViewBtn = this.page.getByRole('button', { name: 'Fit view' });
    if (await fitViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fitViewBtn.click();
      await this.page.waitForTimeout(1000);
    }

    const socialTypes = ['youtube', 'x', 'instagram', 'facebook', 'tiktok', 'linkedin',
                         'website', 'text', 'reddit'];
    let hasAny = false;
    for (const t of socialTypes) {
      if (await this.page.locator(`.react-flow__node-${t}`).first()
          .isVisible({ timeout: 1000 }).catch(() => false)) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) return;

    const pane = this.page.locator('.react-flow__pane');
    const bounds = await pane.boundingBox().catch(() => null);
    if (!bounds) return;

    // Escape clears any active selection or focused node so the drag is treated
    // as a rubber-band selection rather than a node-move interaction.
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(200);
    await this.page.mouse.move(bounds.x + 5, bounds.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(
      bounds.x + bounds.width - 5,
      bounds.y + bounds.height - 5,
      { steps: 20 }
    );
    await this.page.mouse.up();
    await this.page.waitForTimeout(500);

    const deleteAllBtn = this.page.getByRole('button', { name: 'Delete all' });
    if (await deleteAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteAllBtn.click();
      const confirmBtn = this.page.getByRole('alertdialog')
        .getByRole('button', { name: 'Delete all' });
      await confirmBtn.waitFor({ state: 'visible', timeout: 5000 });
      await confirmBtn.click();
      await this.page.waitForTimeout(2000);
      return;
    }

    // "Delete all" only appears when 2+ nodes are selected.
    // With a single integration, fall back to per-card deletion.
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);

    for (const t of socialTypes) {
      const node = this.page.locator(`.react-flow__node-${t}`).first();
      if (!await node.isVisible({ timeout: 1000 }).catch(() => false)) continue;

      await this.page.locator('.react-flow__pane').first().click({ force: true });
      await this.page.waitForTimeout(300);
      await node.click({ force: true });
      const deleteBtn = this.page.locator('button[aria-label="Delete"]');
      if (!await deleteBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
        // Fallback: try hovering to reveal the toolbar
        await node.hover({ force: true });
        await this.page.waitForTimeout(500);
      }
      await deleteBtn.click();
      const confirmNodeBtn = this.page.getByRole('alertdialog')
        .getByRole('button', { name: /^delete$/i }).first();
      if (await confirmNodeBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
        await confirmNodeBtn.click();
      }
      await node.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }

  // ─── Private helpers — voice clone ───────────────────────────────────────────

  // Uploads an audio file via the KB Voice Call skill to create a voice-clone node.
  async _addVoiceClone() {
    const kbPage = new KnowledgeBasePage(this.page);
    await kbPage.visit();
    await kbPage.clickSkillsButton();
    await kbPage.clickSkillInPopover('Voice Call');
    await kbPage.voiceCallSkillDrawerShouldBeVisible();
    await kbPage.uploadVoiceAudioFile();
    await kbPage.enableVoiceCallSkill();
    await this.page.waitForTimeout(3000);
  }

  async _deleteVoiceClone() {
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('load');
    await this._dismissHealthPanel();
    await this.page.locator('.react-flow__node').first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => null);

    const fitViewBtn = this.page.getByRole('button', { name: 'Fit view' });
    if (await fitViewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fitViewBtn.click();
      await this.page.waitForTimeout(700);
    }

    const voiceCloneNode = this.page.locator('.react-flow__node-voice-clone').first();
    if (!await voiceCloneNode.isVisible({ timeout: 3000 }).catch(() => false)) return;

    await voiceCloneNode.hover({ force: true });
    const deleteBtn = voiceCloneNode.getByRole('button', { name: /delete/i }).first();
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click({ force: true });
    } else {
      await voiceCloneNode.click({ force: true });
      await this.page.locator('button[aria-label="Delete"]')
        .waitFor({ state: 'visible', timeout: 5000 });
      await this.page.locator('button[aria-label="Delete"]').click();
    }

    const confirmBtn = this.page.getByRole('alertdialog')
      .getByRole('button', { name: /delete/i }).first();
    if (await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) {
      await confirmBtn.click();
    }
    await voiceCloneNode.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    await this.page.waitForTimeout(1000);
  }

  // ─── Private helpers — animated headshot ─────────────────────────────────────

  async _generateAnimatedHeadshot() {
    const pbPage = new ProfileBuilderPage(this.page);
    await pbPage.visitHeadshot();
    await pbPage.clickAddNew();
    await pbPage.selectAnimatedType();
    await pbPage.fillHeadshotName(HC_ANIMATED_HEADSHOT_NAME);
    await pbPage.uploadHeadshotImage();
    await pbPage.headshotCropDialogShouldAppear();
    await pbPage.saveHeadshotCrop();
    await pbPage.saveAnimatedToGallery();
    await pbPage.animatedHeadshotShouldCompleteInGallery(HC_ANIMATED_HEADSHOT_NAME);
    await this.page.waitForTimeout(3000);
  }

  async _deleteAnimatedHeadshot() {
    const pbPage = new ProfileBuilderPage(this.page);
    await pbPage.visitHeadshot();
    await pbPage.cleanupTestHeadshots(HC_ANIMATED_HEADSHOT_NAME);
    await this.page.waitForTimeout(1000);
  }
}

module.exports = { HealthCheckPage };
