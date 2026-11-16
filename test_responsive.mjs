import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://luna-mu-jade.vercel.app/';

const devices = [
  { name: 'iPhone-14', width: 393, height: 852, isMobile: true },
  { name: 'iPad-Air', width: 820, height: 1180, isMobile: true },
  { name: 'Desktop-1080p', width: 1920, height: 1080, isMobile: false },
];

async function runTests() {
  console.log(`Starting Playwright Multi-Device Tests against: ${TARGET_URL}`);
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const results = [];

  for (const dev of devices) {
    console.log(`\n--- Testing ${dev.name} (${dev.width}x${dev.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      isMobile: dev.isMobile,
      hasTouch: dev.isMobile,
      permissions: ['microphone'],
    });

    const page = await context.newPage();
    const consoleLogs = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleLogs.push(msg.text());
    });

    const startTime = Date.now();
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const loadTimeMs = Date.now() - startTime;
    console.log(`DOM Loaded in: ${loadTimeMs} ms`);

    // Wait for the UI Orb or Header to render
    await page.waitForSelector('text=LUNA', { timeout: 15000 });
    console.log(`LUNA UI Element rendered successfully!`);

    // Check horizontal overflow (Responsiveness check)
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // Check navigation visibility
    const mobileNavVisible = await page.evaluate(() => {
      const nav = document.querySelector('nav');
      return nav ? window.getComputedStyle(nav).display !== 'none' : false;
    });

    const sidebarVisible = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      return aside ? window.getComputedStyle(aside).display !== 'none' : false;
    });

    console.log(`Horizontal Overflow: ${isOverflowing ? 'FAIL (Horizontal scrolling detected)' : 'PASS (100% Fit)'}`);
    console.log(`Mobile Bottom Nav: ${mobileNavVisible ? 'VISIBLE' : 'HIDDEN'}`);
    console.log(`Desktop Sidebar: ${sidebarVisible ? 'VISIBLE' : 'HIDDEN'}`);

    // Take screenshot
    const shotPath = path.resolve(`screenshot_${dev.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Screenshot saved to: ${shotPath}`);

    // Test Talk Button interaction
    let talkButtonWorked = false;
    try {
      const talkBtn = await page.$('button:has-text("TALK")');
      if (talkBtn) {
        await talkBtn.click();
        console.log(`Clicked TALK button on ${dev.name}`);
        await page.waitForTimeout(1000);
        const bodyText = await page.innerText('body');
        talkButtonWorked = bodyText.includes('LISTENING') || bodyText.includes('பேசுங்கள்');
        console.log(`Voice mode activated: ${talkButtonWorked ? 'YES' : 'NO'}`);
      }
    } catch (err) {
      console.warn('Voice interaction check skipped:', err.message);
    }

    results.push({
      device: dev.name,
      loadTimeMs,
      isOverflowing,
      mobileNavVisible,
      sidebarVisible,
      consoleErrors: consoleLogs.length,
      screenshot: shotPath,
    });

    await context.close();
  }

  await browser.close();
  console.log('\n================ ALL TESTS FINISHED ================');
  console.log(JSON.stringify(results, null, 2));
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
