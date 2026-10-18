import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyWidescreen() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  // Set viewport to 1920x1080 (user's desktop screen size)
  await page.setViewport({ width: 1920, height: 1080 });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  console.log('Navigating to http://127.0.0.1:5173 on 1920x1080 resolution...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2' });

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  // Wait for authenticated dashboard and live data
  console.log('Waiting for live data to load...');
  await page.waitForFunction(
    () => document.body.innerText.includes('9,000') && document.querySelectorAll('.recharts-responsive-container').length >= 1,
    { timeout: 15000 }
  ).catch(() => console.log('Proceeding...'));
  await delay(1500);

  const shotPath = path.resolve(__dirname, '../public/assets/dashboard_widescreen_verified.png');
  await page.screenshot({ path: shotPath });
  console.log('✓ Widescreen screenshot saved to:', shotPath);

  await browser.close();
}

verifyWidescreen().catch(console.error);
