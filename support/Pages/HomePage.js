const { expect } = require('@playwright/test');

// Matches all greeting variants the app can produce
const greetingPattern = /good (morning|afternoon|evening)|happy (weekend|[a-z']+)|bom dia|boa tarde|boa noite/i;

class HomePage {
  constructor(page) {
    this.page = page;
  }

  async visit() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async greetingShouldBeVisible() {
    await expect(this.page.getByText(greetingPattern).first()).toBeVisible({ timeout: 10000 });
  }

  async greetingShouldMatchTimeOfDay() {
    const now = new Date();
    const day = now.getDay();   // 0 = Sunday, 6 = Saturday
    const hour = now.getHours();

    // Determine expected greeting type using the app's getTimeType logic
    let expectedType;
    if (day === 0 || day === 6) {
      expectedType = 'weekend';
    } else if (hour >= 5 && hour < 12) {
      expectedType = 'morning';
    } else if (hour >= 12 && hour < 18) {
      expectedType = 'afternoon';
    } else {
      expectedType = 'night';
    }

    const greetingEl = this.page.getByText(greetingPattern).first();
    await expect(greetingEl).toBeVisible({ timeout: 10000 });
    const text = (await greetingEl.textContent() ?? '').toLowerCase();

    const matchPatterns = {
      morning:   /good morning/,
      afternoon: /good afternoon/,
      night:     /good evening/,
      weekend:   /happy weekend/,
    };

    expect(text, `Expected ${expectedType} greeting (day=${day}, hour=${hour})`).toMatch(matchPatterns[expectedType]);
  }

  async clickLevelUpCard(cardText) {
    await this.page.getByText(cardText, { exact: false }).first().click();
  }

  async urlShouldContain(fragment) {
    await expect(this.page).toHaveURL(new RegExp(fragment.replace(/[?=]/g, '\\$&')), { timeout: 10000 });
  }

  async metricsSectionShouldBeLoadedWithData() {
    // .recharts-surface is the SVG root that recharts renders — it only exists when
    // the AnalyticsChart component has non-empty data (returns null otherwise).
    // Visible here → data loaded, chart rendered, no error state.
    await expect(
      this.page.locator('.recharts-surface').first()
    ).toBeVisible({ timeout: 15000 });
  }
}

module.exports = { HomePage };
