const { expect } = require('@playwright/test');
const { ensurePrimaryAvatar } = require('../helpers/avatarHelper');

class AudiencePage {
  constructor(page) {
    this.page = page;
    this._mockUser = null;
    this._audienceMockHandler = null;
  }

  async visit() {
    await ensurePrimaryAvatar(this.page);
    await this.page.goto('/audience');
    await this.page.waitForLoadState('load');

    await this.page.addLocatorHandler(
      this.page.getByRole('dialog').filter({ hasText: 'Avatar Quality' }),
      async () => {
        await this.page.mouse.click(10, 10);
        await this.page.waitForTimeout(300);
      }
    );

    await this._dismissOverlays();
  }

  async _dismissOverlays() {
    try {
      const qualityDialog = this.page.getByRole('dialog').filter({ hasText: 'Avatar Quality' });
      if (await qualityDialog.count() > 0) {
        await this.page.mouse.click(10, 10);
        await this.page.waitForTimeout(300);
      }
    } catch {}
    try {
      const btn = this.page.getByRole('button', { name: /avatar health/i });
      if (await btn.count() > 0 && (await btn.getAttribute('aria-expanded')) === 'true') {
        await btn.click();
        await this.page.waitForTimeout(300);
      }
    } catch {}
  }

  // ─── UI assertions ────────────────────────────────────────────────────────────

  async titleShouldBeVisible() {
    await expect(this.page.getByRole('heading', { name: 'Audience' })).toBeVisible({ timeout: 20000 });
  }

  async searchInputShouldBeVisible() {
    await expect(this.page.getByPlaceholder('Search')).toBeVisible({ timeout: 10000 });
  }

  async datePickerShouldBeVisible() {
    await expect(this.page.locator('button#date')).toBeVisible({ timeout: 10000 });
  }

  async columnsButtonShouldBeVisible() {
    await expect(this.page.getByRole('button', { name: /columns/i })).toBeVisible({ timeout: 10000 });
  }

  async exportCsvButtonShouldBeVisible() {
    await expect(this.page.getByRole('button', { name: /export csv/i })).toBeVisible({ timeout: 10000 });
  }

  async tableOrEmptyStateShouldBeVisible() {
    await expect(
      this.page.locator('table').first().or(this.page.getByText('No results found'))
    ).toBeVisible({ timeout: 20000 });
  }

  // ─── Search ───────────────────────────────────────────────────────────────────

  async searchAndPressEnter(term) {
    const input = this.page.getByPlaceholder('Search');
    await input.click();
    await input.fill(term);
    await input.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  async searchTagShouldBeVisible(term) {
    await expect(
      this.page.locator('span.inline-flex').filter({ hasText: term })
    ).toBeVisible({ timeout: 5000 });
  }

  async removeSearchTag() {
    await this.page.locator('span.inline-flex button[type="button"]').first().click();
    await this.page.waitForTimeout(700);
  }

  async searchTagShouldNotBeVisible() {
    await expect(
      this.page.locator('span.inline-flex button[type="button"]')
    ).not.toBeVisible({ timeout: 5000 });
  }

  async noResultsMessageShouldBeVisible() {
    await expect(this.page.getByText('No results found')).toBeVisible({ timeout: 8000 });
  }

  // ─── Date filter ─────────────────────────────────────────────────────────────

  async _openDatePickerAndSelectRange() {
    await this.page.locator('button#date').click();
    await this.page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first().waitFor({
      state: 'visible',
      timeout: 5000,
    });
    const days = this.page.locator('[role="gridcell"] button:not([disabled])');
    const count = await days.count();
    const endIndex = Math.min(count - 1, 9);
    await days.nth(0).click();
    await days.nth(endIndex).click();
  }

  async openDatePickerAndCancelWithoutApplying() {
    await this._openDatePickerAndSelectRange();
    await this.page.getByRole('button', { name: /^cancel$/i }).click();
    await this.page.locator('[data-radix-popper-content-wrapper]')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  async openDatePickerSelectAndApply() {
    await this._openDatePickerAndSelectRange();
    await this.page.getByRole('button', { name: /^apply$/i }).click();
    await this.page.locator('[data-radix-popper-content-wrapper]')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
  }

  async datePickerShouldShowSelectedRange() {
    // After Apply the button reflects the selected range, losing the muted-foreground class
    const btn = this.page.locator('button#date');
    await expect(btn).toBeVisible({ timeout: 5000 });
    await expect(btn).not.toHaveClass(/text-muted-foreground/, { timeout: 5000 });
  }

  // ─── Columns filter ──────────────────────────────────────────────────────────

  async _openColumnsDropdown() {
    await this.page.getByRole('button', { name: /columns/i }).click();
    await this.page.waitForTimeout(400);
  }

  async _closeColumnsDropdown() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  _dropdownCheckboxes() {
    return this.page
      .locator('[data-radix-popper-content-wrapper]')
      .last()
      .getByRole('checkbox');
  }

  async _dismissHealthPopperIfOpen() {
    const healthBtn = this.page.getByRole('button', { name: /avatar health/i });
    if (await healthBtn.count() > 0 && (await healthBtn.getAttribute('aria-expanded')) === 'true') {
      await healthBtn.click();
      await this.page.waitForTimeout(300);
      return true;
    }
    return false;
  }

  async _ensureColumnsDropdownOpen() {
    const firstCb = this._dropdownCheckboxes().first();
    const visible = await firstCb.isVisible({ timeout: 800 }).catch(() => false);
    if (!visible) {
      await this._openColumnsDropdown();
      await this._dropdownCheckboxes().first().waitFor({ state: 'visible', timeout: 5000 });
    }
  }

  async enableAllHiddenColumns() {
    await this._openColumnsDropdown();
    const checkboxes = this._dropdownCheckboxes();
    await checkboxes.first().waitFor({ state: 'visible', timeout: 5000 });
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const healthDismissed = await this._dismissHealthPopperIfOpen();
      if (healthDismissed) await this._ensureColumnsDropdownOpen();
      const cb = checkboxes.nth(i);
      if (!(await cb.isChecked())) {
        await cb.click();
        await this.page.waitForTimeout(100);
      }
    }
    await this._closeColumnsDropdown();
  }

  async allColumnHeadersShouldBeVisible() {
    const cols = ['Status', 'Name', 'Email', 'Country', 'Last Seen', 'Device', 'Browser', 'Created at'];
    for (const col of cols) {
      await expect(
        this.page.locator('th').filter({ hasText: col })
      ).toBeVisible({ timeout: 5000 });
    }
  }

  async disableAllColumns() {
    await this._openColumnsDropdown();
    const checkboxes = this._dropdownCheckboxes();
    await checkboxes.first().waitFor({ state: 'visible', timeout: 5000 });
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      const healthDismissed = await this._dismissHealthPopperIfOpen();
      if (healthDismissed) await this._ensureColumnsDropdownOpen();
      const cb = checkboxes.nth(i);
      if (await cb.isChecked()) {
        await cb.click();
        await this.page.waitForTimeout(100);
      }
    }
    await this._closeColumnsDropdown();
  }

  async noDataColumnHeadersShouldBeVisible() {
    const cols = ['Status', 'Name', 'Email', 'Country', 'Last Seen', 'Device', 'Browser', 'Created at'];
    for (const col of cols) {
      await expect(
        this.page.locator('th').filter({ hasText: col })
      ).not.toBeVisible({ timeout: 3000 });
    }
  }

  // ─── Export CSV ──────────────────────────────────────────────────────────────

  async _openExportCsvModal() {
    await this.page.getByRole('button', { name: /export csv/i }).click();
    await this.page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 5000 });
  }

  async clickExportCsvAndCancel() {
    await this._openExportCsvModal();
    await this.page.getByRole('button', { name: /^cancel$/i }).click();
    await this.page.getByRole('alertdialog').waitFor({ state: 'hidden', timeout: 5000 });
  }

  async clickExportCsvAndConfirm() {
    await this._openExportCsvModal();
    await this.page.getByRole('button', { name: /send to my email/i }).click();
  }

  async exportModalShouldClose() {
    await expect(this.page.getByRole('alertdialog')).not.toBeVisible({ timeout: 10000 });
  }

  // ─── Ban / Unban ─────────────────────────────────────────────────────────────

  async _openFirstRowActionMenu() {
    await this.page.getByRole('button', { name: /open menu/i }).first().click();
    await this.page.waitForTimeout(300);
  }

  async banFirstUser() {
    await this._openFirstRowActionMenu();
    await this.page.getByRole('menuitem', { name: /ban user/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async unbanFirstUser() {
    await this._openFirstRowActionMenu();
    await this.page.getByRole('menuitem', { name: /unban user/i }).click();
    await this.page.waitForTimeout(2000);
  }

  async firstRowStatusShouldShow(status) {
    const firstRow = this.page.locator('tbody tr:not([aria-hidden])').first();
    await expect(firstRow.getByText(status, { exact: true })).toBeVisible({ timeout: 8000 });
  }

  // ─── Mock API ────────────────────────────────────────────────────────────────

  async audienceMockedToReturnNewUser() {
    this._mockUser = {
      id: 'aud-mock-001',
      status: 'active',
      email: 'newsignup@autotest.com',
      displayName: 'Auto Test Signup',
      products: ['avatar-chat'],
      lastSeenCountry: null,
      lastSeenDevice: 'Desktop',
      lastSeenBrowser: 'Chrome',
      joinedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userReportedTags: [],
      userReportedTagsCount: 0,
    };

    this._audienceMockHandler = async (route) => {
      const req = route.request();
      if (req.method() === 'POST') {
        const body = req.postData() || '';
        if (body.includes('ListAudienceQuery')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: { listAudienceQuery: [this._mockUser] },
            }),
          });
          return;
        }
      }
      await route.continue();
    };

    await this.page.route('**', this._audienceMockHandler);
    await this.page.reload();
    await this.page.waitForLoadState('load');
    await this.page.waitForTimeout(2000);
  }

  async signedUpUserShouldBeListedInTable() {
    if (!this._mockUser) throw new Error('No mock user set');
    await expect(
      this.page.getByText(this._mockUser.email, { exact: false })
    ).toBeVisible({ timeout: 10000 });
    if (this._audienceMockHandler) {
      await this.page.unroute('**', this._audienceMockHandler);
      this._audienceMockHandler = null;
    }
  }
}

module.exports = { AudiencePage };
