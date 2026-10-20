import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyMemberPaymentFlow() {
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

  // Wait for P. Selvam to appear
  await page.waitForFunction(
    () => document.body.innerText.includes('P. Selvam'),
    { timeout: 15000 }
  );
  await delay(1000);

  // Take screenshot of Member Directory with new Record Payment buttons
  const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
  const membersDirShot = path.join(artifactDir, 'member_directory_with_collect.png');
  await page.screenshot({ path: membersDirShot });
  console.log('✓ Member Directory screenshot saved to:', membersDirShot);

  // Click on "Record Payment" specifically for P. Selvam
  console.log('Clicking Record Payment for P. Selvam (multi-chit member)...');
  const clicked = await page.evaluate(() => {
    // Find all member cards
    const headings = Array.from(document.querySelectorAll('h3'));
    const selvamHeading = headings.find((h) => h.innerText.includes('P. Selvam'));
    if (!selvamHeading) return false;

    // Find card container
    const card = selvamHeading.closest('.bg-white\\/95') || selvamHeading.parentElement?.parentElement?.parentElement;
    if (!card) return false;

    // Find Record Payment button in this card
    const buttons = Array.from(card.querySelectorAll('button'));
    const recordBtn = buttons.find((b) => b.innerText.includes('Record Payment'));
    if (recordBtn) {
      recordBtn.click();
      return true;
    }
    return false;
  });

  if (!clicked) {
    console.error('Failed to click Record Payment on P. Selvam card!');
  } else {
    console.log('Clicked Record Payment on P. Selvam!');
    await delay(1500);

    // Verify modal is open and shows multi-chit selector
    await page.waitForFunction(
      () => document.body.innerText.includes('Select Chit Scheme & Ticket') && document.body.innerText.includes('P. Selvam'),
      { timeout: 10000 }
    );
    await delay(800);

    // Screenshot modal with multi-chit selection
    const modalShot = path.join(artifactDir, 'multi_chit_payment_modal.png');
    await page.screenshot({ path: modalShot });
    console.log('✓ Multi-chit payment modal screenshot saved to:', modalShot);

    // Click on 2 Lakhs Ticket #2 option
    console.log('Selecting 2 Lakhs Ticket #2...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const ticket2Btn = buttons.find((b) => b.innerText.includes('2 Lakhs') && b.innerText.includes('#2'));
      if (ticket2Btn) ticket2Btn.click();
    });
    await delay(800);

    const switchedShot = path.join(artifactDir, 'multi_chit_switched_scheme.png');
    await page.screenshot({ path: switchedShot });
    console.log('✓ Switched scheme screenshot saved to:', switchedShot);
  }

  await browser.close();
  console.log('Done!');
}

verifyMemberPaymentFlow().catch(console.error);

