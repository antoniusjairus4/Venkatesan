import { sql } from '../src/server/db.mjs';

async function seedPastChitGroups() {
  console.log('Seeding Past Completed Chit Groups (Month Batch Mode)...');

  const allMembers = await sql`SELECT id, name, phone FROM members ORDER BY name;`;
  console.log(`Total available members: ${allMembers.length}`);

  // Define Completed Past Chit Groups
  const pastGroupsData = [
    {
      name: '1 Lakh (15 Jan 2024 - 15 Aug 2025)',
      pot: 100000,
      base: 5000,
      start_date: '2024-01-15',
      end_date: '2025-08-15',
      notes: 'Completed 20-month cycle. All 20 members settled with 100% recovery.',
    },
    {
      name: '1 Lakh (10 Jun 2022 - 10 Jan 2024)',
      pot: 100000,
      base: 5000,
      start_date: '2022-06-10',
      end_date: '2024-01-10',
      notes: 'Completed 20-month cycle. Fully audited and closed.',
    },
    {
      name: '2 Lakhs (01 Feb 2024 - 01 Sep 2025)',
      pot: 200000,
      base: 10000,
      start_date: '2024-02-01',
      end_date: '2025-09-01',
      notes: 'Completed 20-month high-value group. Zero bad debt, full settlement.',
    },
    {
      name: '3 Lakhs (01 Jan 2024 - 01 Aug 2025)',
      pot: 300000,
      base: 15000,
      start_date: '2024-01-01',
      end_date: '2025-08-01',
      notes: 'Premier 3L scheme successfully matured and disbursed.',
    },
  ];

  for (const pg of pastGroupsData) {
    let [group] = await sql`SELECT id FROM chit_groups WHERE name = ${pg.name} LIMIT 1;`;
    if (!group) {
      [group] = await sql`
        INSERT INTO chit_groups (
          name, total_pot_value, total_months, total_shares, installment_base_amount,
          commission_percent, status, start_date, end_date, notes
        ) VALUES (
          ${pg.name}, ${pg.pot}, 20, 20, ${pg.base},
          0.00, 'COMPLETED', ${pg.start_date}, ${pg.end_date}, ${pg.notes}
        )
        RETURNING id;
      `;
      console.log(`Created past group: ${pg.name} (${group.id})`);
    } else {
      console.log(`Group ${pg.name} already exists (${group.id}).`);
    }

    // Assign 20 shares (Tickets #1 to #20)
    const existingShares = await sql`SELECT id, share_ticket_number FROM member_shares WHERE chit_group_id = ${group.id};`;
    const shareMap = new Map();

    if (existingShares.length < 20) {
      for (let ticket = 1; ticket <= 20; ticket++) {
        const member = allMembers[(ticket - 1) % allMembers.length];
        const [share] = await sql`
          INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number, status, joined_before_start)
          VALUES (${group.id}, ${member.id}, ${ticket}, 'COMPLETED', true)
          ON CONFLICT (chit_group_id, share_ticket_number) DO UPDATE SET status = 'COMPLETED'
          RETURNING id, share_ticket_number, member_id;
        `;
        shareMap.set(ticket, share);
      }
    } else {
      existingShares.forEach(s => shareMap.set(s.share_ticket_number, s));
    }

    // Check installments
    const [instCount] = await sql`SELECT COUNT(*)::int as count FROM installments WHERE chit_group_id = ${group.id};`;
    if (instCount.count < 400) {
      console.log(`Generating 400 installments for ${pg.name}...`);
      await sql`DELETE FROM installments WHERE chit_group_id = ${group.id};`;

      const startDate = new Date(pg.start_date);

      // Insert month by month (20 queries per group)
      for (let month = 1; month <= 20; month++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + (month - 1));

        const monthRows = [];
        for (let ticket = 1; ticket <= 20; ticket++) {
          const member = allMembers[(ticket - 1) % allMembers.length];
          const share = shareMap.get(ticket);

          const isLate = (month === 3 && ticket === 4) || (month === 7 && ticket === 8) || (month === 12 && ticket === 15);
          const payDate = new Date(dueDate);
          if (isLate) {
            payDate.setDate(payDate.getDate() + 14);
          } else {
            payDate.setDate(payDate.getDate() + 2);
          }

          const notesText = isLate ? 'Cleared with 14 days delay after follow-up notice' : 'Prompt payment';

          monthRows.push({
            mId: member.id,
            sId: share ? share.id : null,
            payDate: payDate.toISOString().split('T')[0],
            notes: notesText,
          });
        }

        // Execute batch of 20 for this month
        await Promise.all(
          monthRows.map(row => sql`
            INSERT INTO installments (
              chit_group_id, month_number, member_id, share_id, base_amount,
              dividend_deduction, net_due_amount, paid_amount, status, last_payment_date, notes
            ) VALUES (
              ${group.id}, ${month}, ${row.mId}, ${row.sId}, ${pg.base},
              0, ${pg.base}, ${pg.base}, 'PAID', ${row.payDate}, ${row.notes}
            );
          `)
        );
      }
      console.log(`✓ 400 installments successfully generated for ${pg.name}`);
    } else {
      console.log(`✓ ${pg.name} already has ${instCount.count} installments.`);
    }
  }

  console.log('✅ Past Chit Groups seeding completed successfully!');
  process.exit(0);
}

seedPastChitGroups().catch((err) => {
  console.error('Error seeding past groups:', err);
  process.exit(1);
});

