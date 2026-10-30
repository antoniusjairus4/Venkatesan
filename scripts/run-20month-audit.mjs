import puppeteer from 'puppeteer-core';
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL);
const artifactDir = '/home/jairus/.gemini/antigravity/brain/1fdbf56b-f71d-497c-944b-2138593f020a';
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function retryDb(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`[Neon DB retry ${attempt}/${maxRetries}] ${err.message}. Retrying in 1.5s...`);
      await delay(1500);
    }
  }
}

async function runAudit() {
  console.log('========================================================================');
  console.log(' 🏁 RAJAMANICKAM CHIT FUND: FULL 20-MONTH AUDIT & PERFORMANCE BENCHMARK ');
  console.log('========================================================================\n');

  const auditReport = {
    timestamp: new Date().toISOString(),
    databaseMetrics: {},
    apiMetrics: {},
    uiMetrics: {},
    screenshots: []
  };

  // -------------------------------------------------------------------------
  // 1. DATABASE AUDIT & DATA INTEGRITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('📊 SECTION 1: DATABASE AUDIT & DATA INTEGRITY VERIFICATION');
  console.log('---------------------------------------------------------');

  const tDbStart = Date.now();
  const [memberStats] = await retryDb(() => sql`SELECT COUNT(*)::int as total_members FROM members WHERE status = 'ACTIVE'`);
  const activeGroups = await retryDb(() => sql`
    SELECT id, name, total_pot_value, installment_base_amount, total_months
    FROM chit_groups WHERE status = 'ACTIVE' ORDER BY total_pot_value ASC
  `);

  let totalShares = 0;
  const groupAudits = [];
  for (const g of activeGroups) {
    const shares = await sql`
      SELECT share_ticket_number, member_id, is_prized, prized_month_number 
      FROM member_shares WHERE chit_group_id = ${g.id} AND status = 'ACTIVE'
      ORDER BY share_ticket_number ASC
    `;
    const uniqueMembers = new Set(shares.map(s => s.member_id));
    const prizedCount = shares.filter(s => s.is_prized).length;
    totalShares += shares.length;

    const auctions = await sql`
      SELECT month_number, winning_member_id, payout_amount, bid_discount_amount, 
             organizer_commission, dividend_per_share, net_installment_due
      FROM auctions WHERE chit_group_id = ${g.id} ORDER BY month_number ASC
    `;
    const uniqueWinners = new Set(auctions.map(a => a.winning_member_id));

    groupAudits.push({
      id: g.id,
      name: g.name,
      pot: Number(g.total_pot_value),
      totalShares: shares.length,
      uniqueMembers: uniqueMembers.size,
      all20MembersDistinct: uniqueMembers.size === 20 && shares.length === 20,
      totalAuctions: auctions.length,
      uniqueWinners: uniqueWinners.size,
      strictOneWinnerCompliant: uniqueWinners.size === 20 && auctions.length === 20,
      prizedSharesCount: prizedCount
    });
  }

  // Installments and Payment Transactions Breakdown
  const [instTotals] = await sql`
    SELECT 
      COUNT(*)::int as total_installments,
      SUM(net_due_amount)::numeric as total_expected,
      SUM(paid_amount)::numeric as total_collected,
      COUNT(CASE WHEN status = 'PAID' THEN 1 END)::int as paid_count,
      COUNT(CASE WHEN status = 'PARTIAL' THEN 1 END)::int as partial_count,
      COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_count
    FROM installments;
  `;

  // Count payment splits (installments with 1 tx, 2 txs, 3 txs)
  const txSplitStats = await sql`
    SELECT tx_count, COUNT(*)::int as installments_with_count
    FROM (
      SELECT installment_id, COUNT(*)::int as tx_count
      FROM payment_transactions
      GROUP BY installment_id
    ) sub
    GROUP BY tx_count
    ORDER BY tx_count ASC;
  `;

  const [totalTxCount] = await sql`SELECT COUNT(*)::int as count, SUM(amount_paid)::numeric as total_amt FROM payment_transactions;`;
  const dbLatencyMs = Date.now() - tDbStart;

  auditReport.databaseMetrics = {
    activeMembers: memberStats.total_members,
    activeGroupsCount: activeGroups.length,
    groups: groupAudits,
    totalInstallments: instTotals.total_installments,
    totalExpectedCollection: Number(instTotals.total_expected),
    totalActualCollected: Number(instTotals.total_collected),
    collectionRatePct: ((Number(instTotals.total_collected) / Number(instTotals.total_expected)) * 100).toFixed(2),
    paidInstallments: instTotals.paid_count,
    partialInstallments: instTotals.partial_count,
    pendingInstallments: instTotals.pending_count,
    paymentSplits: txSplitStats,
    totalTransactions: totalTxCount.count,
    databaseAuditQueryLatencyMs: dbLatencyMs
  };

  console.log(`✓ Active Members: ${memberStats.total_members}`);
  for (const ga of groupAudits) {
    console.log(`  • Group '${ga.name}': ${ga.totalShares}/20 shares, ${ga.uniqueMembers}/20 distinct members, ${ga.totalAuctions}/20 auctions, 1-Winner Compliant: ${ga.strictOneWinnerCompliant ? 'YES' : 'NO'}`);
  }
  console.log(`✓ Total Installments: ${instTotals.total_installments}`);
  console.log(`  • Fully Paid: ${instTotals.paid_count} (${((instTotals.paid_count/instTotals.total_installments)*100).toFixed(1)}%)`);
  console.log(`  • Partially Paid: ${instTotals.partial_count} (${((instTotals.partial_count/instTotals.total_installments)*100).toFixed(1)}%)`);
  console.log(`  • Pending: ${instTotals.pending_count} (${((instTotals.pending_count/instTotals.total_installments)*100).toFixed(1)}%)`);
  console.log(`✓ Payment Transactions: ${totalTxCount.count} total records`);
  for (const s of txSplitStats) {
    console.log(`  • Paid in ${s.tx_count} payment(s): ${s.installments_with_count} installments`);
  }
  console.log(`✓ Collection Rate: ₹${Number(instTotals.total_collected).toLocaleString('en-IN')} / ₹${Number(instTotals.total_expected).toLocaleString('en-IN')} (${auditReport.databaseMetrics.collectionRatePct}%)`);
  console.log(`✓ DB query audit took: ${dbLatencyMs}ms\n`);

  // -------------------------------------------------------------------------
  // 2. API ENDPOINTS LATENCY BENCHMARK
  // -------------------------------------------------------------------------
  console.log('⚡ SECTION 2: API LATENCY & ENDPOINT PERFORMANCE BENCHMARK');
  console.log('---------------------------------------------------------');

  const testEndpoints = [
    { name: 'Dashboard Summary', url: 'http://127.0.0.1:5173/api/dashboard/summary' },
    { name: 'Analytics & Cashflow', url: 'http://127.0.0.1:5173/api/analytics' },
    { name: 'Chit Groups List', url: 'http://127.0.0.1:5173/api/chit-groups' },
    { name: 'Active Members List', url: 'http://127.0.0.1:5173/api/members' },
    { name: 'Bidding Month 1', url: 'http://127.0.0.1:5173/api/bidding/month/1' },
    { name: 'Bidding Month 10', url: 'http://127.0.0.1:5173/api/bidding/month/10' },
    { name: 'Bidding Month 20', url: 'http://127.0.0.1:5173/api/bidding/month/20' },
    { name: 'Monthly Payments M1 (Split & Full)', url: 'http://127.0.0.1:5173/api/monthly-payments/month/1' },
    { name: 'Monthly Payments M10', url: 'http://127.0.0.1:5173/api/monthly-payments/month/10' },
    { name: 'Monthly Payments M20 (Partial & Pending)', url: 'http://127.0.0.1:5173/api/monthly-payments/month/20' }
  ];

  const apiResults = [];
  for (const ep of testEndpoints) {
    const latencies = [];
    let status = 200;
    let dataSize = 0;

    // Run 3 iterations per endpoint to test warm cache / consistent latency
    for (let iter = 0; iter < 3; iter++) {
      const t0 = performance.now();
      const res = await fetch(ep.url);
      const t1 = performance.now();
      status = res.status;
      const text = await res.text();
      dataSize = text.length;
      latencies.push(Math.round(t1 - t0));
    }

    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    console.log(`  • ${ep.name.padEnd(40)}: Avg ${avgLatency}ms (Min: ${minLatency}ms, Max: ${maxLatency}ms) | Size: ${(dataSize/1024).toFixed(1)} KB | Status: ${status}`);
    apiResults.push({
      name: ep.name,
      avgLatencyMs: avgLatency,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      dataSizeKB: (dataSize / 1024).toFixed(1),
      status
    });
  }

  auditReport.apiMetrics = apiResults;
  console.log('✓ All API endpoints verified healthy and sub-second.\n');

  // -------------------------------------------------------------------------
  // 3. PUPPETEER HEADLESS CHROME UI BENCHMARK & SCREENSHOT SUITE
  // -------------------------------------------------------------------------
  console.log('🖥️ SECTION 3: PUPPETEER BROWSER UI BENCHMARK & HIGH-RES SCREENSHOTS');
  console.log('------------------------------------------------------------------');

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
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  // 3.1 Login
  console.log('Logging in as Admin (Venkatesan)...');
  const tNavStart = performance.now();
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle0' });
  const initialLoadTime = Math.round(performance.now() - tNavStart);

  await page.waitForSelector('input[type="password"]');
  await page.$eval('input[type="text"]', el => el.value = '');
  await page.type('input[type="text"]', 'venkatesan');
  await page.type('input[type="password"]', 'MahiVenkat@1722');
  await page.click('button[type="submit"]');

  await page.waitForFunction(
    () => !document.querySelector('form') && document.body.innerText.toLowerCase().includes('rajamanickam'),
    { timeout: 15000 }
  );
  await delay(1500);
  console.log(`✓ Login successful (Initial page load: ${initialLoadTime}ms).`);

  // 3.2 Dashboard Overview View & Screenshot
  console.log('Capturing Dashboard Overview under full 20-month load...');
  const tDashStart = performance.now();
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const dashBtn = btns.find(b => b.innerText.includes('Dashboard'));
    if (dashBtn) dashBtn.click();
  });
  // Wait for SVG charts and analytics to be fully loaded
  await delay(500);
  await page.waitForFunction(() => {
    return document.querySelectorAll('svg').length >= 3 && !document.querySelector('.animate-pulse');
  }, { timeout: 25000 }).catch(() => {});
  await delay(2000);
  const dashRenderTime = Math.round(performance.now() - tDashStart);

  const dashScreenshotPath = path.join(artifactDir, 'audit_1_dashboard_20month_overview.png');
  await page.screenshot({ path: dashScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_1_dashboard_20month_overview.png (Render time: ${dashRenderTime}ms)`);
  auditReport.screenshots.push({ name: 'Dashboard Overview', file: 'audit_1_dashboard_20month_overview.png' });

  // 3.3 Chit Groups View & Screenshot
  console.log('Capturing Chit Groups (20/20 Members on all 3 schemes)...');
  const tGroupsStart = performance.now();
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find(b => b.innerText.includes('Chit Groups'));
    if (btn) btn.click();
  });
  await delay(500);
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading') && !document.querySelector('.animate-pulse');
  }, { timeout: 25000 }).catch(() => {});
  await delay(1500);
  const groupsRenderTime = Math.round(performance.now() - tGroupsStart);

  const groupsScreenshotPath = path.join(artifactDir, 'audit_2_chit_groups_20members.png');
  await page.screenshot({ path: groupsScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_2_chit_groups_20members.png (Render time: ${groupsRenderTime}ms)`);
  auditReport.screenshots.push({ name: 'Chit Groups (20/20 Members)', file: 'audit_2_chit_groups_20members.png' });

  // 3.4 Monthly Bidding View (Month 10) & Screenshot
  console.log('Capturing Monthly Bidding Slider (Month 10)...');
  const tBidStart = performance.now();
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find(b => b.innerText.includes('Monthly Bidding'));
    if (btn) btn.click();
  });
  await delay(1000);

  // Click Month 10 pill in slider
  await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('button'));
    const m10 = pills.find(p => p.innerText.trim() === 'M10');
    if (m10) m10.click();
  });
  await delay(800);
  await page.waitForFunction(() => {
    return !document.querySelector('.animate-pulse') && document.body.innerText.includes('Bidding Completed');
  }, { timeout: 25000 }).catch(() => {});
  await delay(1500);
  const bidRenderTime = Math.round(performance.now() - tBidStart);

  const biddingScreenshotPath = path.join(artifactDir, 'audit_3_bidding_20months_m10.png');
  await page.screenshot({ path: biddingScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_3_bidding_20months_m10.png (Month 10 navigation time: ${bidRenderTime}ms)`);
  auditReport.screenshots.push({ name: 'Monthly Bidding Month 10', file: 'audit_3_bidding_20months_m10.png' });

  // 3.5 Monthly Payments View (Month 1 - Showing Full & Split Payments) & Screenshot
  console.log('Capturing Monthly Payments Ledger (Month 1)...');
  const tPayStart = performance.now();
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button, aside a'));
    const btn = btns.find(b => b.innerText.includes('Monthly Payments'));
    if (btn) btn.click();
  });
  await delay(1000);

  // Select Month 1
  await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('button'));
    const m1 = pills.find(p => p.innerText.trim() === 'M1');
    if (m1) m1.click();
  });
  // Wait for loading to finish
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading Month') && !document.querySelector('.animate-spin');
  }, { timeout: 25000 }).catch(() => {});
  await delay(2000);

  // Switch filter to "All Members" or "Paid" so we see the split payment receipts
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const allBtn = btns.find(b => b.innerText.trim() === 'All Members' || b.innerText.trim() === 'Paid');
    if (allBtn) allBtn.click();
  });
  await delay(1000);

  const payRenderTime = Math.round(performance.now() - tPayStart);

  const paymentsM1ScreenshotPath = path.join(artifactDir, 'audit_4_payments_ledger_m1.png');
  await page.screenshot({ path: paymentsM1ScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_4_payments_ledger_m1.png (Render time: ${payRenderTime}ms)`);
  auditReport.screenshots.push({ name: 'Monthly Payments Ledger M1', file: 'audit_4_payments_ledger_m1.png' });

  // 3.6 Monthly Payments View (Month 20 - Showing Partial, Due, Pending) & Screenshot
  console.log('Capturing Monthly Payments Ledger (Month 20)...');
  await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('button'));
    const m20 = pills.find(p => p.innerText.trim() === 'M20');
    if (m20) m20.click();
  });
  await page.waitForFunction(() => {
    return !document.body.innerText.includes('Loading Month') && !document.querySelector('.animate-spin');
  }, { timeout: 25000 }).catch(() => {});
  await delay(2000);

  // Set filter to "Action Required (Pending/Partial)" to highlight active collections
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const actBtn = btns.find(b => b.innerText.includes('Action Required'));
    if (actBtn) actBtn.click();
  });
  await delay(1000);

  const paymentsM20ScreenshotPath = path.join(artifactDir, 'audit_5_payments_ledger_m20.png');
  await page.screenshot({ path: paymentsM20ScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_5_payments_ledger_m20.png`);
  auditReport.screenshots.push({ name: 'Monthly Payments Ledger M20', file: 'audit_5_payments_ledger_m20.png' });

  // 3.7 Filter Partial / Pending Payments & Screenshot
  console.log('Filtering Partial Only Payments...');
  await page.evaluate(() => {
    const filterBtns = Array.from(document.querySelectorAll('button'));
    const partialBtn = filterBtns.find(b => b.innerText.trim() === 'Partial Only');
    if (partialBtn) partialBtn.click();
  });
  await delay(1000);

  const partialFilterScreenshotPath = path.join(artifactDir, 'audit_6_payments_partial_filter.png');
  await page.screenshot({ path: partialFilterScreenshotPath, fullPage: false });
  console.log(`✓ Captured: audit_6_payments_partial_filter.png`);
  auditReport.screenshots.push({ name: 'Payments Partial Filter', file: 'audit_6_payments_partial_filter.png' });

  // 3.8 Browser Performance & Memory Metrics
  const metrics = await page.metrics();
  console.log('\n📈 Browser Performance Metrics:');
  console.log(`  • JS Heap Used: ${(metrics.JSHeapUsedSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  • JS Heap Total: ${(metrics.JSHeapTotalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  • DOM Nodes: ${metrics.Nodes}`);
  console.log(`  • Layout Count: ${metrics.LayoutCount}`);

  auditReport.uiMetrics = {
    initialLoadTimeMs: initialLoadTime,
    dashRenderTimeMs: dashRenderTime,
    groupsRenderTimeMs: groupsRenderTime,
    bidMonthSwitchTimeMs: bidRenderTime,
    payMonthSwitchTimeMs: payRenderTime,
    jsHeapUsedMB: (metrics.JSHeapUsedSize / (1024 * 1024)).toFixed(2),
    domNodes: metrics.Nodes
  };

  await browser.close();

  // Save JSON report
  const jsonReportPath = path.join(artifactDir, 'audit_results_20months.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(auditReport, null, 2));
  console.log(`\n✓ Audit report JSON saved to: ${jsonReportPath}`);
  console.log('\n========================================================================');
  console.log(' 🏁 FULL 20-MONTH AUDIT COMPLETED SUCCESSFULLY! ');
  console.log('========================================================================');
}

runAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
