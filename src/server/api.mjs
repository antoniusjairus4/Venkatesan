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
    const [activeChits] = await sql`SELECT COUNT(*)::int as count FROM chit_groups WHERE status = 'ACTIVE';`;
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
// Chit Groups
// ------------------------------------------------------------
apiRouter.get('/chit-groups', async (req, res) => {
  try {
    const groups = await sql`
      SELECT 
        g.*,
        COUNT(s.id)::int as enrolled_shares
      FROM chit_groups g
      LEFT JOIN member_shares s ON g.id = s.chit_group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC;
    `;
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/chit-groups', async (req, res) => {
  try {
    const { name, total_pot_value, total_months, start_date, notes } = req.body;
    const totalPot = Number(total_pot_value);
    const months = Number(total_months);
    const baseAmount = totalPot / months;

    const [newGroup] = await sql`
      INSERT INTO chit_groups (
        name, total_pot_value, total_months, total_shares, installment_base_amount, start_date, notes
      ) VALUES (
        ${name}, ${totalPot}, ${months}, ${months}, ${baseAmount}, ${start_date}, ${notes || null}
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
        COUNT(s.id)::int as total_shares_held
      FROM members m
      LEFT JOIN member_shares s ON m.id = s.member_id
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
    const { name, phone, whatsapp_phone, address, id_proof_type, id_proof_number } = req.body;

    const [newMember] = await sql`
      INSERT INTO members (name, phone, whatsapp_phone, address, id_proof_type, id_proof_number)
      VALUES (${name}, ${phone}, ${whatsapp_phone || phone}, ${address || null}, ${id_proof_type || null}, ${id_proof_number || null})
      RETURNING *;
    `;

    // Log Activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, description)
      VALUES ('MEMBER_ADDED', ${newMember.id}, ${`Registered member "${name}" (${phone})`});
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

    let query = `
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
      WHERE 1=1
    `;

    if (chit_group_id) query += ` AND i.chit_group_id = '${chit_group_id}'`;
    if (month_number) query += ` AND i.month_number = ${Number(month_number)}`;
    if (status) query += ` AND i.status = '${status}'`;

    query += ` ORDER BY g.name, i.month_number, s.share_ticket_number;`;

    const rows = await sql.query(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/record-payment', async (req, res) => {
  try {
    const { installment_id, amount_paid, payment_method, receipt_number, notes } = req.body;
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

    // Update installment
    const [updatedInst] = await sql`
      UPDATE installments
      SET 
        paid_amount = ${newPaidTotal},
        status = ${newStatus},
        last_payment_date = CURRENT_DATE,
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
        ${amount}, CURRENT_DATE, ${payment_method || 'CASH'}, ${receipt_number || null}, ${notes || null}
      )
      RETURNING *;
    `;

    // Record Activity
    await sql`
      INSERT INTO activity_ledger (event_type, entity_id, chit_group_id, description)
      VALUES (
        'PAYMENT_RECORDED', ${tx.id}, ${inst.chit_group_id},
        ${`Recorded payment of ₹${amount.toLocaleString('en-IN')} via ${payment_method || 'CASH'} (Status: ${newStatus}, Remaining: ₹${Math.max(0, remaining)})`}
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
    const commissionPercent = Number(group.commission_percent || 5.0);

    const bidDiscount = Number(bid_discount_amount);
    const organizerCommission = (totalPot * commissionPercent) / 100;
    const netDividendPool = Math.max(0, bidDiscount - organizerCommission);
    const dividendPerShare = netDividendPool / totalShares;
    const netInstallmentDue = baseInstallment - dividendPerShare;
    
    // Payout amount = Pot value - Bid Discount (Rule 5 ensures it is capped)
    const payoutAmount = totalPot - bidDiscount;

    // Record Auction
    const [auction] = await sql`
      INSERT INTO auctions (
        chit_group_id, month_number, auction_date, winning_member_id, winning_share_id,
        bid_discount_amount, organizer_commission, net_dividend_pool, dividend_per_share,
        net_installment_due, payout_amount, notes
      ) VALUES (
        ${chit_group_id}, ${Number(month_number)}, ${auction_date}, ${winning_member_id}, ${winning_share_id},
        ${bidDiscount}, ${organizerCommission}, ${netDividendPool}, ${dividendPerShare},
        ${netInstallmentDue}, ${payoutAmount}, ${notes || null}
      )
      RETURNING *;
    `;

    // Mark winning share as prized
    await sql`
      UPDATE member_shares
      SET is_prized = TRUE, prized_month_number = ${Number(month_number)}
      WHERE id = ${winning_share_id};
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

