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

export interface GroupSubscriber {
  member_id: string;
  member_name: string;
  phone: string;
  whatsapp_phone?: string;
  address?: string;
  shares_count: number;
  ticket_numbers: number[];
  is_prized_winner: boolean;
  prized_month_number?: number | null;
  total_paid: number;
  total_pending: number;
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
  enrolled_schemes?: string;
  ticket_details?: string;
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

export interface AnalyticsData {
  collection: {
    collected: number;
    pending: number;
    totalDue: number;
    percentage: number;
  };
  cashflow: Array<{
    month: string;
    inflow: number;
    outflow: number;
  }>;
  defaulters: {
    bucket1: { count: number; amount: number };
    bucket2: { count: number; amount: number };
    bucket3: { count: number; amount: number };
    list: Array<{
      memberId: string;
      memberName: string;
      phone: string;
      groupName: string;
      unpaidCount: number;
      pendingAmount: number;
      riskLevel: 'MILD' | 'MODERATE' | 'CRITICAL';
    }>;
  };
}

export async function fetchAnalytics(chitGroupId?: string): Promise<AnalyticsData> {
  const query = chitGroupId && chitGroupId !== 'ALL' ? `?chit_group_id=${chitGroupId}` : '';
  const res = await fetch(`/api/analytics${query}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchChitGroups(): Promise<ChitGroup[]> {
  const res = await fetch('/api/chit-groups');
  if (!res.ok) throw new Error('Failed to fetch chit groups');
  return res.json();
}

export async function fetchGroupSubscribers(groupId: string): Promise<GroupSubscriber[]> {
  const res = await fetch(`/api/chit-groups/${groupId}/subscribers`);
  if (!res.ok) throw new Error('Failed to fetch group subscribers');
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
  chit_group_id?: string;
  share_count?: number;
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

// ------------------------------------------------------------
// Past Chit Groups / Historical Snapshot Interfaces & API
// ------------------------------------------------------------
export interface PastChitGroupSummary {
  id: string;
  name: string;
  total_pot_value: number;
  total_months: number;
  total_shares: number;
  installment_base_amount: number;
  status: 'COMPLETED' | string;
  start_date: string;
  end_date?: string;
  notes?: string;
  member_count: number;
  total_collected: number;
  total_installments: number;
  late_payments_count: number;
}

export interface PastChitSnapshot {
  group: PastChitGroupSummary;
  metrics: {
    member_count: number;
    total_collected: number;
    total_installments: number;
    late_payments_count: number;
    completion_status: string;
    start_date: string;
    end_date?: string;
  };
  timeline: Array<{
    month_number: number;
    installment_count: number;
    collected_amount: number;
    expected_amount: number;
    late_count: number;
  }>;
  members: Array<{
    member_id: string;
    member_name: string;
    phone: string;
    address?: string;
    share_ticket_number: number;
    share_id: string;
    total_paid: number;
    late_count: number;
    is_prized: boolean;
  }>;
  late_payments: Array<{
    id: string;
    month_number: number;
    member_name: string;
    member_phone: string;
    share_ticket_number: number;
    net_due_amount: number;
    paid_amount: number;
    last_payment_date?: string;
    notes?: string;
  }>;
  installments: Array<{
    id: string;
    month_number: number;
    share_ticket_number: number;
    member_name: string;
    member_phone: string;
    base_amount: number;
    dividend_deduction: number;
    net_due_amount: number;
    paid_amount: number;
    status: string;
    last_payment_date?: string;
    notes?: string;
  }>;
}

export async function fetchPastChitGroups(): Promise<PastChitGroupSummary[]> {
  const res = await fetch('/api/past-chit-groups');
  if (!res.ok) throw new Error('Failed to fetch past chit groups');
  return res.json();
}

export async function fetchPastChitSnapshot(id: string): Promise<PastChitSnapshot> {
  const res = await fetch(`/api/past-chit-groups/${id}/snapshot`);
  if (!res.ok) throw new Error('Failed to fetch past chit snapshot');
  return res.json();
}


