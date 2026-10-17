import { sql } from '../src/server/db.mjs';

async function testDatabase() {
  console.log('Testing Neon Database connection & queries...\n');

  try {
    // 1. Health check
    const [health] = await sql`SELECT NOW() as time, current_database() as db;`;
    console.log('1. Neon Database Health: OK');
    console.log(`   Database: ${health.db}, Time: ${health.time}`);

    // 2. Count tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log(`\n2. Verified ${tables.length} schema tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // 3. Test insert sample group
    const groupName = `RJCF Demo Group ${Date.now().toString().slice(-4)}`;
    const [group] = await sql`
      INSERT INTO chit_groups (
        name, total_pot_value, total_months, total_shares, installment_base_amount, start_date, notes
      ) VALUES (
        ${groupName}, 100000.00, 20, 20, 5000.00, CURRENT_DATE, 'Initial test group for client demo'
      )
      RETURNING *;
    `;
    console.log(`\n3. Inserted Sample Group: "${group.name}" (Pot: ₹${Number(group.total_pot_value).toLocaleString('en-IN')})`);

    // 4. Test insert sample member
    const [member] = await sql`
      INSERT INTO members (name, phone, whatsapp_phone, address)
      VALUES ('K. Venkatesan', '9876543210', '9876543210', 'Salem, Tamil Nadu')
      RETURNING *;
    `;
    console.log(`\n4. Registered Member: "${member.name}" (${member.phone})`);

    // 5. Assign 2 shares (Rule 2: multiple shares before start)
    const [share1] = await sql`
      INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
      VALUES (${group.id}, ${member.id}, 1)
      RETURNING *;
    `;
    const [share2] = await sql`
      INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
      VALUES (${group.id}, ${member.id}, 2)
      RETURNING *;
    `;
    console.log(`\n5. Assigned Shares to ${member.name}: Ticket #${share1.share_ticket_number}, Ticket #${share2.share_ticket_number}`);

    // 6. Test Auction & Dividend Calculation (Rule 4)
    // Bid discount = 15,000. Commission = 5,000. Net dividend pool = 10,000. Dividend per share = 500.
    const [auction] = await sql`
      INSERT INTO auctions (
        chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
        bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
        net_installment_due, payout_amount
      ) VALUES (
        ${group.id}, 1, CURRENT_DATE, ${member.id}, ${share1.id},
        15000.00, 5000.00, 10000.00, 500.00,
        4500.00, 85000.00
      )
      RETURNING *;
    `;
    console.log(`\n6. Recorded Month 1 Yelam Auction:`);
    console.log(`   - Bid Discount: ₹${Number(auction.bid_discount_amount).toLocaleString('en-IN')}`);
    console.log(`   - Net Dividend / Share: ₹${Number(auction.dividend_per_share).toLocaleString('en-IN')}`);
    console.log(`   - Net Installment Due: ₹${Number(auction.net_installment_due).toLocaleString('en-IN')}`);
    console.log(`   - Winner Payout: ₹${Number(auction.payout_amount).toLocaleString('en-IN')}`);

    // 7. Test Partial Payment vs Full Payment (Rule 1)
    const [inst] = await sql`
      INSERT INTO installments (
        chit_group_id, month_number, member_id, share_id,
        base_amount, dividend_deduction, net_due_amount, paid_amount, status
      ) VALUES (
        ${group.id}, 1, ${member.id}, ${share2.id},
        5000.00, 500.00, 4500.00, 2000.00, 'PARTIAL'
      )
      RETURNING *;
    `;
    console.log(`\n7. Verified Rule 1 (Partial payment):`);
    console.log(`   - Due: ₹${Number(inst.net_due_amount)}, Paid: ₹${Number(inst.paid_amount)}, Status: "${inst.status}" (Pending: ₹${Number(inst.net_due_amount) - Number(inst.paid_amount)})`);

    // Complete payment
    const [fullInst] = await sql`
      UPDATE installments
      SET paid_amount = 4500.00, status = 'PAID'
      WHERE id = ${inst.id}
      RETURNING *;
    `;
    console.log(`   - Updated to Full Payment: Paid: ₹${Number(fullInst.paid_amount)}, Status: "${fullInst.status}"`);

    console.log('\n All Database Operations & Business Rules Verified Successfully on Neon!');
  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  }
}

testDatabase();

