import { sql } from '../src/server/db.mjs';

async function updateGroupNames() {
  console.log('--- Updating Chit Scheme Names ---');

  // 1. Rename groups
  await sql`UPDATE chit_groups SET name = '1 Lakh' WHERE total_pot_value = 100000 AND name LIKE '%1 Lakh%'`;
  console.log('✓ Renamed 1 Lakh group');

  await sql`UPDATE chit_groups SET name = '2 Lakhs' WHERE total_pot_value = 200000`;
  console.log('✓ Renamed 2 Lakhs group');

  await sql`UPDATE chit_groups SET name = '3 Lakhs' WHERE total_pot_value = 300000`;
  console.log('✓ Renamed 3 Lakhs group');

  // 2. Remove the old demo group
  const demoId = 'ec0ded22-894a-4b8f-b0df-7530336b05c8';
  await sql`DELETE FROM installments WHERE chit_group_id = ${demoId}`;
  await sql`DELETE FROM auctions WHERE chit_group_id = ${demoId}`;
  await sql`DELETE FROM member_shares WHERE chit_group_id = ${demoId}`;
  await sql`DELETE FROM chit_groups WHERE id = ${demoId}`;
  console.log('✓ Removed demo group');

  // 3. Query all remaining groups
  const groups = await sql`SELECT id, name, total_pot_value, status FROM chit_groups ORDER BY total_pot_value ASC`;
  console.log('\n--- Current Active Chit Schemes in Database ---');
  console.log(JSON.stringify(groups, null, 2));

  process.exit(0);
}

updateGroupNames().catch((err) => {
  console.error('Error updating groups:', err);
  process.exit(1);
});

