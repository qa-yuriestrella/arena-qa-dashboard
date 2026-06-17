/**
 * Generates storageState auth files for social login providers.
 * Run ONCE before executing social login tests, and again when sessions expire.
 *
 * Usage:
 *   node tests/setup/generate-social-auth.js google     # EU Classic – Google session
 *   node tests/setup/generate-social-auth.js facebook   # EU Classic – Facebook session
 *   node tests/setup/generate-social-auth.js x          # EU Classic – X session
 *   node tests/setup/generate-social-auth.js admin      # Admin dashboard – Google session
 *   node tests/setup/generate-social-auth.js all        # All providers
 *
 * Auth files are saved to .auth/ (gitignored).
 * If Google/Facebook/X show a verification prompt, complete it manually in the
 * browser window — the script waits up to 2 minutes for all popups to close.
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { EndUserPage } = require('../../support/Pages/EndUserPage');
const { LoginPage } = require('../../support/Pages/LoginPage');

const BASE_URL       = process.env.BASE_URL       || 'https://stg-dash-avatar.arena.im';
const MODERN_EU_URL  = process.env.MODERN_EU_URL  || 'https://dev-avatar.arena.im/automation2arena';
const AUTH_DIR       = path.resolve(__dirname, '../../.auth');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// Waits for every popup opened during the OAuth flow to close (handles nested popups like X → Google).
// Resolves only after at least one popup opened AND all popups closed.
function waitForAllPopupsToClose(context, { firstPopupTimeout = 20_000, allClosedTimeout = 120_000 } = {}) {
  return new Promise(resolve => {
    const openPopups = new Set();
    let seenAtLeastOne = false;
    let done = false;

    const finish = () => { if (!done) { done = true; resolve(); } };

    const checkDone = () => { if (seenAtLeastOne && openPopups.size === 0) finish(); };

    // If no popup opens within firstPopupTimeout, proceed anyway
    const firstTimer = setTimeout(() => {
      if (!seenAtLeastOne) { console.warn('No popup detected — proceeding.'); finish(); }
    }, firstPopupTimeout);

    context.on('page', popup => {
      clearTimeout(firstTimer);
      seenAtLeastOne = true;
      openPopups.add(popup);
      popup.on('close', () => { openPopups.delete(popup); checkDone(); });
    });

    // Hard timeout fallback
    setTimeout(() => { console.warn('Popup close timeout — proceeding anyway.'); finish(); }, allClosedTimeout);
  });
}

// ─── EU helpers ───────────────────────────────────────────────────────────────

async function generateEUSocial(label, menuItemName, euUrl = null) {
  // Persistent profile so Google/Facebook/X sessions survive between runs.
  // First run: log in manually in the browser. Subsequent runs: already logged in.
  const profileDir = path.join(AUTH_DIR, 'chrome-profiles', label);
  fs.mkdirSync(profileDir, { recursive: true });

  console.log(`\n[${label}] Launching Chrome with persistent profile...`);
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    slowMo: 400,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  // Register popup tracker before any page action
  const popupsClosedPromise = waitForAllPopupsToClose(context);

  const page   = await context.newPage();
  const euPage = new EndUserPage(page, euUrl);

  await euPage.visit();
  await euPage.clickProfileButton();

  console.log(`[${label}] Opening OAuth popup — if Google/Facebook/X asks for login, complete it in the browser...`);
  if (euUrl) {
    // Modern EU: button inside the "Welcome back" dialog (no iframe)
    await page.getByRole('dialog', { name: /welcome back/i })
      .getByRole('button', { name: menuItemName }).click();
  } else {
    // Classic EU: menuitem inside auth iframe
    await euPage._authFrame().getByRole('menuitem', { name: menuItemName }).click();
  }

  await popupsClosedPromise;

  // Wait for Arena to finish the session transfer (pending-session-transfer disappears when auth completes)
  console.log(`[${label}] Waiting for Arena session to be established...`);
  await page.waitForFunction(
    () => !localStorage.getItem('arena-avatar-chat:pending-session-transfer'),
    { timeout: 60_000 }
  ).catch(() => console.warn(`[${label}] Session transfer timed out — saving state anyway.`));

  await page.waitForTimeout(2000);

  const authFile = path.join(AUTH_DIR, `${label}.json`);
  await context.storageState({ path: authFile });
  console.log(`[${label}] Saved: ${authFile}`);
  await context.close();
}

const generateGoogleEU        = () => generateEUSocial('google-eu',        /continue with google/i);
const generateGoogleModernEU  = () => generateEUSocial('google-eu-modern',  /continue with google/i, MODERN_EU_URL);
const generateFacebookEU      = () => generateEUSocial('facebook-eu',       /continue with facebook/i);
const generateXEU             = () => generateEUSocial('x-eu',              /continue with x/i);

// ─── Admin Google ──────────────────────────────────────────────────────────────

async function generateAdminGoogle() {
  const label = 'google-admin';
  console.log(`\n[${label}] Launching headed browser...`);
  const profileDir = path.join(AUTH_DIR, 'chrome-profiles', label);
  fs.mkdirSync(profileDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    slowMo: 400,
    args: ['--disable-blink-features=AutomationControlled'],
    baseURL: BASE_URL,
  });

  const popupsClosedPromise = waitForAllPopupsToClose(context);

  const page    = await context.newPage();
  const loginPg = new LoginPage(page);

  await loginPg.visit();

  console.log(`[${label}] Opening Google OAuth popup — if Google asks for login, complete it in the browser...`);
  await page.getByRole('button', { name: /google/i }).click();

  await popupsClosedPromise;

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 60_000 })
    .catch(() => console.warn(`[${label}] Dashboard redirect not detected — saving state anyway.`));

  await page.waitForTimeout(2000);

  const authFile = path.join(AUTH_DIR, `${label}.json`);
  await context.storageState({ path: authFile });
  console.log(`[${label}] Saved: ${authFile}`);
  await context.close();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const [,, target = 'all'] = process.argv;

  const runners = {
    google:         generateGoogleEU,
    'google-modern': generateGoogleModernEU,
    facebook:       generateFacebookEU,
    x:              generateXEU,
    admin:          generateAdminGoogle,
  };

  const targets = target === 'all' ? Object.keys(runners) : [target];

  for (const t of targets) {
    if (!runners[t]) {
      console.error(`Unknown target: "${t}". Valid: ${Object.keys(runners).join(' | ')} | all`);
      process.exitCode = 1;
      continue;
    }
    try {
      await runners[t]();
    } catch (err) {
      console.error(`[${t}] Failed: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main();
