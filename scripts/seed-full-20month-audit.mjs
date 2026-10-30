import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

// Realistic Tamil Nadu Tamil names and Salem addresses if new members are needed
const extraMembersData = [
  { name: 'K. Duraisamy', phone: '9842155006', address: 'Fairlands, Salem' },
  { name: 'G. Shanmugam', phone: '9842155007', address: 'Alagapuram, Salem' },
  { name: 'A. Periyasamy', phone: '9842155008', address: 'Suramangalam, Salem' },
  { name: 'C. Velumani', phone: '9842155009', address: 'Ammapet, Salem' },
  { name: 'D. Karthikeyan', phone: '9842155010', address: 'Hasthampatti, Salem' },
  { name: 'S. Meenakshi', phone: '9842155011', address: 'Gugai, Salem' },
  { name: 'R. Priya', phone: '9842155012', address: 'Kondalampatti, Salem' },
  { name: 'M. Balaji', phone: '9842155013', address: 'Shevapet, Salem' },
  { name: 'T. Sundaram', phone: '9842155014', address: 'Four Roads, Salem' },
  { name: 'P. Selvi', phone: '9842155015', address: 'Meyyanur, Salem' },
  { name: 'N. Murugesan', phone: '9842155016', address: 'Attur, Salem' },
  { name: 'K. Prakash', phone: '9842155017', address: 'Omalur, Salem' },
];

async function seedFull20MonthAudit() {
  console.log('🚀 Starting Full 20-Month Audit Seeding (20 Members x 20 Months x 3 Groups)...');

  // 1. Ensure all extra members exist in members table
  for (const m of extraMembersData) {
    const [existing] = await sql`SELECT id FROM members WHERE phone = ${m.phone} LIMIT 1;`;
    if (!existing) {
      await sql`
        INSERT INTO members (name, phone, whatsapp_phone, address, status)
        VALUES (${m.name}, ${m.phone}, ${m.phone}, ${m.address}, 'ACTIVE');
      `;
    }
  }

  const allMembers = await sql`SELECT id, name, phone FROM members WHERE status = 'ACTIVE' ORDER BY name;`;
  console.log(`✓ Database has ${allMembers.length} active registered members.`);

  // 2. Fetch Active Chit Groups
  const activeGroups = await sql`
    SELECT * FROM chit_groups WHERE status = 'ACTIVE' ORDER BY total_pot_value ASC;
  `;
  console.log(`✓ Found ${activeGroups.length} active chit groups:`, activeGroups.map(g => g.name).join(', '));

  // 3. For each active chit group, ensure exactly 20 active shares (Tickets 1 to 20)
  for (const group of activeGroups) {
    const existingShares = await sql`
      SELECT * FROM member_shares 
      WHERE chit_group_id = ${group.id} AND status = 'ACTIVE' 
      ORDER BY share_ticket_number ASC;
    `;
    console.log(`   Group '${group.name}': Currently has ${existingShares.length} shares. Ensuring 20 shares...`);

    const existingTickets = new Set(existingShares.map(s => Number(s.share_ticket_number)));
    let memberIdx = 0;

    for (let ticket = 1; ticket <= 20; ticket++) {
      if (!existingTickets.has(ticket)) {
        // Pick a member who isn't already in this group if possible, or cycle
        const assignedMember = allMembers[memberIdx % allMembers.length];
        memberIdx++;

        await sql`
          INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number, status, joined_before_start)
          VALUES (${group.id}, ${assignedMember.id}, ${ticket}, 'ACTIVE', TRUE);
        `;
      }
    }

    const updatedShares = await sql`
      SELECT COUNT(*)::int as count FROM member_shares 
      WHERE chit_group_id = ${group.id} AND status = 'ACTIVE';
    `;
    console.log(`   ✓ Group '${group.name}' now has exactly ${updatedShares[0].count} / 20 shares.`);
  }

  // 4. Seed Bidding (Auctions) for all 20 Months for each group
  // Strict 1-winner rule: 20 unique winning members per group across the 20 months!
  for (const group of activeGroups) {
    const pot = Number(group.total_pot_value);
    const shares = await sql`
      SELECT ms.id as share_id, ms.member_id, ms.share_ticket_number, m.name, ms.is_prized, ms.prized_month_number
      FROM member_shares ms
      JOIN members m ON ms.member_id = m.id
      WHERE ms.chit_group_id = ${group.id} AND ms.status = 'ACTIVE'
      ORDER BY ms.share_ticket_number ASC;
    `;

    console.log(`\n--- Seeding 20 Months Bidding & Math for '${group.name}' (Pot: ₹${pot.toLocaleString('en-IN')}) ---`);

    const existingAuctions = await sql`
      SELECT * FROM auctions WHERE chit_group_id = ${group.id} ORDER BY month_number ASC;
    `;
    const auctionedMonths = new Set(existingAuctions.map(a => Number(a.month_number)));
    const prizeWonMemberIds = new Set(existingAuctions.map(a => a.winning_member_id));

    // Realistic Tamil Nadu Bidding Curve over 20 months
    // Early months (1-5): High discount (e.g., 20-25% discount)
    // Mid months (6-14): Moderate discount (e.g., 10-18% discount)
    // Late months (15-20): Low discount nearing pot (e.g., 2-8% discount)
    for (let m = 1; m <= 20; m++) {
      let auction = existingAuctions.find(a => Number(a.month_number) === m);

      if (!auction) {
        // Find an eligible subscriber who hasn't won yet in this group
        const eligibleShare = shares.find(s => !prizeWonMemberIds.has(s.member_id));
        if (!eligibleShare) {
          console.warn(`Warning: No eligible unprized subscriber left for Month ${m} in group ${group.name}`);
          continue;
        }

        // Calculate realistic winning payout percentage based on month progression
        let payoutPct;
        if (m === 1) payoutPct = 0.75; // Month 1: 75% payout (25% Thalubadi)
        else if (m === 2) payoutPct = 0.77;
        else if (m === 3) payoutPct = 0.80;
        else if (m === 4) payoutPct = 0.82;
        else if (m === 5) payoutPct = 0.84;
        else if (m <= 10) payoutPct = 0.85 + (m - 6) * 0.015; // 85% to 91%
        else if (m <= 15) payoutPct = 0.92 + (m - 11) * 0.01; // 92% to 96%
        else payoutPct = 0.965 + (m - 16) * 0.007; // 96.5% to 99%

        const payoutAmount = Math.round(pot * payoutPct);
        const thalubadi = pot - payoutAmount;
        const kasiru = Math.round((pot * 5) / 100); // 5% foreman commission
        const netDiscount = Math.max(0, thalubadi - kasiru);
        const dividendPerShare = Math.floor(netDiscount / 20);
        const baseMonthly = Number(group.installment_base_amount);
        const netInstallmentDue = Math.max(0, baseMonthly - dividendPerShare);

        // Date calculation for the auction (spaced 1 month apart)
        const auctionDate = new Date(2025, m - 1, 15).toISOString().split('T')[0];

        const [newAuction] = await sql`
          INSERT INTO auctions (
            chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
            bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
            net_installment_due, payout_amount, notes
          ) VALUES (
            ${group.id}, ${m}, ${auctionDate}, ${eligibleShare.member_id}, ${eligibleShare.share_id},
            ${thalubadi}, ${kasiru}, ${netDiscount}, ${dividendPerShare},
            ${netInstallmentDue}, ${payoutAmount}, ${`Month ${m} Auction finalized. Payout: ₹${payoutAmount.toLocaleString('en-IN')}`}
          )
          RETURNING *;
        `;
        auction = newAuction;

        // Mark share as prized
        await sql`
          UPDATE member_shares 
          SET is_prized = TRUE, prized_month_number = ${m}
          WHERE id = ${eligibleShare.share_id};
        `;

        prizeWonMemberIds.add(eligibleShare.member_id);
      } else {
        prizeWonMemberIds.add(auction.winning_member_id);
      }
    }
    console.log(`   ✓ All 20 Months of Bidding Auctions finalized with 20 unique winners for '${group.name}'.`);
  }

  // 5. Seed Installments and Realistic Payment Records:
  // - completely paid in 1 payment
  // - completely paid in 2 split payments
  // - completely paid in 3 split payments
  // - partially paid
  // - pending
  console.log('\n--- Seeding 1,200 Installments and Payment Transactions Across 20 Months ---');

  let totalTransactionsCount = 0;
  let totalInstallmentsCount = 0;

  for (const group of activeGroups) {
    const baseMonthly = Number(group.installment_base_amount);
    const shares = await sql`
      SELECT ms.id as share_id, ms.member_id, ms.share_ticket_number, m.name, m.phone
      FROM member_shares ms
      JOIN members m ON ms.member_id = m.id
      WHERE ms.chit_group_id = ${group.id} AND ms.status = 'ACTIVE'
      ORDER BY ms.share_ticket_number ASC;
    `;

    const auctions = await sql`
      SELECT * FROM auctions WHERE chit_group_id = ${group.id} ORDER BY month_number ASC;
    `;

    for (let m = 1; m <= 20; m++) {
      const auction = auctions.find(a => Number(a.month_number) === m);
      const calculatedDue = auction ? Number(auction.net_installment_due) : baseMonthly;
      const dividendPerShare = auction ? Number(auction.dividend_per_share) : 0;
      const monthDate = new Date(2025, m - 1, 10);

      for (let sIdx = 0; sIdx < shares.length; sIdx++) {
        const share = shares[sIdx];
        totalInstallmentsCount++;

        // Determine payment profile for this member in this month:
        // m <= 15: Historical months (nearly all paid, with realistic 1, 2, or 3 splits)
        // m 16..18: Recent months (mostly paid, some partial, few pending)
        // m 19..20: Current / Active cycle (mix of paid, partial, pending)
        let paymentType; // 'COMPLETE_1' | 'COMPLETE_2' | 'COMPLETE_3' | 'PARTIAL' | 'PENDING'

        const rand = (sIdx * 17 + m * 23) % 100; // Deterministic pseudo-random distribution

        if (m <= 15) {
          if (rand < 55) paymentType = 'COMPLETE_1';
          else if (rand < 75) paymentType = 'COMPLETE_2';
          else if (rand < 90) paymentType = 'COMPLETE_3';
          else if (rand < 98) paymentType = 'COMPLETE_1';
          else paymentType = 'PARTIAL'; // 2% partial even in past
        } else if (m <= 18) {
          if (rand < 45) paymentType = 'COMPLETE_1';
          else if (rand < 65) paymentType = 'COMPLETE_2';
          else if (rand < 80) paymentType = 'COMPLETE_3';
          else if (rand < 92) paymentType = 'PARTIAL';
          else paymentType = 'PENDING';
        } else {
          // Current Months 19 & 20
          if (rand < 35) paymentType = 'COMPLETE_1';
          else if (rand < 55) paymentType = 'COMPLETE_2';
          else if (rand < 75) paymentType = 'PARTIAL';
          else paymentType = 'PENDING';
        }

        // Upsert installment record
        const [inst] = await sql`
          INSERT INTO installments (
            chit_group_id, month_number, member_id, share_id,
            base_amount, dividend_deduction, net_due_amount, paid_amount, status, last_payment_date
          ) VALUES (
            ${group.id}, ${m}, ${share.member_id}, ${share.share_id},
            ${baseMonthly}, ${dividendPerShare}, ${calculatedDue}, 0, 'PENDING', NULL
          )
          ON CONFLICT (chit_group_id, month_number, share_id)
          DO UPDATE SET
            dividend_deduction = ${dividendPerShare},
            net_due_amount = ${calculatedDue}
          RETURNING id, paid_amount, status;
        `;

        // Check if transactions already exist for this installment
        const existingTxs = await sql`
          SELECT id, amount_paid FROM payment_transactions WHERE installment_id = ${inst.id};
        `;

        if (existingTxs.length === 0) {
          const paymentMethods = ['GPAY', 'PHONEPE', 'CASH', 'BANK_TRANSFER'];
          const method1 = paymentMethods[(sIdx + m) % 4];
          const method2 = paymentMethods[(sIdx + m + 1) % 4];
          const method3 = paymentMethods[(sIdx + m + 2) % 4];

          if (paymentType === 'COMPLETE_1') {
            // 1 single full payment
            const pDate = new Date(monthDate.getTime() + (sIdx % 10) * 86400000).toISOString().split('T')[0];
            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${calculatedDue}, ${pDate}, ${method1}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}`}, 'Full payment in 1 installment');
            `;
            await sql`
              UPDATE installments SET paid_amount = ${calculatedDue}, status = 'PAID', last_payment_date = ${pDate} WHERE id = ${inst.id};
            `;
            totalTransactionsCount += 1;
          } else if (paymentType === 'COMPLETE_2') {
            // 2 split payments totaling full amount
            const part1 = Math.round(calculatedDue * 0.5);
            const part2 = calculatedDue - part1;
            const pDate1 = new Date(monthDate.getTime() + 4 * 86400000).toISOString().split('T')[0];
            const pDate2 = new Date(monthDate.getTime() + 18 * 86400000).toISOString().split('T')[0];

            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${part1}, ${pDate1}, ${method1}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-A`}, '1st split payment');
            `;
            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${part2}, ${pDate2}, ${method2}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-B`}, '2nd split clearance payment');
            `;
            await sql`
              UPDATE installments SET paid_amount = ${calculatedDue}, status = 'PAID', last_payment_date = ${pDate2} WHERE id = ${inst.id};
            `;
            totalTransactionsCount += 2;
          } else if (paymentType === 'COMPLETE_3') {
            // 3 split payments totaling full amount
            const part1 = Math.round(calculatedDue * 0.35);
            const part2 = Math.round(calculatedDue * 0.35);
            const part3 = calculatedDue - (part1 + part2);
            const pDate1 = new Date(monthDate.getTime() + 2 * 86400000).toISOString().split('T')[0];
            const pDate2 = new Date(monthDate.getTime() + 12 * 86400000).toISOString().split('T')[0];
            const pDate3 = new Date(monthDate.getTime() + 24 * 86400000).toISOString().split('T')[0];

            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${part1}, ${pDate1}, ${method1}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-P1`}, '1st installment of 3');
            `;
            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${part2}, ${pDate2}, ${method2}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-P2`}, '2nd installment of 3');
            `;
            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${part3}, ${pDate3}, ${method3}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-P3`}, '3rd final clearance');
            `;
            await sql`
              UPDATE installments SET paid_amount = ${calculatedDue}, status = 'PAID', last_payment_date = ${pDate3} WHERE id = ${inst.id};
            `;
            totalTransactionsCount += 3;
          } else if (paymentType === 'PARTIAL') {
            // Partially paid (e.g. 50-70% paid, rest remaining)
            const partialAmt = Math.round(calculatedDue * 0.6);
            const pDate = new Date(monthDate.getTime() + 8 * 86400000).toISOString().split('T')[0];
            await sql`
              INSERT INTO payment_transactions (installment_id, chit_group_id, member_id, share_id, amount_paid, payment_date, payment_method, receipt_number, notes)
              VALUES (${inst.id}, ${group.id}, ${share.member_id}, ${share.share_id}, ${partialAmt}, ${pDate}, ${method1}, ${`RCP-${group.name.slice(0, 2)}-M${m}-${share.share_ticket_number}-PRT`}, 'Partial payment recorded');
            `;
            await sql`
              UPDATE installments SET paid_amount = ${partialAmt}, status = 'PARTIAL', last_payment_date = ${pDate}, notes = 'Balance pending' WHERE id = ${inst.id};
            `;
            totalTransactionsCount += 1;
          }
          // PENDING: leave paid_amount = 0, status = 'PENDING'
        }
      }
    }
  }

  console.log(`\n🎉 Seeding Completed Successfully!`);
  console.log(`   • Total Installments in active cycles: ${totalInstallmentsCount}`);
  console.log(`   • Total Payment Transactions created: ${totalTransactionsCount}`);
}

seedFull20MonthAudit().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
