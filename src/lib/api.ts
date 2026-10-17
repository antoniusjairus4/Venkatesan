export interface DashboardSummary {
  totalGroups: number;
  totalMembers: number;
  activeChits: number;
  totalCollected: number;
  totalPendingDues: number;
}

export interface ChitGroup {
  id: string;
  name: string;
  total_pot_value: number;
  total_months: number;
  total_shares: number;
  installment_base_amount: number;
  commission_percent: number;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  start_date: string;
  end_date?: string;
  enrolled_shares?: number;
  notes?: string;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  whatsapp_phone?: string;
  address?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  status: 'ACTIVE' | 'INACTIVE';
  total_shares_held?: number;
  created_at: string;
}

export interface Installment {
  id: string;
  chit_group_id: string;
  month_number: number;
  member_id: string;
  share_id: string;
  base_amount: number;
  dividend_deduction: number;
  net_due_amount: number;
  paid_amount: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID';
  last_payment_date?: string;
  member_name?: string;
  member_phone?: string;
  group_name?: string;
  share_ticket_number?: number;
}

export interface Auction {
  id: string;
  chit_group_id: string;
  month_number: number;
  auction_date: string;
  winning_member_id: string;
  winning_share_id: string;
  bid_discount_amount: number;
  organizer_commission: number;
  net_dividend_pool: number;
  dividend_per_share: number;
  net_installment_due: number;
  payout_amount: number;
  group_name?: string;
  winning_member_name?: string;
  winning_member_phone?: string;
  share_ticket_number?: number;
}

// ------------------------------------------------------------
// API Client Functions
// ------------------------------------------------------------

export async function fetchHealth(): Promise<{ status: string; database: string }> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/dashboard-summary');
  if (!res.ok) throw new Error('Failed to fetch dashboard summary');
  return res.json();
}

export async function fetchChitGroups(): Promise<ChitGroup[]> {
  const res = await fetch('/api/chit-groups');
  if (!res.ok) throw new Error('Failed to fetch chit groups');
  return res.json();
}

export async function createChitGroup(data: {
  name: string;
  total_pot_value: number;
  total_months: number;
  start_date: string;
  notes?: string;
}): Promise<ChitGroup> {
  const res = await fetch('/api/chit-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create chit group');
  }
  return res.json();
}

export async function fetchMembers(): Promise<Member[]> {
  const res = await fetch('/api/members');
  if (!res.ok) throw new Error('Failed to fetch members');
  return res.json();
}

export async function createMember(data: {
  name: string;
  phone: string;
  whatsapp_phone?: string;
  address?: string;
  id_proof_type?: string;
  id_proof_number?: string;
}): Promise<Member> {
  const res = await fetch('/api/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create member');
  }
  return res.json();
}

export async function fetchInstallments(params?: {
  chit_group_id?: string;
  month_number?: number;
  status?: string;
}): Promise<Installment[]> {
  const query = new URLSearchParams();
  if (params?.chit_group_id) query.append('chit_group_id', params.chit_group_id);
  if (params?.month_number) query.append('month_number', String(params.month_number));
  if (params?.status) query.append('status', params.status);

  const res = await fetch(`/api/installments?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch installments');
  return res.json();
}

export async function recordPayment(data: {
  installment_id: string;
  amount_paid: number;
  payment_method: string;
  receipt_number?: string;
  notes?: string;
}) {
  const res = await fetch('/api/record-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record payment');
  }
  return res.json();
}

