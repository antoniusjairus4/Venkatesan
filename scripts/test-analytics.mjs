import { sql } from '../src/server/db.mjs';

async function testAnalytics() {
  console.log('Testing Analytics queries against Neon DB...\n');

  try {
    const groups = await sql`SELECT id, name FROM chit_groups;`;
    console.log(`Found ${groups.length} groups in database.`);

    // 1. Test All Chits (Consolidated)
    const [collAll] = await sql`
      SELECT 
        COALESCE(SUM(paid_amount), 0)::numeric as collected,
        COALESCE(SUM(CASE WHEN status != 'PAID' THEN (net_due_amount - paid_amount) ELSE 0 END), 0)::numeric as pending
      FROM installments;
    `;
    console.log('\n1. Consolidated Collection Donut Data:');
    console.log(`   - Collected: ₹${Number(collAll.collected).toLocaleString('en-IN')}`);
    console.log(`   - Pending: ₹${Number(collAll.pending).toLocaleString('en-IN')}`);

    // 2. Test Specific Group if exists
    if (groups.length > 0) {
      const g = groups[0];
      const [collGrp] = await sql`
        SELECT 
          COALESCE(SUM(paid_amount), 0)::numeric as collected,
          COALESCE(SUM(CASE WHEN status != 'PAID' THEN (net_due_amount - paid_amount) ELSE 0 END), 0)::numeric as pending
        FROM installments
        WHERE chit_group_id = ${g.id};
      `;
      console.log(`\n2. Specific Scheme Filter ("${g.name}"):`);
      console.log(`   - Collected: ₹${Number(collGrp.collected).toLocaleString('en-IN')}`);
      console.log(`   - Pending: ₹${Number(collGrp.pending).toLocaleString('en-IN')}`);
    }

    // 3. Test Defaulter Aging
    const defaulters = await sql`
      SELECT 
        m.name,
        COUNT(i.id)::int as unpaid_count,
        SUM(i.net_due_amount - i.paid_amount)::numeric as pending_amount
      FROM installments i
      JOIN members m ON i.member_id = m.id
      WHERE i.status != 'PAID'
      GROUP BY m.id, m.name;
    `;
    console.log(`\n3. Defaulter Buckets Count: ${defaulters.length} overdue members.`);

    console.log('\n Analytics queries verified successfully!');
  } catch (err) {
    console.error('❌ Error testing analytics:', err);
    process.exit(1);
  }
}

testAnalytics();

