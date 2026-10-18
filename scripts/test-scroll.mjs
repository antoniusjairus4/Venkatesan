import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testScroll() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle2' });

  // Login
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  // Wait for authenticated dashboard
  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.includes('RAJAMANICKAM'),
    { timeout: 15000 }
  );
  await delay(2000);

  // Take screenshot at the top
  const shotTop = path.resolve(__dirname, '../public/assets/scroll_top_verified.png');
  await page.screenshot({ path: shotTop });
  console.log('✓ Captured top view:', shotTop);

  // Now scroll DOWN by 800px
  console.log('Scrolling down 800px on the page...');
  await page.evaluate(() => {
    window.scrollBy({ top: 800, behavior: 'instant' });
  });
  await delay(1000);

  // Check if sidebar nav items are still visible in viewport
  const navVisible = await page.evaluate(() => {
    const btn = document.querySelector('button[data-tab="dashboard"]');
    if (!btn) return false;
    const rect = btn.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  });

  console.log('Is Dashboard Navigation button still visible in viewport while scrolled down?', navVisible);

  // Take screenshot while scrolled down
  const shotScrolled = path.resolve(__dirname, '../public/assets/scroll_down_verified.png');
  await page.screenshot({ path: shotScrolled });
  console.log('✓ Captured scrolled view:', shotScrolled);

  // Also scroll all the way to the bottom
  console.log('Scrolling all the way to bottom...');
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
  });
  await delay(1000);

  const shotBottom = path.resolve(__dirname, '../public/assets/scroll_bottom_verified.png');
  await page.screenshot({ path: shotBottom });
  console.log('✓ Captured bottom view:', shotBottom);

  await browser.close();
}

testScroll().catch(console.error);

