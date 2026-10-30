import express from 'express';
import { sql } from './db.mjs';

export const apiRouter = express.Router();
apiRouter.use(express.json());

// ------------------------------------------------------------
// Health Check
// ------------------------------------------------------------
apiRouter.get('/health', async (req, res) => {
  try {
    const result = await sql`SELECT NOW() as current_time, current_database() as db_name;`;
    res.json({
      status: 'ok',
      database: 'connected',
      details: result[0],
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ------------------------------------------------------------
// Dashboard Stats
// ------------------------------------------------------------
apiRouter.get('/dashboard-summary', async (req, res) => {
  try {
    const [groupsCount] = await sql`SELECT COUNT(*)::int as count FROM chit_groups;`;
    const [membersCount] = await sql`SELECT COUNT(*)::int as count FROM members;`;
    const [activeChits] = await sql`SELECT COUNT(*)::int as count FROM chit_groups WHERE status = 'ACTIVE' AND (moved_as_completed IS FALSE OR moved_as_completed IS NULL);`;
    const [collections] = await sql`SELECT COALESCE(SUM(amount_paid), 0)::numeric as total FROM payment_transactions;`;
    const [pendingDues] = await sql`SELECT COALESCE(SUM(net_due_amount - paid_amount), 0)::numeric as total FROM installments WHERE status != 'PAID';`;

    res.json({
      totalGroups: groupsCount.count,
      totalMembers: membersCount.count,
      activeChits: activeChits.count,
      totalCollected: Number(collections.total),
      totalPendingDues: Number(pendingDues.total),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// Analytics & Visualizations (Charts 1, 2, and 6)
// Supports optional filter: ?chit_group_id=UUID
// ------------------------------------------------------------
apiRouter.get('/analytics', async (req, res) => {
  try {
    const { chit_group_id } = req.query;
    const isSpecificGroup = chit_group_id && chit_group_id !== 'ALL';

    // 1. Collection Status (Donut Chart)
    const collectionQuery = isSpecificGroup
      ? sql`
          SELECT 
            COALESCE(SUM(paid_amount), 0)::numeric as collected,
            COALESCE(SUM(CASE WHEN status != 'PAID' THEN (net_due_amount - paid_amount) ELSE 0 END), 0)::numeric as pending
          FROM installments
          WHERE chit_group_id = ${chit_group_id};
        `
      : sql`
          SELECT 
            COALESCE(SUM(paid_amount), 0)::numeric as collected,
            COALESCE(SUM(CASE WHEN status != 'PAID' THEN (net_due_amount - paid_amount) ELSE 0 END), 0)::numeric as pending
          FROM installments;
        `;
    const [collRes] = await collectionQuery;
    const collected = Number(collRes?.collected || 0);
    const pending = Number(collRes?.pending || 0);
    const totalDue = collected + pending;
    const percentage = totalDue > 0 ? Math.round((collected / totalDue) * 100) : 0;

    // 2. Cash Inflow vs Outflow by Month (Dual Bar Chart) - Optimized parallel aggregation
    const inflowQuery = isSpecificGroup
      ? sql`
          SELECT i.month_number, COALESCE(SUM(pt.amount_paid), 0)::numeric as total
          FROM payment_transactions pt
          JOIN installments i ON pt.installment_id = i.id
          WHERE i.month_number <= 6 AND i.chit_group_id = ${chit_group_id}
          GROUP BY i.month_number;
        `
      : sql`
          SELECT i.month_number, COALESCE(SUM(pt.amount_paid), 0)::numeric as total
          FROM payment_transactions pt
          JOIN installments i ON pt.installment_id = i.id
          WHERE i.month_number <= 6
          GROUP BY i.month_number;
        `;

    const outflowQuery = isSpecificGroup
      ? sql`
          SELECT month_number, COALESCE(SUM(payout_amount), 0)::numeric as total
          FROM auctions
          WHERE month_number <= 6 AND chit_group_id = ${chit_group_id}
          GROUP BY month_number;
        `
      : sql`
          SELECT month_number, COALESCE(SUM(payout_amount), 0)::numeric as total
          FROM auctions
          WHERE month_number <= 6
          GROUP BY month_number;
        `;

    // 3. Defaulter Aging & Risk Buckets (Chart 6)
    const defaultersQuery = isSpecificGroup
      ? sql`
          SELECT 
            m.id as member_id,
            m.name as member_name,
            m.phone as phone,
            g.name as group_name,
            COUNT(i.id)::int as unpaid_count,
            SUM(i.net_due_amount - i.paid_amount)::numeric as pending_amount
          FROM installments i
          JOIN members m ON i.member_id = m.id
          JOIN chit_groups g ON i.chit_group_id = g.id
          WHERE i.status != 'PAID' AND i.chit_group_id = ${chit_group_id}
          GROUP BY m.id, m.name, m.phone, g.name
          ORDER BY unpaid_count DESC, pending_amount DESC;
        `
      : sql`
          SELECT 
            m.id as member_id,
            m.name as member_name,
            m.phone as phone,
            g.name as group_name,
            COUNT(i.id)::int as unpaid_count,
            SUM(i.net_due_amount - i.paid_amount)::numeric as pending_amount
          FROM installments i
          JOIN members m ON i.member_id = m.id
          JOIN chit_groups g ON i.chit_group_id = g.id
          WHERE i.status != 'PAID'
          GROUP BY m.id, m.name, m.phone, g.name
          ORDER BY unpaid_count DESC, pending_amount DESC;
        `;

    const [inflows, outflows, defaulterRows] = await Promise.all([
      inflowQuery,
      outflowQuery,
      defaultersQuery,
    ]);

    const inflowMap = new Map(inflows.map((r) => [Number(r.month_number), Number(r.total)]));
    const outflowMap = new Map(outflows.map((r) => [Number(r.month_number), Number(r.total)]));

    const monthsData = [];
    for (let m = 1; m <= 6; m++) {
      monthsData.push({
        month: `M${m}`,
        inflow: inflowMap.get(m) || 0,
        outflow: outflowMap.get(m) || 0,
      });
    }

    let bucket1Count = 0;
    let bucket1Amount = 0;
    let bucket2Count = 0;
    let bucket2Amount = 0;
    let bucket3Count = 0;
    let bucket3Amount = 0;

    const defaultersList = defaulterRows.map((r) => {
      const unpaidCount = Number(r.unpaid_count);
      const pendingAmt = Number(r.pending_amount);

      if (unpaidCount === 1) {
        bucket1Count++;
        bucket1Amount += pendingAmt;
      } else if (unpaidCount === 2) {
        bucket2Count++;
        bucket2Amount += pendingAmt;
      } else {
        bucket3Count++;
        bucket3Amount += pendingAmt;
      }

      return {
        memberId: r.member_id,
        memberName: r.member_name,
        phone: r.phone,
        groupName: r.group_name,
        unpaidCount,
        pendingAmount: pendingAmt,
        riskLevel: unpaidCount >= 3 ? 'CRITICAL' : unpaidCount === 2 ? 'MODERATE' : 'MILD',
      };
    });

    res.json({
      collection: {
        collected,
        pending,
        totalDue,
        percentage,
      },
      cashflow: monthsData,
      defaulters: {
        bucket1: { count: bucket1Count, amount: bucket1Amount },
        bucket2: { count: bucket2Count, amount: bucket2Amount },
        bucket3: { count: bucket3Count, amount: bucket3Amount },
        list: defaultersList,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// Chit Groups
// ------------------------------------------------------------
apiRouter.get('/chit-groups', async (req, res) => {
  try {
    const { status } = req.query;
    let groups;

    if (status === 'ALL') {
      groups = await sql`
        SELECT 
          g.*,
          COUNT(s.id)::int as enrolled_shares
        FROM chit_groups g
        LEFT JOIN member_shares s ON g.id = s.chit_group_id
        GROUP BY g.id
        ORDER BY g.total_pot_value ASC, g.created_at ASC;
      `;
    } else if (status === 'COMPLETED') {
      groups = await sql`
        SELECT 
          g.*,
          COUNT(s.id)::int as enrolled_shares
        FROM chit_groups g
        LEFT JOIN member_shares s ON g.id = s.chit_group_id
        WHERE g.status = 'COMPLETED' OR g.moved_as_completed = TRUE
        GROUP BY g.id
        ORDER BY g.total_pot_value ASC, g.created_at ASC;
      `;
    } else if (status) {
      groups = await sql`
        SELECT 
          g.*,
          COUNT(s.id)::int as enrolled_shares
        FROM chit_groups g
        LEFT JOIN member_shares s ON g.id = s.chit_group_id
        WHERE g.status = ${status} AND (g.moved_as_completed IS FALSE OR g.moved_as_completed IS NULL)
        GROUP BY g.id
        ORDER BY g.total_pot_value ASC, g.created_at ASC;
      `;
    } else {
      // Default to ACTIVE groups only so active views never get polluted by archived data
      groups = await sql`
        SELECT 
          g.*,
          COUNT(s.id)::int as enrolled_shares
        FROM chit_groups g
        LEFT JOIN member_shares s ON g.id = s.chit_group_id
        WHERE (g.status = 'ACTIVE' OR g.status = 'UPCOMING') AND (g.moved_as_completed IS FALSE OR g.moved_as_completed IS NULL)
        GROUP BY g.id
        ORDER BY g.total_pot_value ASC, g.created_at ASC;
      `;
    }

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/chit-groups/:id/subscribers', async (req, res) => {
  try {
    const { id } = req.params;
    const subscribers = await sql`
      SELECT 
        m.id as member_id,
        m.name as member_name,
        m.phone,
        m.whatsapp_phone,
        m.address,
        COUNT(s.id)::int as shares_count,
        ARRAY_AGG(s.share_ticket_number ORDER BY s.share_ticket_number) as ticket_numbers,
        BOOL_OR(s.is_prized) as is_prized_winner,
        MAX(s.prized_month_number) as prized_month_number,
        COALESCE(inst_agg.total_paid, 0)::numeric as total_paid,
        COALESCE(inst_agg.total_pending, 0)::numeric as total_pending
      FROM member_shares s
      JOIN members m ON s.member_id = m.id
      LEFT JOIN (
        SELECT 
          member_id,
          SUM(CASE WHEN status = 'PAID' THEN paid_amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status != 'PAID' THEN (net_due_amount - paid_amount) ELSE 0 END) as total_pending
        FROM installments
        WHERE chit_group_id = ${id}
        GROUP BY member_id
      ) inst_agg ON inst_agg.member_id = m.id
      WHERE s.chit_group_id = ${id}
      GROUP BY m.id, m.name, m.phone, m.whatsapp_phone, m.address, inst_agg.total_paid, inst_agg.total_pending
      ORDER BY MIN(s.share_ticket_number) ASC;
    `;
    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// Past Chit Groups / Historical Archives (Read-Only)
// ------------------------------------------------------------
apiRouter.get('/past-chit-groups', async (req, res) => {
  try {
    const groups = await sql`
      SELECT 
        g.id,
        g.name,
        g.total_pot_value,
        g.total_months,
        g.total_shares,
        g.installment_base_amount,
        g.status,
        g.start_date,
        g.end_date,
        g.notes,
        g.moved_as_completed,
        g.moved_as_completed_at,
        (SELECT COUNT(*)::int FROM member_shares s WHERE s.chit_group_id = g.id) as member_count,
        (SELECT COALESCE(SUM(paid_amount), 0)::numeric FROM installments i WHERE i.chit_group_id = g.id) as total_collected,
        (SELECT COUNT(*)::int FROM installments i WHERE i.chit_group_id = g.id) as total_installments,
        (SELECT COUNT(*)::int FROM installments i WHERE i.chit_group_id = g.id AND (i.notes ILIKE '%delay%' OR i.notes ILIKE '%late%')) as late_payments_count
      FROM chit_groups g
      WHERE g.status = 'COMPLETED' OR g.moved_as_completed = TRUE
      ORDER BY g.total_pot_value ASC, g.start_date DESC;
    `;
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/past-chit-groups/:id/snapshot', async (req, res) => {
  try {
    const { id } = req.params;

    // Run all 5 queries in parallel with Promise.all for ultra-fast single round-trip
    const [
      [group],
      timeline,
      members,
      late_payments,
      installments,
    ] = await Promise.all([
      // 1. Group info
      sql`SELECT * FROM chit_groups WHERE id = ${id};`,

      // 2. Timeline across all 20 months
      sql`
        SELECT 
          month_number,
          COUNT(id)::int as installment_count,
          COALESCE(SUM(paid_amount), 0)::numeric as collected_amount,
          COALESCE(SUM(net_due_amount), 0)::numeric as expected_amount,
          COUNT(CASE WHEN notes ILIKE '%delay%' OR notes ILIKE '%late%' THEN 1 END)::int as late_count
        FROM installments
        WHERE chit_group_id = ${id}
        GROUP BY month_number
        ORDER BY month_number ASC;
      `,

      // 3. Member list with their ticket, total paid, and late occurrences
      sql`
        SELECT 
          m.id as member_id,
          m.name as member_name,
          m.phone,
          m.address,
          s.share_ticket_number,
          s.id as share_id,
          COALESCE(SUM(i.paid_amount), 0)::numeric as total_paid,
          COUNT(CASE WHEN i.notes ILIKE '%delay%' OR i.notes ILIKE '%late%' THEN 1 END)::int as late_count,
          BOOL_OR(COALESCE(s.is_prized, false)) as is_prized
        FROM member_shares s
        JOIN members m ON s.member_id = m.id
        LEFT JOIN installments i ON i.share_id = s.id AND i.chit_group_id = ${id}
        WHERE s.chit_group_id = ${id}
        GROUP BY m.id, m.name, m.phone, m.address, s.share_ticket_number, s.id
        ORDER BY s.share_ticket_number ASC;
      `,

      // 4. Late payments list
      sql`
        SELECT 
          i.id,
          i.month_number,
          m.name as member_name,
          m.phone as member_phone,
          s.share_ticket_number,
          i.net_due_amount,
          i.paid_amount,
          i.last_payment_date,
          i.notes
        FROM installments i
        JOIN members m ON i.member_id = m.id
        JOIN member_shares s ON i.share_id = s.id
        WHERE i.chit_group_id = ${id} AND (i.notes ILIKE '%delay%' OR i.notes ILIKE '%late%')
        ORDER BY i.month_number ASC, s.share_ticket_number ASC;
      `,

      // 5. Complete installments ledger (for export generation)
      sql`
        SELECT 
          i.id,
          i.month_number,
          s.share_ticket_number,
          m.name as member_name,
          m.phone as member_phone,
          i.base_amount,
          i.dividend_deduction,
          i.net_due_amount,
          i.paid_amount,
          i.status,
          i.last_payment_date,
          i.notes
        FROM installments i
        JOIN members m ON i.member_id = m.id
        JOIN member_shares s ON i.share_id = s.id
        WHERE i.chit_group_id = ${id}
        ORDER BY i.month_number ASC, s.share_ticket_number ASC;
      `,
    ]);

    if (!group) {
      return res.status(404).json({ error: 'Past chit group not found.' });
    }

    // Calculate aggregated metrics
    const totalCollected = installments.reduce((acc, row) => acc + Number(row.paid_amount || 0), 0);
    const totalInstallments = installments.length;
    const latePaymentsCount = late_payments.length;

    res.json({
      group,
      metrics: {
        member_count: members.length || Number(group.total_shares || 20),
        total_collected: totalCollected,
        total_installments: totalInstallments,
        late_payments_count: latePaymentsCount,
        completion_status: group.status || 'COMPLETED',
        start_date: group.start_date,
        end_date: group.end_date,
      },
      timeline,
      members,
      late_payments,
      installments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/chit-groups', async (req, res) => {
  try {
    const { name, total_pot_value, total_months, start_date, notes } = req.body;
    const totalPot = Number(total_pot_value);
    const months = Number(total_months) || 20;
    const totalShares = 20; // Standard 20 months & 20 members/shares per scheme
    const baseAmount = totalPot / months;

    const [newGroup] = await sql`
      INSERT INTO chit_groups (
        name, total_pot_value, total_months, total_shares, installment_base_amount, start_date, notes
      ) VALUES (
        ${name}, ${totalPot}, ${months}, ${totalShares}, ${baseAmount}, ${start_date}, ${notes || null}
      )
      RETURNING *;
    `;

    // Log Activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES ('GROUP_CREATED', ${newGroup.id}, ${newGroup.id}, ${`Created chit group "${name}" of ₹${totalPot.toLocaleString('en-IN')}`});
    `;

    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// Members
// ------------------------------------------------------------
apiRouter.get('/members', async (req, res) => {
  try {
    const members = await sql`
      SELECT 
        m.*,
        COUNT(s.id)::int as total_shares_held,
        STRING_AGG(DISTINCT cg.name, ', ') as enrolled_schemes,
        STRING_AGG(DISTINCT CONCAT(cg.name, ' (#', s.share_ticket_number, ')'), ', ') as ticket_details
      FROM members m
      LEFT JOIN member_shares s ON m.id = s.member_id
      LEFT JOIN chit_groups cg ON s.chit_group_id = cg.id
      GROUP BY m.id
      ORDER BY m.name ASC;
    `;
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/members', async (req, res) => {
  try {
    const {
      name,
      phone,
      whatsapp_phone,
      address,
      id_proof_type,
      id_proof_number,
      chit_group_id,
      share_count,
      enrolled_schemes,
    } = req.body;

    const [newMember] = await sql`
      INSERT INTO members (name, phone, whatsapp_phone, address, id_proof_type, id_proof_number)
      VALUES (${name}, ${phone}, ${whatsapp_phone || phone}, ${address || null}, ${id_proof_type || null}, ${id_proof_number || null})
      RETURNING *;
    `;

    // Normalize schemes to enroll: support enrolled_schemes array or single chit_group_id
    const schemesToEnroll = enrolled_schemes && Array.isArray(enrolled_schemes) && enrolled_schemes.length > 0
      ? enrolled_schemes
      : (chit_group_id ? [{ chit_group_id, share_count: Number(share_count) || 1 }] : []);

    for (const scheme of schemesToEnroll) {
      const gid = scheme.chit_group_id;
      const count = Number(scheme.share_count) || 1;

      const existing = await sql`SELECT share_ticket_number FROM member_shares WHERE chit_group_id = ${gid};`;
      const taken = new Set(existing.map((e) => e.share_ticket_number));
      let ticket = 1;

      for (let i = 0; i < count; i++) {
        while (taken.has(ticket)) ticket++;
        taken.add(ticket);
        const [newShare] = await sql`
          INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
          VALUES (${gid}, ${newMember.id}, ${ticket})
          RETURNING *;
        `;
        ticket++;

        // Automatically generate installment(s) for the new share so it appears in Record Payment immediately
        const existingMonths = await sql`
          SELECT DISTINCT month_number, base_amount, dividend_deduction, net_due_amount
          FROM installments
          WHERE chit_group_id = ${gid}
          ORDER BY month_number ASC;
        `;

        if (existingMonths.length > 0) {
          for (const m of existingMonths) {
            await sql`
              INSERT INTO installments (
                chit_group_id, month_number, member_id, share_id,
                base_amount, dividend_deduction, net_due_amount, paid_amount, status
              ) VALUES (
                ${gid}, ${m.month_number}, ${newMember.id}, ${newShare.id},
                ${m.base_amount}, ${m.dividend_deduction}, ${m.net_due_amount}, 0, 'PENDING'
              )
              ON CONFLICT (chit_group_id, month_number, share_id) DO NOTHING;
            `;
          }
        } else {
          const [group] = await sql`SELECT * FROM chit_groups WHERE id = ${gid};`;
          if (group) {
            await sql`
              INSERT INTO installments (
                chit_group_id, month_number, member_id, share_id,
                base_amount, dividend_deduction, net_due_amount, paid_amount, status
              ) VALUES (
                ${gid}, 1, ${newMember.id}, ${newShare.id},
                ${group.installment_base_amount}, 0, ${group.installment_base_amount}, 0, 'PENDING'
              )
              ON CONFLICT (chit_group_id, month_number, share_id) DO NOTHING;
            `;
          }
        }
      }
    }

    // Log Activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, description)
      VALUES ('MEMBER_ADDED', ${newMember.id}, ${`Registered member "${name}" (${phone})${schemesToEnroll.length > 0 ? ` enrolled in ${schemesToEnroll.length} scheme(s)` : ''}`});
    `;

    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// RULE 2: Multiple Chit Shares at Inception
// Member can join with 1, 2, 5 shares before chit starts.
// Cannot add shares midway once chit is ACTIVE.
// ------------------------------------------------------------
apiRouter.post('/member-shares', async (req, res) => {
  try {
    const { chit_group_id, member_id, share_count } = req.body;

    // Verify chit status
    const [group] = await sql`SELECT status, total_shares FROM chit_groups WHERE id = ${chit_group_id};`;
    if (!group) {
      return res.status(404).json({ error: 'Chit group not found.' });
    }
    if (group.status !== 'UPCOMING') {
      return res.status(400).json({
        error: 'Rule 2 Violation: Shares can only be assigned before the chit group starts. Mid-term share additions are strictly prohibited.'
      });
    }

    // Get current taken tickets
    const existing = await sql`SELECT share_ticket_number FROM member_shares WHERE chit_group_id = ${chit_group_id};`;
    const taken = new Set(existing.map((e) => e.share_ticket_number));

    const count = Number(share_count);
    const created = [];
    let ticket = 1;

    for (let i = 0; i < count; i++) {
      while (taken.has(ticket)) {
        ticket++;
      }
      if (ticket > group.total_shares) {
        return res.status(400).json({ error: `Not enough tickets remaining in group. Maximum shares: ${group.total_shares}` });
      }
      taken.add(ticket);

      const [newShare] = await sql`
        INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
        VALUES (${chit_group_id}, ${member_id}, ${ticket})
        RETURNING *;
      `;
      created.push(newShare);
      ticket++;

      // Automatically generate installment(s) for the new share
      const existingMonths = await sql`
        SELECT DISTINCT month_number, base_amount, dividend_deduction, net_due_amount
        FROM installments
        WHERE chit_group_id = ${chit_group_id}
        ORDER BY month_number ASC;
      `;

      if (existingMonths.length > 0) {
        for (const m of existingMonths) {
          await sql`
            INSERT INTO installments (
              chit_group_id, month_number, member_id, share_id,
              base_amount, dividend_deduction, net_due_amount, paid_amount, status
            ) VALUES (
              ${chit_group_id}, ${m.month_number}, ${member_id}, ${newShare.id},
              ${m.base_amount}, ${m.dividend_deduction}, ${m.net_due_amount}, 0, 'PENDING'
            )
            ON CONFLICT (chit_group_id, month_number, share_id) DO NOTHING;
          `;
        }
      } else {
        const [grp] = await sql`SELECT * FROM chit_groups WHERE id = ${chit_group_id};`;
        if (grp) {
          await sql`
            INSERT INTO installments (
              chit_group_id, month_number, member_id, share_id,
              base_amount, dividend_deduction, net_due_amount, paid_amount, status
            ) VALUES (
              ${chit_group_id}, 1, ${member_id}, ${newShare.id},
              ${grp.installment_base_amount}, 0, ${grp.installment_base_amount}, 0, 'PENDING'
            )
            ON CONFLICT (chit_group_id, month_number, share_id) DO NOTHING;
          `;
        }
      }
    }

    res.status(201).json({ success: true, count: created.length, shares: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// RULE 1: Monthly Installments & Payment Recording
// Marked as 'PAID' strictly when the full balance is cleared.
// ------------------------------------------------------------
apiRouter.get('/installments', async (req, res) => {
  try {
    const { chit_group_id, month_number, status } = req.query;

    let rows;
    if (chit_group_id && month_number) {
      rows = await sql`
        SELECT 
          i.*,
          m.name as member_name,
          m.phone as member_phone,
          g.name as group_name,
          s.share_ticket_number
        FROM installments i
        JOIN members m ON i.member_id = m.id
        JOIN chit_groups g ON i.chit_group_id = g.id
        JOIN member_shares s ON i.share_id = s.id
        WHERE i.chit_group_id = ${chit_group_id} AND i.month_number = ${Number(month_number)}
        ORDER BY g.name, i.month_number, s.share_ticket_number;
      `;
    } else if (chit_group_id) {
      rows = await sql`
        SELECT 
          i.*,
          m.name as member_name,
          m.phone as member_phone,
          g.name as group_name,
          s.share_ticket_number
        FROM installments i
        JOIN members m ON i.member_id = m.id
        JOIN chit_groups g ON i.chit_group_id = g.id
        JOIN member_shares s ON i.share_id = s.id
        WHERE i.chit_group_id = ${chit_group_id}
        ORDER BY g.name, i.month_number, s.share_ticket_number;
      `;
    } else {
      // By default without a specific group ID, return only installments belonging to ACTIVE groups
      rows = await sql`
        SELECT 
          i.*,
          m.name as member_name,
          m.phone as member_phone,
          g.name as group_name,
          s.share_ticket_number
        FROM installments i
        JOIN members m ON i.member_id = m.id
        JOIN chit_groups g ON i.chit_group_id = g.id
        JOIN member_shares s ON i.share_id = s.id
        WHERE g.status = 'ACTIVE'
        ORDER BY g.name, i.month_number, s.share_ticket_number;
      `;
    }

    if (status) {
      rows = rows.filter((r) => r.status === status);
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/record-payment', async (req, res) => {
  try {
    const { installment_id, amount_paid, payment_method, receipt_number, notes, payment_date, expected_payment_date } = req.body;
    const amount = Number(amount_paid);

    if (amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    // Fetch installment
    const [inst] = await sql`SELECT * FROM installments WHERE id = ${installment_id};`;
    if (!inst) {
      return res.status(404).json({ error: 'Installment record not found.' });
    }

    const currentPaid = Number(inst.paid_amount);
    const netDue = Number(inst.net_due_amount);
    const newPaidTotal = currentPaid + amount;
    const remaining = netDue - newPaidTotal;

    // Rule 1: Only 'PAID' if full amount is cleared. Otherwise 'PARTIAL'.
    const newStatus = remaining <= 0 ? 'PAID' : 'PARTIAL';
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const nextExpected = remaining > 0 ? (expected_payment_date || null) : null;

    // Update installment
    const [updatedInst] = await sql`
      UPDATE installments
      SET 
        paid_amount = ${newPaidTotal},
        status = ${newStatus},
        last_payment_date = ${payDate},
        expected_payment_date = ${nextExpected},
        updated_at = NOW()
      WHERE id = ${installment_id}
      RETURNING *;
    `;

    // Record Transaction
    const [tx] = await sql`
      INSERT INTO payment_transactions (
        installment_id, chit_group_id, member_id, share_id,
        amount_paid, payment_date, payment_method, receipt_number, notes
      ) VALUES (
        ${installment_id}, ${inst.chit_group_id}, ${inst.member_id}, ${inst.share_id},
        ${amount}, ${payDate}, ${payment_method || 'CASH'}, ${receipt_number || null}, ${notes || null}
      )
      RETURNING *;
    `;

    // Record Activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'PAYMENT_RECORDED', ${tx.id}, ${inst.chit_group_id},
        ${`Recorded payment of ₹${amount.toLocaleString('en-IN')} on ${payDate} via ${payment_method || 'CASH'} (Status: ${newStatus}, Remaining: ₹${Math.max(0, remaining)}${nextExpected ? `, Promised Next Due: ${nextExpected}` : ''})`}
      );
    `;

    res.json({
      success: true,
      installment: updatedInst,
      transaction: tx,
      rule_status: newStatus,
      remaining_balance: Math.max(0, remaining),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// RULE 4 & RULE 5: Monthly Auction ("Yelam") & Dividends
// Hammer discount changes monthly. Net dividend distributed.
// Final month payout capped by auction/nomination.
// ------------------------------------------------------------
apiRouter.get('/auctions', async (req, res) => {
  try {
    const auctions = await sql`
      SELECT 
        a.*,
        g.name as group_name,
        m.name as winning_member_name,
        m.phone as winning_member_phone,
        s.share_ticket_number
      FROM auctions a
      JOIN chit_groups g ON a.chit_group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      JOIN member_shares s ON a.winning_share_id = s.id
      ORDER BY a.created_at DESC;
    `;
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/record-auction', async (req, res) => {
  try {
    const {
      chit_group_id,
      month_number,
      auction_date,
      winning_member_id,
      winning_share_id,
      bid_discount_amount,
      notes,
    } = req.body;

    const [group] = await sql`SELECT * FROM chit_groups WHERE id = ${chit_group_id};`;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    const totalPot = Number(group.total_pot_value);
    const totalShares = Number(group.total_shares);
    const baseInstallment = Number(group.installment_base_amount);
    const commissionPercent = Number(group.commission_percent || 0.0);

    const bidDiscount = Number(bid_discount_amount);
    const organizerCommission = (totalPot * commissionPercent) / 100;
    const netDividendPool = Math.max(0, bidDiscount - organizerCommission);
    const dividendPerShare = netDividendPool / totalShares;
    const netInstallmentDue = baseInstallment - dividendPerShare;
    
    // Payout amount = Pot value - Bid Discount (Rule 5 ensures it is capped)
    const payoutAmount = totalPot - bidDiscount;

    // Auto-resolve or assign share for the winning member
    let winningShareId = winning_share_id;
    if (!winningShareId || winningShareId === '00000000-0000-0000-0000-000000000000') {
      const [found] = await sql`
        SELECT id FROM member_shares 
        WHERE chit_group_id = ${chit_group_id} AND member_id = ${winning_member_id}
        LIMIT 1;
      `;
      if (found) {
        winningShareId = found.id;
      } else {
        const [assigned] = await sql`
          INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
          VALUES (${chit_group_id}, ${winning_member_id}, (SELECT COALESCE(MAX(share_ticket_number), 0) + 1 FROM member_shares WHERE chit_group_id = ${chit_group_id}))
          RETURNING id;
        `;
        winningShareId = assigned.id;
      }
    }

    // Record Auction
    const [auction] = await sql`
      INSERT INTO auctions (
        chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
        bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
        net_installment_due, payout_amount, notes
      ) VALUES (
        ${chit_group_id}, ${Number(month_number)}, ${auction_date}, ${winning_member_id}, ${winningShareId},
        ${bidDiscount}, ${organizerCommission}, ${netDividendPool}, ${dividendPerShare},
        ${netInstallmentDue}, ${payoutAmount}, ${notes || null}
      )
      RETURNING *;
    `;

    // Activate group if upcoming
    await sql`UPDATE chit_groups SET status = 'ACTIVE' WHERE id = ${chit_group_id};`;

    // Mark winning share as prized
    await sql`
      UPDATE member_shares
      SET is_prized = TRUE, prized_month_number = ${Number(month_number)}
      WHERE id = ${winningShareId};
    `;

    // Generate or update installments for all shares in this group for this month with the calculated dividend
    const shares = await sql`SELECT id, member_id FROM member_shares WHERE chit_group_id = ${chit_group_id};`;

    for (const share of shares) {
      await sql`
        INSERT INTO installments (
          chit_group_id, month_number, member_id, share_id,
          base_amount, dividend_deduction, net_due_amount, status
        ) VALUES (
          ${chit_group_id}, ${Number(month_number)}, ${share.member_id}, ${share.id},
          ${baseInstallment}, ${dividendPerShare}, ${netInstallmentDue}, 'PENDING'
        )
        ON CONFLICT (chit_group_id, month_number, share_id) 
        DO UPDATE SET
          dividend_deduction = ${dividendPerShare},
          net_due_amount = ${netInstallmentDue};
      `;
    }

    // Activity Log
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'AUCTION_HELD', ${auction.id}, ${chit_group_id},
        ${`Held Month ${month_number} Auction for ${group.name}. Bid discount ₹${bidDiscount.toLocaleString('en-IN')}, Dividend ₹${dividendPerShare.toLocaleString('en-IN')}/share, Payout ₹${payoutAmount.toLocaleString('en-IN')}`}
      );
    `;

    res.status(201).json({
      success: true,
      auction,
      calculations: {
        totalPot,
        bidDiscount,
        organizerCommission,
        netDividendPool,
        dividendPerShare,
        netInstallmentDue,
        payoutAmount,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// RULE 3: Chit Turn Transfer / Takeover
// One-time lump sum settlement
// ------------------------------------------------------------
apiRouter.post('/record-transfer', async (req, res) => {
  try {
    const {
      chit_group_id,
      share_id,
      from_member_id,
      to_member_id,
      effective_month_number,
      lump_sum_settlement_amount,
      settlement_date,
      agreement_notes,
    } = req.body;

    const lumpSum = Number(lump_sum_settlement_amount);

    // Record Transfer
    const [transfer] = await sql`
      INSERT INTO chit_transfers (
        chit_group_id, share_id, from_member_id, to_member_id,
        effective_month_number, lump_sum_settlement_amount,
        settlement_status, settlement_date, agreement_notes
      ) VALUES (
        ${chit_group_id}, ${share_id}, ${from_member_id}, ${to_member_id},
        ${Number(effective_month_number)}, ${lumpSum},
        'SETTLED', ${settlement_date}, ${agreement_notes || null}
      )
      RETURNING *;
    `;

    // Reassign share ownership to the new member
    await sql`
      UPDATE member_shares
      SET member_id = ${to_member_id}, updated_at = NOW()
      WHERE id = ${share_id};
    `;

    // Activity Log
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'TAKEOVER_SETTLED', ${transfer.id}, ${chit_group_id},
        ${`Chit share transferred. Lump-sum settlement of ₹${lumpSum.toLocaleString('en-IN')} paid to previous holder.`}
      );
    `;

    res.status(201).json({ success: true, transfer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// MONTHLY BIDDING & YELAM ENDPOINTS (RULE 4 & CLIENT SPECIFICATION)
// Slider-based month (1 to 20), 1L/2L/3L schemes, automated math:
// Tasiru = Pot - Winner Payout
// Monthly Due per Member = Winner Payout / 20 Members
// Dividend per Member = Tasiru / 20 Members
// ------------------------------------------------------------

apiRouter.get('/bidding/month/:month', async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    if (isNaN(month) || month < 1 || month > 20) {
      return res.status(400).json({ error: 'Invalid month number (must be 1 to 20).' });
    }

    // 1. Fetch all active chit groups sorted in ascending order of pot value (1L, 2L, 3L)
    const groups = await sql`
      SELECT * FROM chit_groups
      WHERE (status = 'ACTIVE' OR status = 'UPCOMING') AND (moved_as_completed IS FALSE OR moved_as_completed IS NULL)
      ORDER BY total_pot_value ASC;
    `;

    // 2. Fetch auctions recorded for this specific month
    const monthAuctions = await sql`
      SELECT 
        a.*,
        m.name as winning_member_name,
        m.phone as winning_member_phone,
        m.whatsapp_phone as winning_member_whatsapp,
        s.share_ticket_number
      FROM auctions a
      JOIN members m ON a.winning_member_id = m.id
      JOIN member_shares s ON a.winning_share_id = s.id
      WHERE a.month_number = ${month};
    `;

    // 2b. Bulk fetch all winner payout installments for these month auctions
    const auctionIds = monthAuctions.map((a) => a.id);
    let allMonthPayouts = [];
    if (auctionIds.length > 0) {
      allMonthPayouts = await sql`
        SELECT * FROM winner_payout_installments
        WHERE auction_id = ANY(${auctionIds})
        ORDER BY installment_number ASC;
      `;
    }

    // 3. For each group, get enrolled subscribers and payment statuses
    const schemesData = await Promise.all(
      groups.map(async (group) => {
        const auction = monthAuctions.find((a) => a.chit_group_id === group.id) || null;

        let payoutSummary = null;
        if (auction) {
          const auctionPayouts = allMonthPayouts.filter((p) => p.auction_id === auction.id);
          const totalDisbursed = auctionPayouts.reduce((sum, p) => sum + Number(p.amount_paid), 0);
          const totalPayout = Number(auction.payout_amount);
          const balanceRemaining = Math.max(0, totalPayout - totalDisbursed);
          let payoutStatus = 'PENDING';
          if (totalDisbursed >= totalPayout && totalPayout > 0) {
            payoutStatus = 'PAID';
          } else if (totalDisbursed > 0) {
            payoutStatus = 'PARTIAL';
          }

          payoutSummary = {
            total_payout_amount: totalPayout,
            total_disbursed: totalDisbursed,
            balance_remaining: balanceRemaining,
            payout_status: payoutStatus,
            next_expected_payout_date: auction.next_expected_payout_date,
            installments_count: auctionPayouts.length,
            installments: auctionPayouts.map((p) => ({
              id: p.id,
              installment_number: Number(p.installment_number),
              amount_paid: Number(p.amount_paid),
              payment_date: p.payment_date,
              payment_method: p.payment_method,
              receipt_reference: p.receipt_reference,
              notes: p.notes,
              created_at: p.created_at,
            })),
          };
        }

        const subscribers = await sql`
          SELECT 
            ms.id as share_id,
            ms.share_ticket_number,
            ms.is_prized,
            ms.prized_month_number,
            m.id as member_id,
            m.name as member_name,
            m.phone as member_phone,
            m.whatsapp_phone,
            m.address,
            COALESCE(i.net_due_amount, ${Number(group.installment_base_amount)}) as month_due_amount,
            COALESCE(i.paid_amount, 0) as month_paid_amount,
            COALESCE(i.status, 'PENDING') as installment_status,
            (
              SELECT a2.month_number 
              FROM auctions a2 
              WHERE a2.chit_group_id = ${group.id} 
                AND a2.winning_member_id = m.id 
                AND a2.month_number != ${month}
              LIMIT 1
            ) as won_in_other_month
          FROM member_shares ms
          JOIN members m ON ms.member_id = m.id
          LEFT JOIN installments i ON (i.share_id = ms.id AND i.month_number = ${month})
          WHERE ms.chit_group_id = ${group.id} AND ms.status = 'ACTIVE'
          ORDER BY ms.share_ticket_number ASC;
        `;

        return {
          group: {
            id: group.id,
            name: group.name,
            total_pot_value: Number(group.total_pot_value),
            total_months: Number(group.total_months),
            total_shares: Number(group.total_shares),
            installment_base_amount: Number(group.installment_base_amount),
            commission_percent: Number(group.commission_percent || 0),
            status: group.status,
            start_date: group.start_date,
          },
          auction: auction
            ? {
                id: auction.id,
                chit_group_id: auction.chit_group_id,
                month_number: Number(auction.month_number),
                auction_date: auction.auction_date,
                winning_member_id: auction.winning_member_id,
                winning_member_name: auction.winning_member_name,
                winning_member_phone: auction.winning_member_phone,
                winning_member_whatsapp: auction.winning_member_whatsapp,
                share_ticket_number: auction.share_ticket_number,
                winning_share_id: auction.winning_share_id,
                payout_amount: Number(auction.payout_amount),
                bid_discount_amount: Number(auction.bid_discount_amount),
                dividend_per_share: Number(auction.dividend_per_share),
                net_installment_due: Number(auction.net_installment_due),
                payout_summary: payoutSummary,
                notes: auction.notes,
              }
            : null,
          subscribers: subscribers.map((s) => ({
            share_id: s.share_id,
            share_ticket_number: s.share_ticket_number,
            is_prized: Boolean(s.is_prized),
            prized_month_number: s.prized_month_number,
            member_id: s.member_id,
            member_name: s.member_name,
            member_phone: s.member_phone,
            whatsapp_phone: s.whatsapp_phone,
            address: s.address,
            month_due_amount: Number(s.month_due_amount),
            month_paid_amount: Number(s.month_paid_amount),
            installment_status: s.installment_status,
            won_in_other_month: s.won_in_other_month != null ? Number(s.won_in_other_month) : null,
          })),
        };
      })
    );

    // 4. Summarize all 20 months status for the slider overview
    const allAuctions = await sql`
      SELECT chit_group_id, month_number FROM auctions;
    `;
    const monthsStatus = Array.from({ length: 20 }, (_, idx) => {
      const m = idx + 1;
      const count = allAuctions.filter((a) => Number(a.month_number) === m).length;
      return {
        month: m,
        auctionsCount: count,
        totalSchemes: groups.length,
        isCompleted: count >= groups.length && groups.length > 0,
        hasAny: count > 0,
      };
    });

    res.json({
      selectedMonth: month,
      schemes: schemesData,
      monthsStatus,
    });
  } catch (error) {
    console.error('Error fetching monthly bidding data:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/bidding/record', async (req, res) => {
  try {
    const {
      chit_group_id,
      month_number,
      winning_member_id,
      winner_payout_amount,
      auction_date,
      notes,
    } = req.body;

    const mNum = parseInt(month_number, 10);
    if (isNaN(mNum) || mNum < 1 || mNum > 20) {
      return res.status(400).json({ error: 'Month number must be between 1 and 20.' });
    }

    const [group] = await sql`SELECT * FROM chit_groups WHERE id = ${chit_group_id};`;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    const totalPot = Number(group.total_pot_value);
    const totalShares = Number(group.total_shares || 20);
    const payoutAmount = Number(winner_payout_amount);

    if (isNaN(payoutAmount) || payoutAmount <= 0 || payoutAmount > totalPot) {
      return res.status(400).json({
        error: `Winning amount must be between ₹1 and ₹${totalPot.toLocaleString('en-IN')}.`,
      });
    }

    // STRICT 1-WINNER RULE:
    // Only 1 chit taken per month. Once a member wins in any month, they cannot take another month!
    const [existingWin] = await sql`
      SELECT month_number FROM auctions
      WHERE chit_group_id = ${chit_group_id} 
        AND winning_member_id = ${winning_member_id}
        AND month_number != ${mNum}
      LIMIT 1;
    `;
    if (existingWin) {
      return res.status(400).json({
        error: `Member has already won Month ${existingWin.month_number} for this chit scheme! Each member can only take a chit once in the 20-month cycle.`,
      });
    }

    // Client's exact Tamil Nadu Chit Fund Math:
    // 1. Thalubadi (Discount) = Gross Pot Value - Winner Payout (e.g. 100,000 - 75,000 = 25,000)
    const bidDiscount = totalPot - payoutAmount;
    // 2. Kasiru (Foreman Commission) = 5% of Gross Pot (e.g. 100,000 * 5% = 5,000)
    const organizerCommission = Math.round((totalPot * 5) / 100);
    // 3. Net Discount Pool for Distribution = Thalubadi - Kasiru (e.g. 25,000 - 5,000 = 20,000)
    const netDividendPool = Math.max(0, bidDiscount - organizerCommission);
    // 4. Dividend per Member = Net Discount Pool / 20 Members (e.g. 20,000 / 20 = 1,000)
    const dividendPerShare = Math.floor(netDividendPool / totalShares);
    // 5. Monthly Installment Due = Base Monthly Contribution - Dividend (e.g. 5,000 - 1,000 = 4,000)
    const baseMonthly = Number(group.installment_base_amount) || Math.round(totalPot / totalShares);
    const netInstallmentDue = Math.max(0, baseMonthly - dividendPerShare);

    // Find winning member's share in this group
    let [winningShare] = await sql`
      SELECT id, share_ticket_number, is_prized, prized_month_number FROM member_shares
      WHERE chit_group_id = ${chit_group_id} AND member_id = ${winning_member_id}
      LIMIT 1;
    `;

    if (winningShare && winningShare.is_prized && winningShare.prized_month_number !== mNum) {
      return res.status(400).json({
        error: `Member share #${winningShare.share_ticket_number} was already prized in Month ${winningShare.prized_month_number}. Only 1 prize per subscriber is allowed.`,
      });
    }

    if (!winningShare) {
      const [newShare] = await sql`
        INSERT INTO member_shares (chit_group_id, member_id, share_ticket_number)
        VALUES (
          ${chit_group_id}, ${winning_member_id},
          (SELECT COALESCE(MAX(share_ticket_number), 0) + 1 FROM member_shares WHERE chit_group_id = ${chit_group_id})
        )
        RETURNING id, share_ticket_number;
      `;
      winningShare = newShare;
    }

    const aDate = auction_date || new Date().toISOString().split('T')[0];

    // Upsert auction record
    const [auction] = await sql`
      INSERT INTO auctions (
        chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
        bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
        net_installment_due, payout_amount, notes
      ) VALUES (
        ${chit_group_id}, ${mNum}, ${aDate}, ${winning_member_id}, ${winningShare.id},
        ${bidDiscount}, ${organizerCommission}, ${netDividendPool}, ${dividendPerShare},
        ${netInstallmentDue}, ${payoutAmount}, ${notes || null}
      )
      ON CONFLICT (chit_group_id, month_number)
      DO UPDATE SET
        auction_date = EXCLUDED.auction_date,
        winning_member_id = EXCLUDED.winning_member_id,
        winning_share_id = EXCLUDED.winning_share_id,
        bid_discount_amount = EXCLUDED.bid_discount_amount,
        organizer_commission = EXCLUDED.organizer_commission,
        net_dividend_pool = EXCLUDED.net_dividend_pool,
        dividend_per_share = EXCLUDED.dividend_per_share,
        net_installment_due = EXCLUDED.net_installment_due,
        payout_amount = EXCLUDED.payout_amount,
        notes = EXCLUDED.notes
      RETURNING *;
    `;

    // Mark winning share as prized for this month
    await sql`
      UPDATE member_shares
      SET is_prized = TRUE, prized_month_number = ${mNum}
      WHERE id = ${winningShare.id};
    `;

    // Update / upsert installments for all members in this group for this month with the calculated due amount
    const shares = await sql`
      SELECT id, member_id FROM member_shares 
      WHERE chit_group_id = ${chit_group_id} AND status = 'ACTIVE';
    `;

    for (const share of shares) {
      await sql`
        INSERT INTO installments (
          chit_group_id, month_number, member_id, share_id,
          base_amount, dividend_deduction, net_due_amount, status
        ) VALUES (
          ${chit_group_id}, ${mNum}, ${share.member_id}, ${share.id},
          ${baseMonthly}, ${dividendPerShare}, ${netInstallmentDue}, 'PENDING'
        )
        ON CONFLICT (chit_group_id, month_number, share_id)
        DO UPDATE SET
          dividend_deduction = ${dividendPerShare},
          net_due_amount = ${netInstallmentDue};
      `;
    }

    // Log Activity
    const [member] = await sql`SELECT name FROM members WHERE id = ${winning_member_id};`;
    const memberName = member?.name || 'Member';
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'AUCTION_HELD', ${auction.id}, ${chit_group_id},
        ${`Month ${mNum} Bidding recorded for ${group.name}. Winner: ${memberName}, Winning Amount: ₹${payoutAmount.toLocaleString('en-IN')}, Thalubadi: ₹${bidDiscount.toLocaleString('en-IN')}, Kasiru (5%): ₹${organizerCommission.toLocaleString('en-IN')}, Per Member Due: ₹${netInstallmentDue.toLocaleString('en-IN')}`}
      );
    `;

    res.status(201).json({
      success: true,
      auction,
      math: {
        totalPot,
        winnerPayout: payoutAmount,
        baseMonthly,
        thalubadi: bidDiscount,
        kasiru: organizerCommission,
        netDiscount: netDividendPool,
        membersCount: totalShares,
        installmentPerMember: netInstallmentDue,
        dividendPerMember: dividendPerShare,
      },
    });
  } catch (error) {
    console.error('Error recording bidding:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/bidding/group/:chit_group_id/month/:month_number', async (req, res) => {
  try {
    const { chit_group_id, month_number } = req.params;
    const mNum = parseInt(month_number, 10);

    const [group] = await sql`SELECT * FROM chit_groups WHERE id = ${chit_group_id};`;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    const [auction] = await sql`
      SELECT * FROM auctions
      WHERE chit_group_id = ${chit_group_id} AND month_number = ${mNum};
    `;

    if (!auction) {
      return res.status(404).json({ error: 'No auction found for this group and month.' });
    }

    // Reset prized status on winning share
    if (auction.winning_share_id) {
      await sql`
        UPDATE member_shares
        SET is_prized = FALSE, prized_month_number = NULL
        WHERE id = ${auction.winning_share_id};
      `;
    }

    // Reset installments back to base amount with 0 dividend deduction
    const baseAmount = Number(group.installment_base_amount);
    await sql`
      UPDATE installments
      SET dividend_deduction = 0, net_due_amount = ${baseAmount}
      WHERE chit_group_id = ${chit_group_id} AND month_number = ${mNum};
    `;

    // Delete the auction
    await sql`
      DELETE FROM auctions
      WHERE id = ${auction.id};
    `;

    // Log activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'AUCTION_DELETED', ${auction.id}, ${chit_group_id},
        ${`Month ${mNum} Bidding record deleted for ${group.name}. Installments reset to base ₹${baseAmount.toLocaleString('en-IN')}.`}
      );
    `;

    res.json({ success: true, message: 'Bidding record deleted and installments reset.' });
  } catch (error) {
    console.error('Error deleting bidding record:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// WINNER PRIZE PAYOUT & INSTALLMENTS (BULK OR 2, 3, N INSTALLMENTS)
// Allows the client/agent (Mr. Venkatesan) to disburse the prize
// either in bulk or in multiple custom installments with real-time tracking
// ------------------------------------------------------------
apiRouter.post('/bidding/auction/:auctionId/payouts', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { amount_paid, payment_date, payment_method, receipt_reference, notes, next_expected_payout_date } = req.body;

    const amount = Number(amount_paid);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Payout installment amount must be greater than zero.' });
    }

    const [auction] = await sql`
      SELECT a.*, g.name as group_name, m.name as member_name, m.phone as member_phone
      FROM auctions a
      JOIN chit_groups g ON a.chit_group_id = g.id
      JOIN members m ON a.winning_member_id = m.id
      WHERE a.id = ${auctionId};
    `;

    if (!auction) {
      return res.status(404).json({ error: 'Auction record not found.' });
    }

    const [maxInst] = await sql`
      SELECT COALESCE(MAX(installment_number), 0)::int as max_num
      FROM winner_payout_installments
      WHERE auction_id = ${auctionId};
    `;
    const nextInstNumber = (maxInst?.max_num || 0) + 1;
    const pDate = payment_date || new Date().toISOString().split('T')[0];
    const pMethod = payment_method || 'BANK_TRANSFER';
    const ref = receipt_reference || `PAY-${auction.group_name.replace(/\s+/g, '')}-M${auction.month_number}-I${nextInstNumber}`;

    const [newPayout] = await sql`
      INSERT INTO winner_payout_installments (
        auction_id, chit_group_id, member_id, installment_number,
        amount_paid, payment_date, payment_method, receipt_reference, notes
      ) VALUES (
        ${auction.id}, ${auction.chit_group_id}, ${auction.winning_member_id},
        ${nextInstNumber}, ${amount}, ${pDate}, ${pMethod}, ${ref}, ${notes || null}
      )
      RETURNING *;
    `;

    // Recalculate totals
    const allPayouts = await sql`
      SELECT * FROM winner_payout_installments
      WHERE auction_id = ${auctionId}
      ORDER BY installment_number ASC;
    `;

    const totalDisbursed = allPayouts.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const totalPayout = Number(auction.payout_amount);
    const balanceRemaining = Math.max(0, totalPayout - totalDisbursed);
    let newStatus = 'PENDING';
    if (totalDisbursed >= totalPayout) {
      newStatus = 'PAID';
    } else if (totalDisbursed > 0) {
      newStatus = 'PARTIAL';
    }

    const nextExpected = balanceRemaining > 0 ? (next_expected_payout_date || null) : null;

    await sql`
      UPDATE auctions
      SET 
        payout_status = ${newStatus},
        payout_date = ${pDate},
        payout_reference = ${ref},
        next_expected_payout_date = ${nextExpected}
      WHERE id = ${auctionId};
    `;

    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description, recorded_by)
      VALUES (
        'WINNER_PAYOUT_RECORDED', ${newPayout.id}, ${auction.chit_group_id},
        ${`Winner prize payout installment #${nextInstNumber} of ₹${amount.toLocaleString('en-IN')} paid to ${auction.member_name} (${auction.group_name} Month ${auction.month_number}).`},
        'Venkatesan'
      );
    `;

    res.status(201).json({
      success: true,
      message: `Winner payout installment #${nextInstNumber} of ₹${amount.toLocaleString('en-IN')} recorded successfully.`,
      installment: {
        id: newPayout.id,
        installment_number: Number(newPayout.installment_number),
        amount_paid: Number(newPayout.amount_paid),
        payment_date: newPayout.payment_date,
        payment_method: newPayout.payment_method,
        receipt_reference: newPayout.receipt_reference,
        notes: newPayout.notes,
        created_at: newPayout.created_at,
      },
      payout_summary: {
        total_payout_amount: totalPayout,
        total_disbursed: totalDisbursed,
        balance_remaining: balanceRemaining,
        payout_status: newStatus,
        next_expected_payout_date: nextExpected,
        installments_count: allPayouts.length,
        installments: allPayouts.map((p) => ({
          id: p.id,
          installment_number: Number(p.installment_number),
          amount_paid: Number(p.amount_paid),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          receipt_reference: p.receipt_reference,
          notes: p.notes,
          created_at: p.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error recording winner payout installment:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.delete('/bidding/payouts/:payoutId', async (req, res) => {
  try {
    const { payoutId } = req.params;

    const [payout] = await sql`
      SELECT * FROM winner_payout_installments WHERE id = ${payoutId};
    `;
    if (!payout) {
      return res.status(404).json({ error: 'Payout installment not found.' });
    }

    const auctionId = payout.auction_id;

    await sql`DELETE FROM winner_payout_installments WHERE id = ${payoutId};`;

    // Recalculate totals
    const [auction] = await sql`SELECT * FROM auctions WHERE id = ${auctionId};`;
    const remainingPayouts = await sql`
      SELECT * FROM winner_payout_installments WHERE auction_id = ${auctionId} ORDER BY installment_number ASC;
    `;

    const totalDisbursed = remainingPayouts.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    const totalPayout = Number(auction.payout_amount);
    const balanceRemaining = Math.max(0, totalPayout - totalDisbursed);
    let newStatus = 'PENDING';
    if (totalDisbursed >= totalPayout) {
      newStatus = 'PAID';
    } else if (totalDisbursed > 0) {
      newStatus = 'PARTIAL';
    }

    const nextExpected = balanceRemaining > 0 ? auction.next_expected_payout_date : null;

    await sql`
      UPDATE auctions
      SET payout_status = ${newStatus},
          payout_date = ${remainingPayouts.length > 0 ? remainingPayouts[remainingPayouts.length - 1].payment_date : null},
          next_expected_payout_date = ${nextExpected}
      WHERE id = ${auctionId};
    `;

    res.json({
      success: true,
      message: 'Payout installment deleted successfully.',
      payout_summary: {
        total_payout_amount: totalPayout,
        total_disbursed: totalDisbursed,
        balance_remaining: balanceRemaining,
        payout_status: newStatus,
        next_expected_payout_date: nextExpected,
        installments_count: remainingPayouts.length,
        installments: remainingPayouts.map((p) => ({
          id: p.id,
          installment_number: Number(p.installment_number),
          amount_paid: Number(p.amount_paid),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          receipt_reference: p.receipt_reference,
          notes: p.notes,
          created_at: p.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error deleting payout installment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// MONTHLY PAYMENTS LEDGER (MONTHS 1 TO 20)
// Brings payment recording directly inside monthly payment view
// Organized by month 1..20, with client-configured bidding math
// ------------------------------------------------------------
apiRouter.get('/monthly-payments/month/:month', async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    if (isNaN(month) || month < 1 || month > 20) {
      return res.status(400).json({ error: 'Month must be between 1 and 20.' });
    }

    const groups = await sql`
      SELECT * FROM chit_groups
      WHERE status = 'ACTIVE'
      ORDER BY total_pot_value ASC;
    `;

    const schemesData = await Promise.all(
      groups.map(async (group) => {
        const totalPot = Number(group.total_pot_value);
        const totalShares = Number(group.total_shares || 20);
        const baseMonthly = Number(group.installment_base_amount) || Math.round(totalPot / totalShares);
        const kasiru = Math.round((totalPot * 5) / 100);

        // Fetch auction for this month (if any)
        const [auction] = await sql`
          SELECT 
            a.*,
            m.name as winning_member_name,
            m.phone as winning_member_phone,
            ms.share_ticket_number
          FROM auctions a
          LEFT JOIN members m ON a.winning_member_id = m.id
          LEFT JOIN member_shares ms ON a.winning_share_id = ms.id
          WHERE a.chit_group_id = ${group.id} AND a.month_number = ${month}
          LIMIT 1;
        `;

        let thalubadi = 0;
        let netDiscount = 0;
        let dividendPerShare = 0;
        let calculatedDue = baseMonthly;

        if (auction) {
          thalubadi = Number(auction.bid_discount_amount);
          netDiscount = Number(auction.net_dividend_pool);
          dividendPerShare = Number(auction.dividend_per_share);
          calculatedDue = Number(auction.net_installment_due);
        }

        // Fetch active shares in this group
        const shares = await sql`
          SELECT ms.id as share_id, ms.share_ticket_number, ms.member_id,
                 m.name as member_name, m.phone as member_phone, m.whatsapp_phone
          FROM member_shares ms
          JOIN members m ON ms.member_id = m.id
          WHERE ms.chit_group_id = ${group.id} AND ms.status = 'ACTIVE'
          ORDER BY ms.share_ticket_number ASC;
        `;

        // Fetch all installments for this month with member & share details
        let instList = await sql`
          SELECT 
            i.id,
            i.chit_group_id,
            i.month_number,
            i.member_id,
            i.share_id,
            i.base_amount,
            i.dividend_deduction,
            i.net_due_amount,
            i.paid_amount,
            i.status,
            i.last_payment_date,
            i.expected_payment_date,
            i.notes,
            m.name as member_name,
            m.phone as member_phone,
            m.whatsapp_phone,
            ms.share_ticket_number
          FROM installments i
          JOIN members m ON i.member_id = m.id
          JOIN member_shares ms ON i.share_id = ms.id
          WHERE i.chit_group_id = ${group.id} AND i.month_number = ${month}
          ORDER BY ms.share_ticket_number ASC;
        `;

        // If any shares don't have installments yet, insert them
        if (instList.length < shares.length) {
          const existingShareIds = new Set(instList.map((i) => i.share_id));
          const missingShares = shares.filter((s) => !existingShareIds.has(s.share_id));
          for (const share of missingShares) {
            await sql`
              INSERT INTO installments (
                chit_group_id, month_number, member_id, share_id,
                base_amount, dividend_deduction, net_due_amount, status
              ) VALUES (
                ${group.id}, ${month}, ${share.member_id}, ${share.share_id},
                ${baseMonthly}, ${dividendPerShare}, ${calculatedDue}, 'PENDING'
              )
              ON CONFLICT (chit_group_id, month_number, share_id) DO NOTHING;
            `;
          }

          instList = await sql`
            SELECT 
              i.id,
              i.chit_group_id,
              i.month_number,
              i.member_id,
              i.share_id,
              i.base_amount,
              i.dividend_deduction,
              i.net_due_amount,
              i.paid_amount,
              i.status,
              i.last_payment_date,
              i.expected_payment_date,
              i.notes,
              m.name as member_name,
              m.phone as member_phone,
              m.whatsapp_phone,
              ms.share_ticket_number
            FROM installments i
            JOIN members m ON i.member_id = m.id
            JOIN member_shares ms ON i.share_id = ms.id
            WHERE i.chit_group_id = ${group.id} AND i.month_number = ${month}
            ORDER BY ms.share_ticket_number ASC;
          `;
        }

        const instIds = instList.map((i) => i.id);
        const transactionsByInst = {};
        if (instIds.length > 0) {
          const txs = await sql`
            SELECT id, installment_id, amount_paid, payment_date, payment_method, receipt_number, notes, created_at
            FROM payment_transactions
            WHERE installment_id = ANY(${instIds})
            ORDER BY payment_date ASC, created_at ASC;
          `;
          for (const tx of txs) {
            if (!transactionsByInst[tx.installment_id]) {
              transactionsByInst[tx.installment_id] = [];
            }
            transactionsByInst[tx.installment_id].push({
              id: tx.id,
              amount_paid: Number(tx.amount_paid),
              payment_date: tx.payment_date,
              payment_method: tx.payment_method,
              receipt_number: tx.receipt_number,
              notes: tx.notes,
              created_at: tx.created_at,
            });
          }
        }

        const totalExpected = instList.reduce((sum, i) => sum + Number(i.net_due_amount), 0);
        const totalCollected = instList.reduce((sum, i) => sum + Number(i.paid_amount), 0);
        const totalPending = Math.max(0, totalExpected - totalCollected);
        const paidCount = instList.filter((i) => i.status === 'PAID').length;
        const partialCount = instList.filter((i) => i.status === 'PARTIAL').length;

        return {
          group: {
            id: group.id,
            name: group.name,
            total_pot_value: totalPot,
            total_months: Number(group.total_months),
            total_shares: totalShares,
            installment_base_amount: baseMonthly,
            start_date: group.start_date,
          },
          auction: auction
            ? {
                id: auction.id,
                month_number: Number(auction.month_number),
                auction_date: auction.auction_date,
                winning_member_id: auction.winning_member_id,
                winning_member_name: auction.winning_member_name,
                winning_member_phone: auction.winning_member_phone,
                share_ticket_number: auction.share_ticket_number,
                payout_amount: Number(auction.payout_amount),
                thalubadi,
                kasiru,
                dividend_per_share: dividendPerShare,
                net_installment_due: calculatedDue,
              }
            : null,
          math: {
            baseMonthly,
            thalubadi,
            kasiru,
            dividendPerShare,
            netInstallmentDue: calculatedDue,
          },
          summary: {
            totalMembers: instList.length,
            paidCount,
            partialCount,
            pendingCount: instList.length - paidCount,
            totalExpected,
            totalCollected,
            totalPending,
            collectionPercentage: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
          },
          installments: instList.map((i) => ({
            id: i.id,
            chit_group_id: i.chit_group_id,
            group_name: group.name,
            month_number: Number(i.month_number),
            member_id: i.member_id,
            share_id: i.share_id,
            share_ticket_number: Number(i.share_ticket_number),
            member_name: i.member_name,
            member_phone: i.member_phone,
            whatsapp_phone: i.whatsapp_phone,
            base_amount: Number(i.base_amount),
            dividend_deduction: Number(i.dividend_deduction),
            net_due_amount: Number(i.net_due_amount),
            paid_amount: Number(i.paid_amount),
            status: i.status,
            last_payment_date: i.last_payment_date,
            expected_payment_date: i.expected_payment_date,
            transactions: transactionsByInst[i.id] || [],
            notes: i.notes,
          })),
        };
      })
    );

    // 20-month status overview for slider
    const allAuctions = await sql`SELECT chit_group_id, month_number FROM auctions;`;
    const monthsStatus = Array.from({ length: 20 }, (_, idx) => {
      const m = idx + 1;
      const count = allAuctions.filter((a) => Number(a.month_number) === m).length;
      return {
        month: m,
        auctionsCount: count,
        totalSchemes: groups.length,
        isCompleted: count >= groups.length && groups.length > 0,
        hasAny: count > 0,
      };
    });

    const overallExpected = schemesData.reduce((sum, s) => sum + s.summary.totalExpected, 0);
    const overallCollected = schemesData.reduce((sum, s) => sum + s.summary.totalCollected, 0);
    const overallPending = Math.max(0, overallExpected - overallCollected);

    res.json({
      selectedMonth: month,
      schemes: schemesData,
      overallSummary: {
        totalExpected: overallExpected,
        totalCollected: overallCollected,
        totalPending: overallPending,
        collectionPercentage: overallExpected > 0 ? Math.round((overallCollected / overallExpected) * 100) : 0,
      },
      monthsStatus,
    });
  } catch (error) {
    console.error('Error fetching monthly payments:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// CHIT GROUP DELETION WITH FULL CASCADE & SAFETY CHECKS
// ------------------------------------------------------------
apiRouter.delete('/chit-groups/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [group] = await sql`SELECT * FROM chit_groups WHERE id = ${id};`;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    // Clean up related child data
    await sql`
      DELETE FROM payment_transactions 
      WHERE installment_id IN (SELECT id FROM installments WHERE chit_group_id = ${id});
    `;
    await sql`DELETE FROM installments WHERE chit_group_id = ${id};`;
    await sql`DELETE FROM auctions WHERE chit_group_id = ${id};`;
    await sql`DELETE FROM chit_transfers WHERE chit_group_id = ${id};`;
    await sql`DELETE FROM member_shares WHERE chit_group_id = ${id};`;
    await sql`DELETE FROM activity_ledger WHERE chit_group_id = ${id};`;
    await sql`DELETE FROM chit_groups WHERE id = ${id};`;

    res.json({ success: true, message: `Chit group '${group.name}' deleted successfully.` });
  } catch (error) {
    console.error('Error deleting chit group:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// CHIT GROUP MOVE AS COMPLETED & RESTORE ACTIVE
// ------------------------------------------------------------
apiRouter.post('/chit-groups/:id/move-as-completed', async (req, res) => {
  try {
    const { id } = req.params;
    const [group] = await sql`
      UPDATE chit_groups
      SET status = 'COMPLETED',
          moved_as_completed = TRUE,
          moved_as_completed_at = NOW(),
          end_date = COALESCE(end_date, CURRENT_DATE),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'GROUP_MOVED_AS_COMPLETED',
        ${id},
        ${id},
        ${`Chit scheme '${group.name}' flagged as moved_as_completed = true and archived to Past Groups.`}
      );
    `;

    res.json({ success: true, message: `Chit scheme '${group.name}' moved as completed.`, group });
  } catch (error) {
    console.error('Error moving chit group as completed:', error);
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/chit-groups/:id/restore-active', async (req, res) => {
  try {
    const { id } = req.params;
    const [group] = await sql`
      UPDATE chit_groups
      SET status = 'ACTIVE',
          moved_as_completed = FALSE,
          moved_as_completed_at = NULL,
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *;
    `;
    if (!group) return res.status(404).json({ error: 'Chit group not found.' });

    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'GROUP_RESTORED_ACTIVE',
        ${id},
        ${id},
        ${`Chit scheme '${group.name}' restored back to active schemes.`}
      );
    `;

    res.json({ success: true, message: `Chit scheme '${group.name}' restored to active.`, group });
  } catch (error) {
    console.error('Error restoring chit group to active:', error);
    res.status(500).json({ error: error.message });
  }
});

// ------------------------------------------------------------
// Activity Ledger
// ------------------------------------------------------------
apiRouter.get('/activity-ledger', async (req, res) => {
  try {
    const activities = await sql`
      SELECT * FROM activity_ledger 
      ORDER BY created_at DESC 
      LIMIT 100;
    `;
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

