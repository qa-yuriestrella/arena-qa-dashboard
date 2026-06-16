/**
 * Diagnostic: inspect NETWORK REQUESTS during voice audio upload.
 * Runs without any init script modifications — tests native filechooser interception.
 */
require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const BASE_URL   = process.env.BASE_URL || 'https://stg-dash-avatar.arena.im';
const EMAIL      = process.env.TEST_USER_EMAIL || '';
const PASSWORD   = process.env.TEST_USER_PASSWORD || '';
// Try the ORIGINAL audio (16s, real audio at 78kbps)
const AUDIO_PATH = path.resolve(__dirname, '../support/fixtures/audios/test-audio.mp3');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext({ baseURL: BASE_URL });
  const page = await ctx.newPage();

  // Log ALL requests
  const allRequests = [];
  page.on('request', req => {
    allRequests.push({ method: req.method(), url: req.url() });
    if (/upload|audio|voice|clone|supabase/i.test(req.url())) {
      console.log('  [REQ]', req.method(), req.url().slice(0, 200));
    }
  });
  page.on('response', async res => {
    if (/upload|audio|voice|clone|supabase/i.test(res.url())) {
      const body = await res.text().catch(() => '');
      console.log('  [RES]', res.status(), res.url().slice(0, 150), '|', body.slice(0, 150));
    }
  });

  page.on('console', msg => {
    const t = msg.text();
    if (!t.includes('Download the React DevTools')) {
      console.log('  [console]', t.slice(0, 120));
    }
  });
  page.on('pageerror', err => console.log('  [pageerror]', err.message.slice(0, 120)));

  // Login
  await page.goto('/login');
  await page.waitForSelector('[placeholder="Email"]', { state: 'visible', timeout: 30000 });
  await page.fill('[placeholder="Email"]', EMAIL);
  await page.fill('[placeholder="Password"]', PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 20000 });
  console.log('Logged in. URL:', page.url());

  // Navigate to KB
  await page.goto('/knowledge-base');
  await page.waitForLoadState('load');

  // Handle Lock It In
  const lockItIn = page.getByRole('button', { name: 'Lock It In' });
  if (await lockItIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lockItIn.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    await page.goto('/knowledge-base');
    await page.waitForLoadState('load');
  }

  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('KB loaded. URL:', page.url());

  // Log React root
  const reactRootInfo = await page.evaluate(() => {
    const body = document.body;
    return {
      bodyChildren: [...body.children].map(el => `${el.tagName}#${el.id}.${el.className.slice(0, 30)}`),
      rootEl: document.getElementById('root') ? 'found #root' : 'no #root',
      nextEl: document.getElementById('__next') ? 'found #__next' : 'no #__next',
    };
  });
  console.log('React root info:', JSON.stringify(reactRootInfo));

  // Open Skills → Make Audio Calls
  await page.getByRole('button', { name: 'Skills' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Make Audio Calls' }).click();
  await page.waitForTimeout(1000);

  // Log dialog content
  const dialogInfo = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return dialog ? { role: dialog.getAttribute('role'), text: dialog.textContent.slice(0, 300), found: true } : { found: false };
  });
  console.log('\nDialog info:', JSON.stringify(dialogInfo));
  await page.screenshot({ path: path.join(__dirname, 'network-01-dialog.png') });

  console.log('\n=== Step 1: Try without init script — native filechooser interception ===');

  // Clear request log
  allRequests.length = 0;
  const requestsAfterClick = [];
  const offTrack = req => {
    if (/upload|audio|voice|clone|supabase|storage|file/i.test(req.url())) {
      requestsAfterClick.push({ method: req.method(), url: req.url() });
    }
  };
  page.on('request', offTrack);

  const fcPromise = page.waitForEvent('filechooser', { timeout: 12000 }).catch(e => {
    console.log('  Filechooser NOT fired:', e.message.slice(0, 80));
    return null;
  });

  await page.getByText(/upload existing recording/i).first().click();
  console.log('Clicked "Upload Existing Recording"');

  const fc = await fcPromise;
  if (fc) {
    console.log('  Filechooser fired!');
    console.log('  Input element:', await fc.element().evaluate(el => ({
      type: el.type, accept: el.accept, inDOM: document.body.contains(el),
      id: el.id, className: el.className.slice(0, 40)
    })).catch(() => '(error)'));

    await fc.setFiles(AUDIO_PATH);
    console.log('  setFiles() done with:', path.basename(AUDIO_PATH));
  } else {
    console.log('  No filechooser. Checking for file inputs in DOM...');
    const inputs = await page.evaluate(() =>
      [...document.querySelectorAll('input[type="file"]')].map(i => ({
        id: i.id, accept: i.accept, inDOM: document.body.contains(i),
        display: getComputedStyle(i).display, visibility: getComputedStyle(i).visibility
      }))
    );
    console.log('  File inputs in DOM:', JSON.stringify(inputs));
  }

  page.off('request', offTrack);

  // Wait and check dialog state
  await page.waitForTimeout(2000);
  const dialogAfterClick = await page.locator('[role="dialog"]').first().innerText().catch(() => '(no dialog)');
  console.log('\nDialog text after click+setFiles:\n', dialogAfterClick.replace(/\n/g, ' | ').slice(0, 400));

  // Check for toasts/alerts
  const toasts = await page.locator('[role="alert"], [data-sonner-toast]').allTextContents().catch(() => []);
  console.log('Toasts:', toasts);

  // Check for switch/toggle
  const switchVisible = await page.getByRole('switch').first().isVisible({ timeout: 500 }).catch(() => false);
  console.log('Switch visible:', switchVisible);

  console.log('\nRequests during upload:', JSON.stringify(requestsAfterClick, null, 2));
  await page.screenshot({ path: path.join(__dirname, 'network-02-after-setfiles.png') });

  // Wait longer
  console.log('\nWaiting 15 seconds...');
  await page.waitForTimeout(15000);
  await page.screenshot({ path: path.join(__dirname, 'network-03-after-15s.png') });

  const switchVisible2 = await page.getByRole('switch').first().isVisible({ timeout: 500 }).catch(() => false);
  const dialogAfter15 = await page.locator('[role="dialog"]').first().innerText().catch(() => '(no dialog)');
  console.log('Switch visible after 15s:', switchVisible2);
  console.log('Dialog after 15s:', dialogAfter15.replace(/\n/g, ' | ').slice(0, 400));

  await browser.close();
  console.log('\nDone.');
})();
