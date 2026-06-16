require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');

const EU_URL = 'https://dev-avatar.arena.im/automation2arena';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ─── Visit End User (Modern) ──────────────────────────────────────────────────
  console.log('Navigating to', EU_URL);
  await page.goto(EU_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Screenshot 1: initial state (above the fold)
  await page.screenshot({ path: path.join(__dirname, 'eu-modern-initial.png'), fullPage: false });
  console.log('Screenshot 1: initial state saved');

  // ─── DOM snapshot: top-level structure ───────────────────────────────────────
  const topStructure = await page.evaluate(() => {
    function describeEl(el, depth = 0) {
      if (depth > 3) return null;
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? `.${el.className.trim().replace(/\s+/g, '.')}`
        : '';
      const role = el.getAttribute('role') || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const text = el.innerText?.slice(0, 60).replace(/\n/g, ' ') || '';
      return { el: `${tag}${id}${cls}`, role, ariaLabel, text };
    }

    const body = document.body;
    const children = [...body.children].map(c => describeEl(c));
    return children;
  });
  console.log('\n=== TOP BODY CHILDREN ===');
  console.log(JSON.stringify(topStructure, null, 2));

  // ─── Look for video elements ──────────────────────────────────────────────────
  const videoInfo = await page.evaluate(() => {
    const videos = [...document.querySelectorAll('video')];
    return videos.map(v => ({
      src: v.src || v.currentSrc,
      autoplay: v.autoplay,
      muted: v.muted,
      loop: v.loop,
      paused: v.paused,
      className: v.className,
      parentClass: v.parentElement?.className || '',
      rect: v.getBoundingClientRect(),
    }));
  });
  console.log('\n=== VIDEO ELEMENTS ===');
  console.log(JSON.stringify(videoInfo, null, 2));

  // ─── Look for buttons ─────────────────────────────────────────────────────────
  const buttons = await page.evaluate(() => {
    return [...document.querySelectorAll('button, [role="button"]')].map(b => ({
      text: b.innerText?.trim().slice(0, 50),
      ariaLabel: b.getAttribute('aria-label') || '',
      className: b.className?.slice(0, 80) || '',
    })).filter(b => b.text || b.ariaLabel);
  });
  console.log('\n=== BUTTONS ===');
  console.log(JSON.stringify(buttons, null, 2));

  // ─── Look for profile image / avatar ─────────────────────────────────────────
  const images = await page.evaluate(() => {
    return [...document.querySelectorAll('img')].slice(0, 10).map(img => ({
      src: img.src?.slice(0, 100),
      alt: img.alt,
      className: img.className?.slice(0, 80) || '',
      rect: img.getBoundingClientRect(),
    }));
  });
  console.log('\n=== IMAGES (first 10) ===');
  console.log(JSON.stringify(images, null, 2));

  // ─── Full page screenshot ─────────────────────────────────────────────────────
  await page.screenshot({ path: path.join(__dirname, 'eu-modern-full.png'), fullPage: true });
  console.log('\nFull-page screenshot saved: eu-modern-full.png');

  // ─── Click Call button if visible ────────────────────────────────────────────
  const callBtn = page.getByRole('button', { name: /call/i }).first();
  if (await callBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('\nCall button found — clicking it');
    await callBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'eu-modern-after-call-click.png') });
    console.log('Screenshot after Call click saved');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  } else {
    console.log('\nNo "Call" button visible — checking for other CTA buttons');
    const ctaBtns = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map(b => b.innerText?.trim()).filter(Boolean)
    );
    console.log('All button texts:', ctaBtns);
  }

  // ─── Click Chat/Text button if visible ───────────────────────────────────────
  const chatBtn = page.getByRole('button', { name: /^text$|^chat$/i }).first();
  if (await chatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('\nChat button found — clicking it');
    await chatBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(__dirname, 'eu-modern-after-chat-click.png') });
    console.log('Screenshot after Chat click saved');
  }

  await browser.close();
  console.log('\nDone.');
})();
