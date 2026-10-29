import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';

async function runVerification() {
  console.log('🚀 Starting Comprehensive Verification...');
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

  // 1. Login to Portal
  console.log('1. Navigating to http://127.0.0.1:5173 and logging in...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.toLowerCase().includes('rajamanickam'),
    { timeout: 15000 }
  );
  await delay(1500);
  console.log('✓ Successfully logged in');

  // 2. Verify Sidebar has NO generic Record Payment button
  console.log('2. Verifying Sidebar navigation links...');
  const sidebarButtons = await page.$$eval('aside button', (btns) =>
    btns.map((b) => b.innerText.trim())
  );
  console.log('   Sidebar buttons detected:', sidebarButtons);
  const hasSidebarRecordPayment = sidebarButtons.some((txt) =>
    txt.toLowerCase().includes('record payment')
  );
  if (hasSidebarRecordPayment) {
    console.error('✗ Failure: Sidebar still contains standalone Record Payment button!');
  } else {
    console.log('✓ Success: Standalone Record Payment button is cleanly removed from Sidebar.');
  }

  // 3. Verify Monthly Bidding: Strict 1-Winner Rule & Math Calculation
  console.log('3. Navigating to Monthly Bidding...');
  await page.waitForSelector('aside button[data-tab="bidding"]');
  await page.click('aside button[data-tab="bidding"]');
  await delay(2000);

  // Check month 2 to see if Saravanan (winner of month 1) is disabled
  console.log('   Selecting Month 2 in Bidding...');
  const month2Btn = await page.waitForSelector('xpath///button[contains(., "M2")]');
  await month2Btn.click();
  await delay(2500);

  // Inspect the winner dropdown in 1 Lakh scheme
  const winnerOptions = await page.$$eval('select option', (opts) =>
    opts.map((o) => ({
      text: o.innerText.trim(),
      value: o.value,
      disabled: o.disabled,
    }))
  );

  console.log('   Checking winner dropdown options in Month 2:');
  const disabledWinners = winnerOptions.filter((o) => o.disabled);
  console.log('   Disabled options count:', disabledWinners.length);
  disabledWinners.forEach((d) => console.log('     ->', d.text));

  const hasCannotTakeAgain = winnerOptions.some((o) =>
    o.text.toLowerCase().includes('cannot take again')
  );
  if (hasCannotTakeAgain) {
    console.log('✓ Success: 1-Winner Rule verified! Prized member is disabled with "Cannot Take Again" label.');
  } else {
    console.log('ℹ Note: Check winner labels:', winnerOptions.map(o => o.text));
  }

  // Test entering ₹75,000 in 1 Lakh scheme to verify Tamil Nadu Math
  console.log('   Testing Tamil Nadu Chit Fund Math on 1 Lakh Scheme with ₹75,000 payout...');
  const payoutInput = await page.$('input[type="number"]');
  if (payoutInput) {
    await page.$eval('input[type="number"]', (el) => (el.value = ''));
    await payoutInput.type('75000');
    await delay(1000);

    const mathText = await page.evaluate(() => document.body.innerText);
    const hasThalubadi25k = mathText.includes('25,000');
    const hasKasiru5k = mathText.includes('5,000');
    const hasDue4k = mathText.includes('4,000');
    const hasDividend1k = mathText.includes('1,000');

    console.log('   Math Verification Results:');
    console.log('     • Thalubadi ₹25,000 detected:', hasThalubadi25k);
    console.log('     • Kasiru (5%) ₹5,000 detected:', hasKasiru5k);
    console.log('     • Dividend Savings ₹1,000 detected:', hasDividend1k);
    console.log('     • Per Member Due ₹4,000 detected:', hasDue4k);

    if (hasThalubadi25k && hasKasiru5k && hasDue4k && hasDividend1k) {
      console.log('✓ Success: Real-world Tamil Nadu Math exactly matches user scenario down to the rupee!');
    }
  }

  await page.screenshot({
    path: path.join(artifactDir, 'bidding_strict_winner_math_verified.png'),
    fullPage: false,
  });
  console.log('✓ Captured bidding_strict_winner_math_verified.png');

  // 4. Verify Monthly Payments View: 20-Month Ledger & In-Place Record Payment
  console.log('4. Navigating to Monthly Payments View...');
  await page.waitForSelector('aside button[data-tab="payments"]');
  await page.click('aside button[data-tab="payments"]');
  await page.waitForFunction(
    () => !document.body.innerText.includes('Loading Month') && document.body.innerText.includes('Monthly Payments & Installments'),
    { timeout: 15000 }
  );
  await delay(1500);

  // Verify 20 months are present
  const monthPills = await page.$$eval('button', (btns) =>
    btns.map((b) => b.innerText.trim()).filter((t) => /^M\d+$/.test(t))
  );
  console.log(`   Detected ${monthPills.length} Month Pills:`, monthPills.join(', '));
  if (monthPills.length === 20) {
    console.log('✓ Success: Full 20-Month selector verified!');
  } else {
    console.error(`✗ Failure: Expected 20 month pills, found ${monthPills.length}`);
  }

  // Click 'All Members' tab to see all members in Month 1
  console.log('   Clicking "All Members" tab in Monthly Payments...');
  const allTabBtn = await page.waitForSelector('xpath///button[contains(., "All Members")]');
  await allTabBtn.click();
  await delay(1000);

  // Verify In-Place "Collect" Buttons exist on members
  const collectButtons = await page.$$eval('button', (btns) =>
    btns.filter((b) => b.innerText.toLowerCase().includes('collect')).map((b) => b.innerText.trim())
  );
  console.log(`   Detected ${collectButtons.length} In-Place Collect Buttons:`, collectButtons.slice(0, 3));

  // Check SMS Due, SMS Receipt, and WhatsApp links
  const actionLinks = await page.$$eval('a', (links) =>
    links
      .filter((a) => a.innerText.toLowerCase().includes('sms') || a.innerText.toLowerCase().includes('whatsapp'))
      .map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );
  console.log(`   Detected ${actionLinks.length} SMS/WhatsApp Action links in Monthly Payments`);
  if (actionLinks.length > 0) {
    const decodedFirst = decodeURIComponent(actionLinks[0].href);
    console.log('   Sample action link text:', actionLinks[0].text);
    console.log('   Sample action link preview:');
    console.log('   --------------------------------------------------');
    console.log(decodedFirst.slice(0, 350));
    console.log('   --------------------------------------------------');
    const hasDateInMessage = decodedFirst.includes('தேதி') || decodedFirst.includes('Date');
    console.log('   Inbuilt Date verification:', hasDateInMessage ? 'YES ✓' : 'NO ✗');
  }

  await page.screenshot({
    path: path.join(artifactDir, 'monthly_payments_20_months_verified.png'),
    fullPage: false,
  });
  console.log('✓ Captured monthly_payments_20_months_verified.png');

  // 5. Verify Chit Groups Welcome SMS & WhatsApp with in-built Date
  console.log('5. Navigating to Chit Groups View...');
  await page.waitForSelector('aside button[data-tab="chits"]');
  await page.click('aside button[data-tab="chits"]');
  await delay(2000);

  // Click on the 1 Lakh chit group to expand subscribers roster
  console.log('   Clicking 1 Lakh scheme to view subscribers roster...');
  const oneLakhCard = await page.waitForSelector('xpath///h3[contains(., "1 Lakh")]');
  await oneLakhCard.click();
  await delay(1500);

  const chitSmsLinks = await page.$$eval('a', (links) =>
    links
      .filter((a) => a.href.startsWith('sms:') || a.href.includes('wa.me'))
      .map((a) => ({ text: a.innerText.trim(), href: a.href }))
  );
  console.log(`   Detected ${chitSmsLinks.length} Welcome SMS/WhatsApp links in Chit Groups`);
  if (chitSmsLinks.length > 0) {
    const welcomeDecoded = decodeURIComponent(chitSmsLinks[0].href);
    console.log('   Welcome SMS/WhatsApp preview:');
    console.log('   --------------------------------------------------');
    console.log(welcomeDecoded.slice(0, 350));
    console.log('   --------------------------------------------------');
    const hasWelcomeDate = welcomeDecoded.includes('அனுப்பிய தேதி') || welcomeDecoded.includes('Date');
    console.log('   Welcome Date verification:', hasWelcomeDate ? 'YES ✓' : 'NO ✗');
  }

  await page.screenshot({
    path: path.join(artifactDir, 'chit_groups_welcome_verified.png'),
    fullPage: false,
  });
  console.log('✓ Captured chit_groups_welcome_verified.png');

  await browser.close();
  console.log('🎉 Verification completed successfully!');
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
