import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureMobile() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  console.log('Navigating to http://127.0.0.1:5173 on mobile viewport...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2' });

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  // Wait for authenticated dashboard
  console.log('Waiting for charts and summary numbers to render...');
  await page.waitForFunction(
    () => document.body.innerText.includes('9,000') && document.querySelectorAll('.recharts-responsive-container').length >= 1,
    { timeout: 15000 }
  ).catch(() => console.log('Timeout waiting for specific text, proceeding...'));
  await delay(1500);

  const mobileShotPath = path.resolve(__dirname, '../public/assets/dashboard_mobile_verified.png');
  await page.screenshot({ path: mobileShotPath, fullPage: true });
  console.log('Mobile screenshot saved to:', mobileShotPath);

  await browser.close();
}

captureMobile().catch(console.error);
