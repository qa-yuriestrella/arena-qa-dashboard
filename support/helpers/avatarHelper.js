const PRIMARY_SLUG = (process.env.EU_URL || 'https://dev-avatar.arena.im/arena-automation').split('/').pop();

/**
 * Ensures the Arena Automation avatar is active before running a test.
 *
 * Strategy:
 *  1. Navigate to / so the dashboard fires the "current" API request.
 *  2. Read personalize.slug from the response — this is the authoritative
 *     source of which avatar is currently selected.
 *  3. If the slug already matches arena-automation, return immediately.
 *  4. Otherwise wait for the Switch Avatars dialog and click the primary avatar.
 */
async function ensurePrimaryAvatar(page) {
  // Register the listener BEFORE navigating so the response is never missed.
  const currentPromise = page.waitForResponse(
    res => /\/current\b/.test(res.url()) && res.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  await page.goto('/');
  await page.waitForLoadState('load');

  const currentRes = await currentPromise;
  let isAlreadyPrimary = false;

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
        isAlreadyPrimary = slug === PRIMARY_SLUG;
      }
    } catch { /* JSON parse failed — fall through to the switcher */ }
  }

  if (isAlreadyPrimary) return;

  // Wrong avatar (or couldn't determine) — switch via the UI switcher
  const switcherBtn = page.locator('[data-sidebar="menu-button"][aria-haspopup="menu"]');
  const visible = await switcherBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (!visible) return;

  await switcherBtn.click();
  const switchText = page.getByText('Switch Avatars');
  const menuVisible = await switchText.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (!menuVisible) {
    await page.keyboard.press('Escape');
    return;
  }

  await switchText.click();
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 8000 }).catch(() => null);

  // Primary avatar renders as a plain <div> (current) or <button> (non-current).
  // If it appears as a button, click it to switch.
  const primaryBtn = dialog.getByRole('button').filter({ hasText: PRIMARY_SLUG });
  if (await primaryBtn.count() > 0) {
    await primaryBtn.first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Dismiss the Avatar Health popper that can appear after a switch
    const popper = page.locator('[data-radix-popper-content-wrapper]');
    if (await popper.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.mouse.click(720, 50);
      await popper.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  } else {
    // Primary is already current (shown as a div) — just close the dialog
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  }
}

module.exports = { ensurePrimaryAvatar };
