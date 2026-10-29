-- ============================================================
-- RAJAMANICKAM CHIT FUND — MASTER DATABASE SCHEMA (POSTGRESQL)
-- Production Schema for Neon Serverless PostgreSQL
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. CHIT GROUPS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chit_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    total_pot_value NUMERIC(12, 2) NOT NULL,          -- e.g. 100000.00
    total_months INT NOT NULL,                        -- e.g. 20 months
    total_shares INT NOT NULL,                        -- e.g. 20 shares (1 share per month)
    installment_base_amount NUMERIC(12, 2) NOT NULL,  -- e.g. 5000.00 (total_pot_value / total_months)
    commission_percent NUMERIC(5, 2) DEFAULT 5.00,    -- e.g. 5.00% organizer commission
    status VARCHAR(20) DEFAULT 'UPCOMING',            -- 'UPCOMING', 'ACTIVE', 'COMPLETED'
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    moved_as_completed BOOLEAN DEFAULT FALSE,
    moved_as_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. MEMBERS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    whatsapp_phone VARCHAR(15),
    address TEXT,
    id_proof_type VARCHAR(50),                         -- e.g. 'Aadhaar', 'PAN', 'Voter ID'
    id_proof_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',               -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. MEMBER SHARES TABLE (RULE 2: MULTIPLE SHARES AT INCEPTION)
-- One member can hold multiple ticket numbers in a chit group.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_group_id UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    share_ticket_number INT NOT NULL,                  -- Ticket #1, #2, ... up to total_shares
    joined_before_start BOOLEAN DEFAULT TRUE,          -- Rule 2: Cannot join mid-way
    is_prized BOOLEAN DEFAULT FALSE,                   -- Has this share won an auction?
    prized_month_number INT,                           -- Which month auction it was taken
    status VARCHAR(20) DEFAULT 'ACTIVE',               -- 'ACTIVE', 'TRANSFERRED', 'COMPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_ticket UNIQUE (chit_group_id, share_ticket_number)
);

-- ------------------------------------------------------------
-- 4. AUCTIONS / YELAM TABLE (RULE 4 & RULE 5: DYNAMIC HAMMER & DIVIDENDS)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_group_id UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    month_number INT NOT NULL,                         -- Month 1, 2, ..., N
    auction_date DATE NOT NULL,
    winning_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    winning_share_id UUID NOT NULL REFERENCES member_shares(id) ON DELETE RESTRICT,
    bid_discount_amount NUMERIC(12, 2) NOT NULL,       -- The auction discount (e.g. ₹15,000)
    organizer_commission NUMERIC(12, 2) NOT NULL,      -- Commission retained by Rajamanickam Chit Fund
    net_dividend_pool NUMERIC(12, 2) NOT NULL,         -- (bid_discount_amount - organizer_commission)
    dividend_per_share NUMERIC(12, 2) NOT NULL,        -- net_dividend_pool / total_shares
    net_installment_due NUMERIC(12, 2) NOT NULL,       -- base_amount - dividend_per_share
    payout_amount NUMERIC(12, 2) NOT NULL,             -- Payout to winner (pot_value - bid_discount)
    payout_status VARCHAR(20) DEFAULT 'PENDING',       -- 'PENDING', 'PAID'
    payout_date DATE,
    payout_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_month_auction UNIQUE (chit_group_id, month_number)
);

-- ------------------------------------------------------------
-- 5. MONTHLY INSTALLMENTS TABLE (RULE 1: FULL SETTLEMENT REQUIREMENT)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_group_id UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    month_number INT NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    share_id UUID NOT NULL REFERENCES member_shares(id) ON DELETE RESTRICT,
    base_amount NUMERIC(12, 2) NOT NULL,               -- Standard monthly share value
    dividend_deduction NUMERIC(12, 2) DEFAULT 0.00,    -- Dividend from this month's auction
    net_due_amount NUMERIC(12, 2) NOT NULL,            -- base_amount - dividend_deduction
    paid_amount NUMERIC(12, 2) DEFAULT 0.00,           -- Total collected so far
    status VARCHAR(20) DEFAULT 'PENDING',              -- 'PENDING', 'PARTIAL', 'PAID' (RULE 1)
    last_payment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_month_share UNIQUE (chit_group_id, month_number, share_id)
);

-- ------------------------------------------------------------
-- 6. PAYMENT TRANSACTIONS TABLE
-- Records each external physical/UPI payment transaction.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    installment_id UUID NOT NULL REFERENCES installments(id) ON DELETE RESTRICT,
    chit_group_id UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    share_id UUID NOT NULL REFERENCES member_shares(id) ON DELETE RESTRICT,
    amount_paid NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(30) DEFAULT 'CASH',          -- 'CASH', 'G_PAY', 'PHONEPE', 'BANK_TRANSFER', 'CHEQUE'
    receipt_number VARCHAR(50),
    notes TEXT,
    recorded_by VARCHAR(50) DEFAULT 'Venkatesan',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 7. CHIT TRANSFERS / TAKEOVERS (RULE 3: ONE-TIME LUMP-SUM SETTLEMENT)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chit_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chit_group_id UUID NOT NULL REFERENCES chit_groups(id) ON DELETE RESTRICT,
    share_id UUID NOT NULL REFERENCES member_shares(id) ON DELETE RESTRICT,
    from_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    to_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    effective_month_number INT NOT NULL,
    lump_sum_settlement_amount NUMERIC(12, 2) NOT NULL, -- Lump sum paid to transferor
    settlement_status VARCHAR(20) DEFAULT 'SETTLED',     -- 'SETTLED', 'PENDING'
    settlement_date DATE NOT NULL,
    agreement_notes TEXT,
    recorded_by VARCHAR(50) DEFAULT 'Venkatesan',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. ACTIVITY LEDGER TABLE (AUDIT LOG FOR FINANCIAL INTEGRITY)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,                   -- 'PAYMENT_RECORDED', 'AUCTION_HELD', 'TAKEOVER_SETTLED', 'GROUP_CREATED', 'MEMBER_ADDED'
    entity_id UUID,
    chit_group_id UUID REFERENCES chit_groups(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    recorded_by VARCHAR(50) DEFAULT 'Venkatesan',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE SEARCH & REPORTING
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_member_shares_group ON member_shares(chit_group_id);
CREATE INDEX IF NOT EXISTS idx_member_shares_member ON member_shares(member_id);
CREATE INDEX IF NOT EXISTS idx_installments_group_month ON installments(chit_group_id, month_number);
CREATE INDEX IF NOT EXISTS idx_installments_status ON installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_date ON payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_activity_ledger_created ON activity_ledger(created_at DESC);

