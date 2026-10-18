import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureMembersView() {
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

  // Navigate to 'members' tab
  console.log('Navigating to Member Directory tab...');
  await page.waitForSelector('button[data-tab="members"]');
  await page.click('button[data-tab="members"]');
  await delay(1500);

  // Wait for members cards to be visible
  await page.waitForFunction(
    () => document.body.innerText.includes('Chit') && document.body.innerText.includes('Vijay Anand'),
    { timeout: 15000 }
  );
  await delay(1000);

  // Capture desktop members view
  const shotPath = path.resolve(__dirname, '../public/assets/members_directory_verified.png');
  await page.screenshot({ path: shotPath });
  console.log('✓ Desktop Members Directory screenshot saved to:', shotPath);

  // Capture mobile viewport (375x812)
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await delay(800);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[data-tab="members"]'));
    const visibleBtn = btns.find((b) => b.offsetParent !== null);
    if (visibleBtn) visibleBtn.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes('9 Members') && document.body.innerText.includes('Vijay Anand'),
    { timeout: 15000 }
  );
  await delay(1000);
  const mobileShotPath = path.resolve(__dirname, '../public/assets/members_directory_mobile.png');
  await page.screenshot({ path: mobileShotPath });
  console.log('✓ Mobile Members Directory screenshot saved to:', mobileShotPath);

  await browser.close();
}

captureMembersView().catch(console.error);
