import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureChitsView() {
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
  await page.setViewport({ width: 1920, height: 1080 });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  // Wait for login
  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.includes('RAJAMANICKAM'),
    { timeout: 15000 }
  );
  await delay(1500);

  // Navigate to 'chits' tab
  console.log('Clicking Chit Groups tab...');
  await page.waitForSelector('button[data-tab="chits"]');
  await page.click('button[data-tab="chits"]');
  await delay(1500);

  // Wait for the cards to load
  await page.waitForFunction(
    () => document.body.innerText.includes('1 Lakh') && document.body.innerText.includes('2 Lakhs') && document.body.innerText.includes('3 Lakhs'),
    { timeout: 15000 }
  );
  await delay(1000);

  const shotPath = path.resolve(__dirname, '../public/assets/chits_view_verified.png');
  await page.screenshot({ path: shotPath });
  console.log('✓ Captured Chits View screenshot to:', shotPath);

  // Also navigate back to Dashboard and capture widescreen dashboard
  console.log('Navigating back to Dashboard...');
  await page.click('button[data-tab="dashboard"]');
  await delay(2000);

  const dashPath = path.resolve(__dirname, '../public/assets/dashboard_widescreen_clean.png');
  await page.screenshot({ path: dashPath });
  console.log('✓ Captured Dashboard View screenshot to:', dashPath);

  await browser.close();
}

captureChitsView().catch(console.error);

