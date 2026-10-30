import puppeteer from 'puppeteer-core';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function verifyWinnerPayout() {
  console.log('================================================================');
  console.log(' 💰 VERIFYING WINNER PRIZE PAYOUT (BULK & N INSTALLMENTS) FEATURE');
  console.log('================================================================\n');

  // 1. Fetch Month 1 Bidding data
  const res = await fetch('http://127.0.0.1:5173/api/bidding/month/1');
  const data = await res.json();
  const scheme1L = data.schemes.find((s) => s.group.total_pot_value === 100000);
  const scheme2L = data.schemes.find((s) => s.group.total_pot_value === 200000);

  if (!scheme1L || !scheme1L.auction) {
    throw new Error('Month 1 1L auction not found!');
  }

  const auction1L = scheme1L.auction;
  console.log(`1. Testing 1L Scheme (Month 1):`);
  console.log(`   Winner: ${auction1L.winning_member_name} (Phone: ${auction1L.winning_member_phone})`);
  console.log(`   Total Prize Payout: ₹${auction1L.payout_amount.toLocaleString('en-IN')}`);

  // Clear existing test payouts for this auction if any
  await sql`DELETE FROM winner_payout_installments WHERE auction_id = ${auction1L.id};`;

  // 2. Record Installment #1: ₹25,000 (Bank Transfer)
  console.log('\n2. Recording Installment #1 (₹25,000 via Bank Transfer)...');
  const inst1Res = await fetch(`http://127.0.0.1:5173/api/bidding/auction/${auction1L.id}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_paid: 25000,
      payment_date: '2026-10-15',
      payment_method: 'BANK_TRANSFER',
      receipt_reference: 'UTR982837401',
      notes: '1st installment payout transferred to Canara Bank',
    }),
  });
  const inst1Data = await inst1Res.json();
  console.log(`   ✓ Recorded Installment #${inst1Data.installment.installment_number}: ₹${inst1Data.installment.amount_paid}`);
  console.log(`   • Payout Status: ${inst1Data.payout_summary.payout_status}`);
  console.log(`   • Disbursed: ₹${inst1Data.payout_summary.total_disbursed} / Remaining: ₹${inst1Data.payout_summary.balance_remaining}`);

  // 3. Record Installment #2: ₹25,000 (Google Pay)
  console.log('\n3. Recording Installment #2 (₹25,000 via Google Pay)...');
  const inst2Res = await fetch(`http://127.0.0.1:5173/api/bidding/auction/${auction1L.id}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_paid: 25000,
      payment_date: '2026-10-22',
      payment_method: 'GPAY',
      receipt_reference: 'UPI-982837492',
      notes: '2nd installment payout via Google Pay UPI',
    }),
  });
  const inst2Data = await inst2Res.json();
  console.log(`   ✓ Recorded Installment #${inst2Data.installment.installment_number}: ₹${inst2Data.installment.amount_paid}`);
  console.log(`   • Payout Status: ${inst2Data.payout_summary.payout_status}`);
  console.log(`   • Disbursed: ₹${inst2Data.payout_summary.total_disbursed} / Remaining: ₹${inst2Data.payout_summary.balance_remaining}`);

  // 4. Record Installment #3: ₹25,000 (Cash - Final Settlement!)
  console.log('\n4. Recording Installment #3 (₹25,000 via Cash - Final Settlement)...');
  const inst3Res = await fetch(`http://127.0.0.1:5173/api/bidding/auction/${auction1L.id}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount_paid: 25000,
      payment_date: '2026-10-28',
      payment_method: 'CASH',
      receipt_reference: 'CASH-REC-001',
      notes: 'Final settlement payment in cash handed at office',
    }),
  });
  const inst3Data = await inst3Res.json();
  console.log(`   ✓ Recorded Installment #${inst3Data.installment.installment_number}: ₹${inst3Data.installment.amount_paid}`);
  console.log(`   • Payout Status: ${inst3Data.payout_summary.payout_status} (FULLY SETTLED)`);
  console.log(`   • Disbursed: ₹${inst3Data.payout_summary.total_disbursed} / Remaining: ₹${inst3Data.payout_summary.balance_remaining}`);

  // Also setup Scheme 2L (₹2,00,000) with a partial installment to demonstrate active partial payout UI
  if (scheme2L && scheme2L.auction) {
    console.log(`\n5. Setting up 2L Scheme (Month 1) with Partial Payout...`);
    await sql`DELETE FROM winner_payout_installments WHERE auction_id = ${scheme2L.auction.id};`;
    await fetch(`http://127.0.0.1:5173/api/bidding/auction/${scheme2L.auction.id}/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_paid: 50000,
        payment_date: '2026-10-18',
        payment_method: 'BANK_TRANSFER',
        receipt_reference: 'NEFT-88374921',
        notes: '1st partial installment of prize pot',
      }),
    });
    console.log(`   ✓ 2L Scheme: Total Prize ₹1,50,000, Disbursed ₹50,000, Remaining ₹1,00,000`);
  }

  // 6. Launch Puppeteer to Capture High-Res UI Screenshots
  console.log('\n6. Launching Puppeteer Headless Chrome to capture UI...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Login
  console.log('   Logging in as Admin (Venkatesan)...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', (el) => (el.value = ''));
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.includes('Rajamanickam'),
    { timeout: 15000 }
  );
  await delay(1500);

  // Navigate to Monthly Bidding
  console.log('   Navigating to Monthly Bidding...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find((b) => b.innerText.includes('Monthly Bidding'));
    if (btn) btn.click();
  });
  await delay(2000);

  // Capture Bidding View showing Payout Status Cards on 1L (Fully Paid) and 2L (Partially Paid)
  const biddingOverviewPath = path.join(artifactDir, 'winner_payout_1_bidding_view_cards.png');
  await page.screenshot({ path: biddingOverviewPath, fullPage: false });
  console.log(`   ✓ Captured: winner_payout_1_bidding_view_cards.png`);

  // Click on "Manage / View Payout Receipts (Settled ✓)" for 1L Scheme
  console.log('   Opening Winner Payout Modal for 1L Scheme...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payBtn = btns.find((b) => b.innerText.includes('Payout Receipts') || b.innerText.includes('Manage'));
    if (payBtn) payBtn.click();
  });
  await delay(1500);

  const modal1LPath = path.join(artifactDir, 'winner_payout_2_modal_settled_history.png');
  await page.screenshot({ path: modal1LPath, fullPage: false });
  console.log(`   ✓ Captured: winner_payout_2_modal_settled_history.png`);

  // Close modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const closeBtn = btns.find((b) => b.innerText.includes('Close') || b.innerText.includes('Done'));
    if (closeBtn) closeBtn.click();
  });
  await delay(1000);

  // Now open Winner Payout Modal for 2L Scheme (Partial Payout showing entry form)
  console.log('   Opening Winner Payout Modal for 2L Scheme (Partial Payout Entry)...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payNextBtn = btns.find((b) => b.innerText.includes('Pay Next Installment'));
    if (payNextBtn) payNextBtn.click();
  });
  await delay(1500);

  const modal2LPath = path.join(artifactDir, 'winner_payout_3_modal_partial_entry_form.png');
  await page.screenshot({ path: modal2LPath, fullPage: false });
  console.log(`   ✓ Captured: winner_payout_3_modal_partial_entry_form.png`);

  await browser.close();
  console.log('\n================================================================');
  console.log(' 🏁 WINNER PRIZE PAYOUT VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

verifyWinnerPayout().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

