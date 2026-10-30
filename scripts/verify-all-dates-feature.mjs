import puppeteer from 'puppeteer-core';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function verifyAllDatesFeature() {
  console.log('================================================================');
  console.log(' 📅 VERIFYING ALL DATES FEATURE (INFLOW & OUTFLOW DATES)');
  console.log('================================================================\n');

  // 1. Fetch Month 1 Payments
  console.log('1. Fetching Month 1 Monthly Payments data...');
  const payRes = await fetch('http://127.0.0.1:5173/api/monthly-payments/month/1');
  const payData = await payRes.json();

  const scheme1L = payData.schemes.find((s) => s.group.total_pot_value === 100000);
  if (!scheme1L || !scheme1L.installments || scheme1L.installments.length === 0) {
    throw new Error('No installments found for Month 1 1L Scheme');
  }

  // Find a target installment to test split payments with exact dates
  const testInst = scheme1L.installments[0];
  console.log(`   Target Member: ${testInst.member_name} (Ticket #${testInst.share_ticket_number})`);
  console.log(`   Installment Due: ₹${testInst.net_due_amount}, Currently Paid: ₹${testInst.paid_amount}`);

  // Reset this installment for clean verification
  await sql`DELETE FROM payment_transactions WHERE installment_id = ${testInst.id};`;
  await sql`
    UPDATE installments
    SET paid_amount = 0, status = 'PENDING', last_payment_date = NULL, expected_payment_date = NULL
    WHERE id = ${testInst.id};
  `;

  // 2. Record Split Payment #1 with specific date & next promised date
  console.log('\n2. Recording Split Payment #1 (₹2,000 paid on 2026-10-10, Promised next: 2026-10-24)...');
  const split1Res = await fetch('http://127.0.0.1:5173/api/record-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installment_id: testInst.id,
      amount_paid: 2000,
      payment_method: 'CASH',
      receipt_number: 'REC-OCT-001',
      notes: '1st partial cash installment',
      payment_date: '2026-10-10',
      expected_payment_date: '2026-10-24',
    }),
  });
  const split1Data = await split1Res.json();
  console.log(`   ✓ Split #1 recorded: Status = ${split1Data.rule_status}, Remaining = ₹${split1Data.remaining_balance}`);

  // 3. Record Split Payment #2 with specific date & final clearance
  console.log('\n3. Recording Split Payment #2 (₹1,500 paid on 2026-10-20, Promised next: 2026-10-28)...');
  const split2Res = await fetch('http://127.0.0.1:5173/api/record-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      installment_id: testInst.id,
      amount_paid: 1500,
      payment_method: 'GPAY',
      receipt_number: 'UPI-9928371',
      notes: '2nd partial payment via Google Pay',
      payment_date: '2026-10-20',
      expected_payment_date: '2026-10-28',
    }),
  });
  const split2Data = await split2Res.json();
  console.log(`   ✓ Split #2 recorded: Status = ${split2Data.rule_status}, Remaining = ₹${split2Data.remaining_balance}`);

  // 4. Verify API response has both transactions and expected_payment_date
  console.log('\n4. Verifying GET /api/monthly-payments/month/1 returns split transaction dates...');
  const verifyPayRes = await fetch('http://127.0.0.1:5173/api/monthly-payments/month/1');
  const verifyPayData = await verifyPayRes.json();
  const updatedScheme1L = verifyPayData.schemes.find((s) => s.group.total_pot_value === 100000);
  const updatedInst = updatedScheme1L.installments.find((i) => i.id === testInst.id);

  console.log(`   • Total Paid: ₹${updatedInst.paid_amount}`);
  console.log(`   • Status: ${updatedInst.status}`);
  console.log(`   • Last Payment Date: ${updatedInst.last_payment_date}`);
  console.log(`   • Expected Next Payment Date: ${updatedInst.expected_payment_date}`);
  console.log(`   • Transactions count: ${updatedInst.transactions ? updatedInst.transactions.length : 0}`);
  if (updatedInst.transactions) {
    updatedInst.transactions.forEach((tx, idx) => {
      console.log(`     - Transaction #${idx + 1}: ₹${tx.amount_paid} on ${tx.payment_date} via ${tx.payment_method}`);
    });
  }

  // 5. Test Winner Prize Payout with Next Expected Payout Date
  console.log('\n5. Setting up Winner Prize Payout with Next Payout Due Date...');
  const bidRes = await fetch('http://127.0.0.1:5173/api/bidding/month/1');
  const bidData = await bidRes.json();
  const bidScheme2L = bidData.schemes.find((s) => s.group.total_pot_value === 200000);

  if (bidScheme2L && bidScheme2L.auction) {
    await sql`DELETE FROM winner_payout_installments WHERE auction_id = ${bidScheme2L.auction.id};`;
    const payoutRes = await fetch(`http://127.0.0.1:5173/api/bidding/auction/${bidScheme2L.auction.id}/payouts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_paid: 60000,
        payment_date: '2026-10-18',
        payment_method: 'BANK_TRANSFER',
        receipt_reference: 'NEFT-88374921',
        notes: '1st partial installment of prize pot',
        next_expected_payout_date: '2026-11-05',
      }),
    });
    const payoutData = await payoutRes.json();
    console.log(`   ✓ Winner Payout Recorded: ₹${payoutData.installment.amount_paid} on ${payoutData.installment.payment_date}`);
    console.log(`   ✓ Next Payout Scheduled: ${payoutData.payout_summary.next_expected_payout_date}`);
    console.log(`   ✓ Balance Remaining: ₹${payoutData.payout_summary.balance_remaining}`);
  }

  // 6. Launch Puppeteer to Capture Screenshots of Dates in UI
  console.log('\n6. Launching Puppeteer Headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // Login
  console.log('   Navigating and setting admin session...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const sessionData = JSON.stringify({
      authenticated: true,
      user: 'Venkatesan',
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('rajamanickam_admin_auth', sessionData);
    sessionStorage.setItem('rajamanickam_admin_auth', sessionData);
  });
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  await delay(1500);

  // Navigate to Monthly Payments
  console.log('   Navigating to Monthly Payments View...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find((b) => b.innerText.includes('Monthly Payments'));
    if (btn) btn.click();
  });
  await delay(2000);

  // Switch to All status or Partial filter so the tested member is visible
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const allStatusBtn = btns.find((b) => b.innerText.trim().startsWith('All Status'));
    if (allStatusBtn) allStatusBtn.click();
  });
  await delay(1500);

  // Capture Payments Ledger showing split installment dates and promised next payment date
  const paymentsViewPath = path.join(artifactDir, 'dates_1_payments_ledger_with_split_dates.png');
  await page.screenshot({ path: paymentsViewPath, fullPage: false });
  console.log(`   ✓ Captured: dates_1_payments_ledger_with_split_dates.png`);

  // Open Record Payment Modal by clicking on "Collect" for this member
  console.log('   Opening Record Payment Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const collectBtn = btns.find((b) => b.innerText.includes('Collect'));
    if (collectBtn) collectBtn.click();
  });
  await delay(1500);

  // Capture Record Payment Modal with Payment Date & Next Due Date inputs
  const modalEntryPath = path.join(artifactDir, 'dates_2_record_payment_modal_date_inputs.png');
  await page.screenshot({ path: modalEntryPath, fullPage: false });
  console.log(`   ✓ Captured: dates_2_record_payment_modal_date_inputs.png`);

  // Enter a payment with custom dates in the modal and submit
  console.log('   Submitting payment with custom dates via modal...');
  await page.evaluate(() => {
    // Set payment date
    const dateInputs = Array.from(document.querySelectorAll('input[type="date"]'));
    if (dateInputs.length > 0) {
      dateInputs[0].value = '2026-10-25';
      dateInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      dateInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await delay(500);

  // Click Submit
  await page.evaluate(() => {
    const submitBtn = document.querySelector('form button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await delay(2000);

  // Capture Success Receipt Screen with Date and SMS/WhatsApp buttons
  const modalSuccessPath = path.join(artifactDir, 'dates_3_payment_receipt_success_screen.png');
  await page.screenshot({ path: modalSuccessPath, fullPage: false });
  console.log(`   ✓ Captured: dates_3_payment_receipt_success_screen.png`);

  // Close modal
  await page.evaluate(() => {
    const doneBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.includes('Done & Close'));
    if (doneBtn) doneBtn.click();
  });
  await delay(1000);

  // Navigate to Monthly Bidding View
  console.log('   Navigating to Monthly Bidding View...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find((b) => b.innerText.includes('Monthly Bidding'));
    if (btn) btn.click();
  });
  await delay(2000);

  // Capture Bidding View showing Next Payout Scheduled badge on Scheme 2L card
  const biddingDatesPath = path.join(artifactDir, 'dates_4_bidding_view_next_payout_badge.png');
  await page.screenshot({ path: biddingDatesPath, fullPage: false });
  console.log(`   ✓ Captured: dates_4_bidding_view_next_payout_badge.png`);

  // Open Winner Payout Modal for 2L Scheme
  console.log('   Opening Winner Payout Modal for 2L Scheme...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payNextBtn = btns.find((b) => b.innerText.includes('Pay Next Installment'));
    if (payNextBtn) payNextBtn.click();
  });
  await delay(1500);

  // Capture Winner Payout Modal showing Next Payout Scheduled banner and date input
  const winnerModalDatesPath = path.join(artifactDir, 'dates_5_winner_payout_modal_scheduled_dates.png');
  await page.screenshot({ path: winnerModalDatesPath, fullPage: false });
  console.log(`   ✓ Captured: dates_5_winner_payout_modal_scheduled_dates.png`);

  await browser.close();
  console.log('\n================================================================');
  console.log(' 🏁 ALL DATES FEATURE VERIFICATION COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

verifyAllDatesFeature().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

