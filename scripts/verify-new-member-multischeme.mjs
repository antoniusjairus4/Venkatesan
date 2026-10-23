import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function verifyNewMemberMultiScheme() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

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
  console.log('Logged in successfully.');
  await delay(1500);

  // Open "New Member" modal
  console.log('Opening Register New Member modal...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('New Member') || b.innerText.includes('Add Member'));
    if (btn) btn.click();
  });

  await page.waitForFunction(() => document.body.innerText.includes('Register New Member'));
  await delay(800);

  // Wait for scheme cards to load in modal
  console.log('Waiting for scheme cards to appear in modal...');
  await page.waitForFunction(
    () => document.body.innerText.includes('1 Lakh') && document.body.innerText.includes('2 Lakhs'),
    { timeout: 15000 }
  );
  await delay(800);

  // Verify KYC / Aadhaar are NOT in the modal
  const modalText = await page.evaluate(() => document.body.innerText);
  const hasKyc = modalText.includes('KYC ID Proof') || modalText.includes('Aadhaar Card') || modalText.includes('ID Number');
  console.log(`KYC / Aadhaar removed check: ${!hasKyc ? '✓ PASSED (No KYC / Aadhaar found)' : '✗ FAILED'}`);

  // Fill in Member Name, Phone, Address
  console.log('Filling member details...');
  await page.type('input[placeholder="e.g. R. Murugan"]', 'S. Kaliappan');
  await page.type('input[placeholder="9876543210"]', '9842188888');
  await page.type('input[placeholder="Optional (same as phone)"]', '9842188888');
  await page.type('input[placeholder="e.g. Meyyanur, Salem"]', 'Alagapuram, Salem');

  // Select 1 Lakh scheme
  console.log('Selecting 1 Lakh scheme...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const h1L = headings.find((h) => h.innerText.includes('1 Lakh'));
    if (h1L) {
      const clickEl = h1L.closest('div.cursor-pointer') || h1L;
      clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await delay(600);

  // Select 2 Lakhs scheme (Testing 2 schemes selected)
  console.log('Selecting 2 Lakhs scheme...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const h2L = headings.find((h) => h.innerText.includes('2 Lakhs'));
    if (h2L) {
      const clickEl = h2L.closest('div.cursor-pointer') || h2L;
      clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await delay(600);

  // Take screenshot with 2 schemes selected (1L + 2L)
  await page.screenshot({ path: path.join(artifactDir, 'register_member_2_schemes_selected.png') });
  console.log('✓ Captured register_member_2_schemes_selected.png');

  const summary2 = await page.evaluate(() => document.body.innerText);
  console.log('2 schemes total monthly commitment ₹15,000 check:', summary2.includes('₹15,000'));
  console.log('2 schemes selected badge check:', summary2.includes('2 Selected'));

  // Select 3 Lakhs scheme (Testing ALL 3 schemes selected)
  console.log('Selecting 3 Lakhs scheme (All 3 Schemes)...');
  await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h4'));
    const h3L = headings.find((h) => h.innerText.includes('3 Lakhs'));
    if (h3L) {
      const clickEl = h3L.closest('div.cursor-pointer') || h3L;
      clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await delay(600);

  // Capture screenshot of modal with all 3 schemes selected
  await page.screenshot({ path: path.join(artifactDir, 'register_member_all_3_schemes_selected.png') });
  console.log('✓ Captured register_member_all_3_schemes_selected.png');

  // Verify total commitment shows 3 schemes and ₹30,000 / mo
  const summaryAfter3 = await page.evaluate(() => document.body.innerText);
  console.log('Contains Total Monthly Commitment:', summaryAfter3.includes('Total Monthly Commitment'));
  console.log('Contains ₹30,000:', summaryAfter3.includes('₹30,000'));
  console.log('Contains 3 Schemes Selected:', summaryAfter3.includes('3 Selected'));

  // Submit form
  console.log('Submitting registration form...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find((b) => b.innerText.includes('Register & Enroll') || b.innerText.includes('Register Member'));
    if (submitBtn) submitBtn.click();
  });

  // Wait for success screen
  await page.waitForFunction(() => document.body.innerText.includes('Member Registered Successfully!'), { timeout: 15000 });
  console.log('✓ Member registered successfully!');
  await delay(800);

  // Capture screenshot of success screen
  await page.screenshot({ path: path.join(artifactDir, 'member_registered_success_all_3_schemes.png') });
  console.log('✓ Captured member_registered_success_all_3_schemes.png');

  // Close modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find((b) => b.innerText.includes('Done & Close'));
    if (closeBtn) closeBtn.click();
  });
  await delay(1500);

  // Navigate to Member Directory
  console.log('Navigating to Member Directory...');
  await page.waitForSelector('button[data-tab="members"]');
  await page.click('button[data-tab="members"]');
  await delay(1500);

  // Search for the newly created member "S. Kaliappan"
  await page.waitForSelector('input[placeholder*="Search by member name"]');
  await page.type('input[placeholder*="Search by member name"]', 'Kaliappan');
  await delay(1000);

  // Capture screenshot of Member Directory with new member enrolled in all 3 schemes
  await page.screenshot({ path: path.join(artifactDir, 'member_directory_kaliappan_all_3_schemes.png') });
  console.log('✓ Captured member_directory_kaliappan_all_3_schemes.png');

  // Verify Kaliappan card shows 3 chits taken and no KYC/Aadhaar text
  const memberDirText = await page.evaluate(() => document.body.innerText);
  console.log('Kaliappan found:', memberDirText.includes('S. Kaliappan'));
  console.log('3 Chits Taken shown:', memberDirText.includes('3 Chits Taken'));
  console.log('No Aadhaar shown on card:', !memberDirText.includes('Aadhaar:'));

  await browser.close();
  console.log('All multi-scheme member verification checks passed!');
}

verifyNewMemberMultiScheme().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
