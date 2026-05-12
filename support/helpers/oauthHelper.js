/**
 * Completes a Google OAuth flow inside a popup (or redirected tab).
 * Handles both the "Choose an account" screen (when already signed in)
 * and the fresh email → Next → password → Next flow.
 *
 * @param {import('@playwright/test').Page} popup - The popup/page hosting the Google OAuth flow.
 */
async function completeGoogleOAuth(popup) {
  await popup.waitForLoadState('domcontentloaded');

  const email = process.env.GOOGLE_EMAIL || '';
  const knownAccount = popup.getByText(email);

  if (await knownAccount.isVisible({ timeout: 4000 }).catch(() => false)) {
    await knownAccount.click();
  } else {
    await popup.getByLabel(/email or phone/i).fill(email);
    await popup.getByRole('button', { name: /next/i }).click();
    await popup.waitForLoadState('domcontentloaded');
    // Google's password field: role=textbox avoids matching the "Show password" checkbox
    await popup.getByRole('textbox', { name: /password/i }).waitFor({ state: 'visible', timeout: 20000 });
    await popup.getByRole('textbox', { name: /password/i }).fill(process.env.GOOGLE_PASSWORD || '');
    await popup.getByRole('button', { name: /next/i }).click();
  }

  // Wait for OAuth to complete — popup closes or navigates away from Google
  await Promise.race([
    popup.waitForEvent('close'),
    popup.waitForURL(url => !url.includes('accounts.google.com'), { timeout: 20000 }),
  ]).catch(() => {});
}

module.exports = { completeGoogleOAuth };
