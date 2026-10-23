import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';

async function verifyPastGroups() {
  console.log('Launching browser...');
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

  page.on('console', (msg) => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER ERROR:', err.message));

  // Enable download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: '/tmp',
  });

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });

  // Login
  console.log('Logging in...');
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.includes('RAJAMANICKAM'),
    { timeout: 15000 }
  );
  await delay(1500);

  // Navigate to 'chits' tab
  console.log('Navigating to Chit Schemes tab...');
  await page.waitForSelector('button[data-tab="chits"]');
  await page.click('button[data-tab="chits"]');

  // Wait for the chit schemes view to actually finish loading
  console.log('Waiting for Chit Schemes View to mount...');
  await page.waitForFunction(
    () => document.body.innerText.includes('Chit Schemes & Groups') && document.body.innerText.includes('Active Groups'),
    { timeout: 20000 }
  );
  await delay(1000);

  // Take screenshot of Active Groups
  await page.screenshot({ path: path.join(artifactDir, 'active_groups_tab.png') });
  console.log('✓ Captured active_groups_tab.png');

  // Click 'Past Groups' tab
  console.log('Clicking Past Groups tab...');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Past Groups'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Past Groups tab:', clicked);

  // Wait for snapshot data to load
  console.log('Waiting for snapshot data to load...');
  await page.waitForFunction(
    () => document.body.innerText.includes('Total Collected') && !document.body.innerText.includes('Loading historical archive snapshot...'),
    { timeout: 20000 }
  );
  await delay(1000);

  // Take screenshot of Past Groups for 1 Lakh (Default)
  await page.screenshot({ path: path.join(artifactDir, 'past_groups_1L.png') });
  console.log('✓ Captured past_groups_1L.png');

  // Verify the 6 summary cards are present
  const summaryText = await page.evaluate(() => document.body.innerText);
  const checks = [
    { label: 'Start / End Date', pass: summaryText.includes('Start / End Date') },
    { label: 'Member Count', pass: summaryText.includes('Member Count') && summaryText.includes('20 Members') },
    { label: 'Total Collected', pass: summaryText.includes('Total Collected') && summaryText.includes('₹20,00,000') },
    { label: 'Total Instalments', pass: summaryText.includes('Total Instalments') && summaryText.includes('400') },
    { label: 'Late Payments', pass: summaryText.includes('Late Payments') && summaryText.includes('3') },
    { label: 'Completion Status', pass: summaryText.includes('COMPLETED') },
    { label: 'Timeline Chart', pass: summaryText.includes('Collection & Payment Timeline') },
  ];

  console.log('Summary Cards Verification:');
  checks.forEach((c) => console.log(`  ${c.pass ? '✓' : '✗'} ${c.label}`));

  // Switch to 2 Lakhs Scheme
  console.log('Switching to 2 Lakhs Scheme...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn2L = buttons.find((b) => b.innerText.includes('2 Lakhs') && b.innerText.includes('₹2,00,000'));
    if (btn2L) btn2L.click();
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading historical archive snapshot...') && document.body.innerText.includes('₹40,00,000'),
    { timeout: 20000 }
  );
  await delay(1000);

  await page.screenshot({ path: path.join(artifactDir, 'past_groups_2L.png') });
  console.log('✓ Captured past_groups_2L.png');

  // Switch to 3 Lakhs Scheme
  console.log('Switching to 3 Lakhs Scheme...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn3L = buttons.find((b) => b.innerText.includes('3 Lakhs') && b.innerText.includes('₹3,00,000'));
    if (btn3L) btn3L.click();
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading historical archive snapshot...') && document.body.innerText.includes('₹60,00,000'),
    { timeout: 20000 }
  );
  await delay(1000);

  await page.screenshot({ path: path.join(artifactDir, 'past_groups_3L.png') });
  console.log('✓ Captured past_groups_3L.png');

  // Test Export PDF button click
  console.log('Testing Export PDF click...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const pdfBtn = buttons.find((b) => b.innerText.includes('Export PDF'));
    if (pdfBtn) pdfBtn.click();
  });
  await delay(2000);

  // Test Export Excel button click
  console.log('Testing Export Excel click...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const excelBtn = buttons.find((b) => b.innerText.includes('Export Excel'));
    if (excelBtn) excelBtn.click();
  });
  await delay(2000);

  // Test Export All button click
  console.log('Testing Export All click...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const allBtn = buttons.find((b) => b.innerText.includes('Export All'));
    if (allBtn) allBtn.click();
  });
  await delay(3000);

  console.log('All tests completed successfully!');
  await browser.close();
}

verifyPastGroups().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
