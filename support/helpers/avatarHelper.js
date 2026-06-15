const PRIMARY_SLUG = (process.env.EU_URL || 'https://dev-avatar.arena.im/automation1arena').split('/').pop();
const MODERN_SLUG  = (process.env.MODERN_EU_URL || 'https://dev-avatar.arena.im/automation2arena').split('/').pop();

/**
 * Switches the dashboard to targetSlug.
 *
 * Strategy:
 *  1. Navigate to / so the dashboard fires the "current" API request.
 *  2. Read personalize.slug from the response — this is the authoritative
 *     source of which avatar is currently selected.
 *  3. If the slug already matches targetSlug, return immediately.
 *  4. Otherwise wait for the Switch Avatars dialog and click the target avatar.
 *
 * Special case: if the account is stuck on a "Lock in your Identity" onboarding
 * page (new unconfigured avatar), the sidebar switcher is unavailable. Click the
 * "Back" button to leave the onboarding flow, then retry the switcher logic.
 */
async function _ensureAvatar(page, targetSlug) {
  for (let attempt = 0; attempt < 5; attempt++) {
    // Register the listener BEFORE navigating so the response is never missed.
    const currentPromise = page.waitForResponse(
      res => /\/current\b/.test(res.url()) && res.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);

    await page.goto('/');
    await page.waitForLoadState('load');

    // If redirected to the "Lock in your Identity" handle-setup onboarding page,
    // try to exit it before using the avatar switcher.
    const isOnboarding = await page.locator('h1, h2').filter({ hasText: /Lock in your Identity/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (isOnboarding) {
      const urlBefore = page.url();
      const backBtn = page.getByRole('button', { name: 'Back' });
      if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await backBtn.click();
        await page.waitForLoadState('load').catch(() => {});
      } else {
        // Some versions only show "Lock It In". Click it and wait for URL change.
        const lockBtn = page.getByRole('button', { name: 'Lock It In' });
        if (await lockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await lockBtn.click();
          // Give the server up to 6s to navigate away; if URL doesn't change the
          // claim probably failed silently (handle already owned by this account).
          await page.waitForURL(url => url !== urlBefore, { timeout: 6000 }).catch(() => {});
        }
      }
      // If still on the identity page (URL unchanged or heading still visible),
      // force-navigate to a page that bypasses the redirect.
      const stillOnboarding = await page.locator('h1, h2')
        .filter({ hasText: /Lock in your Identity/i })
        .isVisible({ timeout: 2000 }).catch(() => false);
      if (stillOnboarding) {
        await page.goto('/avatar-management');
        await page.waitForLoadState('load').catch(() => {});
      }
      await page.waitForTimeout(1500);
      continue; // retry the loop
    }

    const currentRes = await currentPromise;
    let isAlreadyTarget = false;

    if (currentRes) {
      try {
        const json = await currentRes.json();
        // The active avatar's slug lives at personalize.slug in the current response
        const slug =
          json?.personalize?.slug ||
          json?.data?.personalize?.slug ||
          json?.avatar?.personalize?.slug ||
          null;
        if (slug !== null) {
          isAlreadyTarget = slug === targetSlug;
        }
      } catch { /* JSON parse failed — fall through to the switcher */ }
    }

    if (isAlreadyTarget) return;

    // Wrong avatar (or couldn't determine) — switch via the UI switcher.
    // If the sidebar is currently collapsed, reveal it so the switcher button is accessible.
    const showSidebarBtn = page.getByRole('button', { name: 'Show Sidebar' });
    if (await showSidebarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await showSidebarBtn.click();
      await page.waitForTimeout(500);
    }

    const switcherBtn = page.locator('[data-sidebar="menu-button"][aria-haspopup="menu"]');
    const visible = await switcherBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (!visible) continue; // sidebar still not showing switcher — retry whole flow

    await switcherBtn.click();
    const switchText = page.getByText('Switch Avatars');
    const menuVisible = await switchText.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    if (!menuVisible) {
      await page.keyboard.press('Escape');
      continue; // menu didn't open — retry
    }

    await switchText.click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);

    // Target avatar renders as a plain <div> (current) or <button> (non-current).
    // If it appears as a button, click it to switch.
    const targetBtn = dialog.getByRole('button').filter({ hasText: targetSlug });
    if (await targetBtn.count() > 0) {
      await targetBtn.first().click();
      // Wait for dialog to close, then domcontentloaded — networkidle hangs on SPA persistent connections.
      await dialog.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      // Dismiss the Avatar Health popper that can appear after a switch
      const popper = page.locator('[data-radix-popper-content-wrapper]');
      if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.mouse.click(720, 50);
        await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
      // Switch was clicked — loop once more to confirm the slug changed
      continue;
    } else {
      // Target is already current (shown as a div) — just close the dialog
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
      return;
    }
  }
}

async function ensurePrimaryAvatar(page) {
  return _ensureAvatar(page, PRIMARY_SLUG);
}

async function ensureModernAvatar(page) {
  return _ensureAvatar(page, MODERN_SLUG);
}

module.exports = { ensurePrimaryAvatar, ensureModernAvatar };
