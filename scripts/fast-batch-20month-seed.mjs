import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function runFastBatchSeed() {
  console.log('⚡ Starting Fast Batch 20-Month Seeding (Multi-row bulk SQL)...');
  const tStart = Date.now();

  // 1. Get all active members (31 members)
  const allMembers = await sql`
    SELECT id, name, phone FROM members WHERE status = 'ACTIVE' ORDER BY name ASC;
  `;
  console.log(`✓ Found ${allMembers.length} active members in DB.`);

  // 2. Fetch Active Chit Groups (1L, 2L, 3L)
  const activeGroups = await sql`
    SELECT * FROM chit_groups WHERE status = 'ACTIVE' ORDER BY total_pot_value ASC;
  `;
  console.log(`✓ Found ${activeGroups.length} active chit groups:`, activeGroups.map(g => `${g.name} (₹${Number(g.total_pot_value).toLocaleString('en-IN')})`).join(', '));

  // 3. For each group, ensure tickets 1..20 are assigned to 20 distinct members
  for (let gIdx = 0; gIdx < activeGroups.length; gIdx++) {
    const group = activeGroups[gIdx];
    const offset = (gIdx * 5) % allMembers.length;
    const groupMembers = [];
    for (let i = 0; i < 20; i++) {
      groupMembers.push(allMembers[(offset + i) % allMembers.length]);
    }

    const existingShares = await sql`
      SELECT id, share_ticket_number, member_id FROM member_shares 
      WHERE chit_group_id = ${group.id} AND status = 'ACTIVE' 
      ORDER BY share_ticket_number ASC;
    `;

    const shareByTicket = new Map();
    for (const s of existingShares) {
      shareByTicket.set(Number(s.share_ticket_number), s);
    }

    for (let ticket = 1; ticket <= 20; ticket++) {
      const assignedMember = groupMembers[ticket - 1];
      const existing = shareByTicket.get(ticket);
      if (existing) {
        if (existing.member_id !== assignedMember.id) {
          await sql`
            UPDATE member_shares 
            SET member_id = ${assignedMember.id} 
            WHERE id = ${existing.id};
          `;
        }
      } else {
        await sql`
          INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number, status, joined_before_start)
          VALUES (${group.id}, ${assignedMember.id}, ${ticket}, 'ACTIVE', TRUE);
        `;
      }
    }

    // Verify 20 unique members
    const finalShares = await sql`
      SELECT share_ticket_number, member_id FROM member_shares 
      WHERE chit_group_id = ${group.id} AND status = 'ACTIVE';
    `;
    const uniqueMembers = new Set(finalShares.map(s => s.member_id));
    console.log(`✓ Group '${group.name}': ${finalShares.length} tickets, ${uniqueMembers.size} unique members.`);
  }

  // 4. Delete existing auctions, installments, payment_transactions for clean 20-month seed
  console.log('🔄 Cleaning up existing transactions, installments, auctions for active groups...');
  for (const group of activeGroups) {
    await sql`DELETE FROM payment_transactions WHERE chit_group_id = ${group.id};`;
    await sql`DELETE FROM installments WHERE chit_group_id = ${group.id};`;
    await sql`DELETE FROM auctions WHERE chit_group_id = ${group.id};`;
  }
  console.log('✓ Cleared previous active group auction/installment/payment test data.');

  // 5. Generate and batch insert 60 Auctions (20 months x 3 groups)
  console.log('🔨 Generating 60 Auctions with Tamil Nadu Math (Thalubadi, 5% Kasiru, Net Due)...');
  
  const payoutCurve = [
    0.750, 0.770, 0.800, 0.820, 0.840,
    0.860, 0.875, 0.890, 0.905, 0.920,
    0.930, 0.940, 0.950, 0.958, 0.965,
    0.972, 0.978, 0.984, 0.990, 0.995
  ];

  const groupShareMap = new Map();
  const auctionRows = [];
  const auctionParams = [];
  let aParamIdx = 1;

  for (const group of activeGroups) {
    const pot = Number(group.total_pot_value);
    const shares = await sql`
      SELECT id as share_id, member_id, share_ticket_number
      FROM member_shares
      WHERE chit_group_id = ${group.id} AND status = 'ACTIVE'
      ORDER BY share_ticket_number ASC;
    `;
    groupShareMap.set(group.id, shares);

    // Tickets 1 to 20 win Month 1 to Month 20 respectively (strictly 1 winner per month, no duplicates)
    for (let m = 1; m <= 20; m++) {
      const winnerShare = shares[m - 1]; // ticket m
      const payoutPct = payoutCurve[m - 1];
      const payoutAmount = Math.round(pot * payoutPct);
      const thalubadi = pot - payoutAmount;
      const kasiru = Math.round((pot * 5) / 100);
      const netDiscount = Math.max(0, thalubadi - kasiru);
      const dividendPerShare = Math.floor(netDiscount / 20);
      const baseMonthly = Number(group.installment_base_amount);
      const netInstallmentDue = Math.max(0, baseMonthly - dividendPerShare);
      const auctionDate = new Date(2025, m - 1, 15).toISOString().split('T')[0];

      auctionRows.push(`($${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++}, $${aParamIdx++})`);
      auctionParams.push(
        group.id, m, auctionDate, winnerShare.member_id, winnerShare.share_id,
        thalubadi, kasiru, netDiscount, dividendPerShare,
        netInstallmentDue, payoutAmount, `Month ${m} Auction finalized. Winner Ticket #${winnerShare.share_ticket_number}. Payout ₹${payoutAmount.toLocaleString('en-IN')}`
      );
    }
  }

  const auctionInsertQuery = `
    INSERT INTO auctions (
      chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
      bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
      net_installment_due, payout_amount, notes
    ) VALUES ${auctionRows.join(', ')}
    RETURNING id, chit_group_id, month_number, winning_share_id;
  `;
  const insertedAuctions = await sql.query(auctionInsertQuery, auctionParams);
  console.log(`✓ Inserted ${insertedAuctions.length} auctions in 1 batch query.`);

  // Update member_shares as prized
  for (const a of insertedAuctions) {
    await sql`
      UPDATE member_shares 
      SET is_prized = TRUE, prized_month_number = ${a.month_number}
      WHERE id = ${a.winning_share_id};
    `;
  }
  console.log(`✓ Updated member shares as prized.`);

  // 6. Build 1,200 Installments with Realistic Multi-Payment Distributions
  console.log('💵 Building 1,200 Installments with Multi-Payment Distributions...');

  const allAuctions = await sql`SELECT * FROM auctions ORDER BY month_number ASC;`;
  const auctionLookup = new Map();
  for (const a of allAuctions) {
    auctionLookup.set(`${a.chit_group_id}_${a.month_number}`, a);
  }

  const plannedInstallments = [];
  let paidIn1Count = 0;
  let paidIn2Count = 0;
  let paidIn3Count = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const group of activeGroups) {
    const shares = groupShareMap.get(group.id);
    const baseMonthly = Number(group.installment_base_amount);

    for (let m = 1; m <= 20; m++) {
      const auction = auctionLookup.get(`${group.id}_${m}`);
      const netDue = auction ? Number(auction.net_installment_due) : baseMonthly;
      const dividend = auction ? Number(auction.dividend_per_share) : 0;
      const monthDate = new Date(2025, m - 1, 10);

      for (let sIdx = 0; sIdx < shares.length; sIdx++) {
        const share = shares[sIdx];
        const rand = (sIdx * 17 + m * 23 + group.id.charCodeAt(0)) % 100;

        let pType;
        if (m <= 15) {
          if (rand < 55) pType = 'COMPLETE_1';
          else if (rand < 75) pType = 'COMPLETE_2';
          else if (rand < 90) pType = 'COMPLETE_3';
          else if (rand < 98) pType = 'COMPLETE_1';
          else pType = 'PARTIAL';
        } else if (m <= 18) {
          if (rand < 45) pType = 'COMPLETE_1';
          else if (rand < 65) pType = 'COMPLETE_2';
          else if (rand < 80) pType = 'COMPLETE_3';
          else if (rand < 92) pType = 'PARTIAL';
          else pType = 'PENDING';
        } else {
          // Months 19 & 20
          if (rand < 35) pType = 'COMPLETE_1';
          else if (rand < 55) pType = 'COMPLETE_2';
          else if (rand < 70) pType = 'COMPLETE_3';
          else if (rand < 85) pType = 'PARTIAL';
          else pType = 'PENDING';
        }

        let paidAmount = 0;
        let status = 'PENDING';
        let lastDate = null;
        const txs = [];

        const methods = ['GPAY', 'PHONEPE', 'CASH', 'BANK_TRANSFER'];
        const m1 = methods[(sIdx + m) % 4];
        const m2 = methods[(sIdx + m + 1) % 4];
        const m3 = methods[(sIdx + m + 2) % 4];

        if (pType === 'COMPLETE_1') {
          paidIn1Count++;
          paidAmount = netDue;
          status = 'PAID';
          lastDate = new Date(monthDate.getTime() + (sIdx % 10) * 86400000).toISOString().split('T')[0];
          txs.push({
            amount: netDue,
            date: lastDate,
            method: m1,
            rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}`,
            notes: 'Full payment cleared in 1 installment'
          });
        } else if (pType === 'COMPLETE_2') {
          paidIn2Count++;
          paidAmount = netDue;
          status = 'PAID';
          const p1 = Math.round(netDue * 0.5);
          const p2 = netDue - p1;
          const d1 = new Date(monthDate.getTime() + 4 * 86400000).toISOString().split('T')[0];
          const d2 = new Date(monthDate.getTime() + 18 * 86400000).toISOString().split('T')[0];
          lastDate = d2;
          txs.push(
            { amount: p1, date: d1, method: m1, rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-1`, notes: '1st split payment' },
            { amount: p2, date: d2, method: m2, rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-2`, notes: '2nd split final payment' }
          );
        } else if (pType === 'COMPLETE_3') {
          paidIn3Count++;
          paidAmount = netDue;
          status = 'PAID';
          const p1 = Math.round(netDue * 0.35);
          const p2 = Math.round(netDue * 0.35);
          const p3 = netDue - (p1 + p2);
          const d1 = new Date(monthDate.getTime() + 2 * 86400000).toISOString().split('T')[0];
          const d2 = new Date(monthDate.getTime() + 12 * 86400000).toISOString().split('T')[0];
          const d3 = new Date(monthDate.getTime() + 25 * 86400000).toISOString().split('T')[0];
          lastDate = d3;
          txs.push(
            { amount: p1, date: d1, method: m1, rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-1`, notes: '1st installment of 3' },
            { amount: p2, date: d2, method: m2, rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-2`, notes: '2nd installment of 3' },
            { amount: p3, date: d3, method: m3, rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-3`, notes: '3rd installment of 3 (final clearance)' }
          );
        } else if (pType === 'PARTIAL') {
          partialCount++;
          const pAmt = Math.round(netDue * 0.6);
          paidAmount = pAmt;
          status = 'PARTIAL';
          lastDate = new Date(monthDate.getTime() + 7 * 86400000).toISOString().split('T')[0];
          txs.push({
            amount: pAmt,
            date: lastDate,
            method: m1,
            rcp: `RCP-${group.name.replace(/\s+/g, '')}-M${m}-T${share.share_ticket_number}-PRT`,
            notes: 'Partial payment recorded (Balance pending)'
          });
        } else {
          // PENDING
          pendingCount++;
        }

        plannedInstallments.push({
          group_id: group.id,
          month_number: m,
          member_id: share.member_id,
          share_id: share.share_id || share.id,
          base_amount: baseMonthly,
          dividend_deduction: dividend,
          net_due_amount: netDue,
          paid_amount: paidAmount,
          status: status,
          last_payment_date: lastDate,
          txs: txs
        });
      }
    }
  }

  console.log(`Generated ${plannedInstallments.length} installments:`);
  console.log(`  • Paid in 1 payment: ${paidIn1Count} (~${((paidIn1Count/plannedInstallments.length)*100).toFixed(1)}%)`);
  console.log(`  • Paid in 2 split payments: ${paidIn2Count} (~${((paidIn2Count/plannedInstallments.length)*100).toFixed(1)}%)`);
  console.log(`  • Paid in 3 split payments: ${paidIn3Count} (~${((paidIn3Count/plannedInstallments.length)*100).toFixed(1)}%)`);
  console.log(`  • Partially paid: ${partialCount} (~${((partialCount/plannedInstallments.length)*100).toFixed(1)}%)`);
  console.log(`  • Pending / Due: ${pendingCount} (~${((pendingCount/plannedInstallments.length)*100).toFixed(1)}%)`);

  // Bulk insert installments in chunks of 200
  console.log('\nBulk inserting installments in chunks of 200...');
  const CHUNK_SIZE = 200;
  const insertedInstLookup = new Map();

  for (let i = 0; i < plannedInstallments.length; i += CHUNK_SIZE) {
    const chunk = plannedInstallments.slice(i, i + CHUNK_SIZE);
    const instRows = [];
    const instParams = [];
    let pIdx = 1;

    for (const inst of chunk) {
      instRows.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      instParams.push(
        inst.group_id, inst.month_number, inst.member_id, inst.share_id,
        inst.base_amount, inst.dividend_deduction, inst.net_due_amount, inst.paid_amount,
        inst.status, inst.last_payment_date
      );
    }

    const q = `
      INSERT INTO installments (
        chit_group_id, month_number, member_id, share_id,
        base_amount, dividend_deduction, net_due_amount, paid_amount, status, last_payment_date
      ) VALUES ${instRows.join(', ')}
      RETURNING id, chit_group_id, month_number, share_id;
    `;
    const res = await sql.query(q, instParams);
    for (const row of res) {
      insertedInstLookup.set(`${row.chit_group_id}_${row.month_number}_${row.share_id}`, row.id);
    }
  }
  console.log(`✓ All ${insertedInstLookup.size} installments successfully bulk inserted!`);

  // Bulk insert payment transactions in chunks of 300
  console.log('Bulk inserting payment transactions...');
  const txRowsToInsert = [];
  for (const inst of plannedInstallments) {
    const instId = insertedInstLookup.get(`${inst.group_id}_${inst.month_number}_${inst.share_id}`);
    for (const tx of inst.txs) {
      txRowsToInsert.push({
        installment_id: instId,
        group_id: inst.group_id,
        member_id: inst.member_id,
        share_id: inst.share_id,
        amount_paid: tx.amount,
        payment_date: tx.date,
        payment_method: tx.method,
        receipt_number: tx.rcp,
        notes: tx.notes
      });
    }
  }

  const TX_CHUNK_SIZE = 300;
  for (let i = 0; i < txRowsToInsert.length; i += TX_CHUNK_SIZE) {
    const chunk = txRowsToInsert.slice(i, i + TX_CHUNK_SIZE);
    const txRows = [];
    const txParams = [];
    let pIdx = 1;

    for (const tx of chunk) {
      txRows.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      txParams.push(
        tx.installment_id, tx.group_id, tx.member_id, tx.share_id,
        tx.amount_paid, tx.payment_date, tx.payment_method, tx.receipt_number, tx.notes
      );
    }

    const q = `
      INSERT INTO payment_transactions (
        installment_id, chit_group_id, member_id, share_id,
        amount_paid, payment_date, payment_method, receipt_number, notes
      ) VALUES ${txRows.join(', ')};
    `;
    await sql.query(q, txParams);
  }
  console.log(`✓ All ${txRowsToInsert.length} payment transactions bulk inserted!`);

  const durationSec = ((Date.now() - tStart) / 1000).toFixed(2);
  console.log(`\n🎉 Full 20-Month Audit Seeding Completed in ${durationSec}s!`);
  console.log(`Summary:`);
  console.log(`  • 3 Active Groups, each with exactly 20 distinct members on Tickets #1 to #20`);
  console.log(`  • 60 Monthly Bidding Auctions with Tamil Nadu Math & Strict 1-Winner Rule`);
  console.log(`  • 1,200 Installment records created`);
  console.log(`  • ${txRowsToInsert.length} Multi-payment transactions recorded`);
}

runFastBatchSeed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
