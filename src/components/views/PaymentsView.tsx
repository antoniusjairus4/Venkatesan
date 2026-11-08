import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Search,
  MessageSquare,
  Clock,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  Gavel,
  Phone,
  Layers,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  Installment,
  fetchMonthlyPayments,
  updateAuctionDate,
  MonthlyPaymentsResponse,
  MonthlyPaymentInstallment,
  MonthlyPaymentScheme,
} from '@/lib/api';
import {
  formatINR,
  createMonthlyBiddingDueWhatsAppUrl,
  createMultiChitMonthlyBiddingDueWhatsAppUrl,
  createWhatsAppReceiptUrl,
  createMultiChitPaymentReceiptWhatsAppUrl,
} from '@/lib/whatsapp';
import {
  createPaymentClearedSmsUrl,
  createMultiChitPaymentClearedSmsUrl,
  createMonthlyBiddingDueSmsUrl,
  createMultiChitMonthlyBiddingDueSmsUrl,
} from '@/lib/sms';

interface PaymentsViewProps {
  installments?: Installment[];
  onRecordPayment: (inst?: Installment) => void;
  onGoToBidding?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onRecordPayment,
  onGoToBidding,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [data, setData] = useState<MonthlyPaymentsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scheme Filter: 'ALL' or scheme group id
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<string>('ALL');

  // Status Filter: 'PENDING' | 'PARTIAL' | 'PAID' | 'ALL'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'PAID'>('PENDING');
  const [search, setSearch] = useState('');

  // Load monthly payments data
  const loadMonthData = async (month: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonthlyPayments(month);
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to load monthly payments:', err);
      setError((err as Error).message || 'Failed to load monthly payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth]);

  // Filter schemes based on selected scheme tab
  const displayedSchemes = useMemo(() => {
    if (!data) return [];
    if (selectedSchemeFilter === 'ALL') return data.schemes;
    return data.schemes.filter((s) => s.group.id === selectedSchemeFilter);
  }, [data, selectedSchemeFilter]);

  // Flattened installments from displayed schemes, filtered by status & search
  const filteredInstallments = useMemo(() => {
    if (!data) return [];
    const list: Array<{
      inst: MonthlyPaymentInstallment;
      scheme: MonthlyPaymentScheme;
    }> = [];

    displayedSchemes.forEach((scheme) => {
      scheme.installments.forEach((inst) => {
        // Status filter
        if (statusFilter === 'PENDING' && inst.status === 'PAID') return;
        if (statusFilter === 'PARTIAL' && inst.status !== 'PARTIAL') return;
        if (statusFilter === 'PAID' && inst.status !== 'PAID') return;

        // Search query filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = inst.member_name && inst.member_name.toLowerCase().includes(q);
          const matchPhone = inst.member_phone && inst.member_phone.includes(q);
          const matchTicket = String(inst.share_ticket_number).includes(q);
          const matchGroup = inst.group_name && inst.group_name.toLowerCase().includes(q);
          if (!matchName && !matchPhone && !matchTicket && !matchGroup) return;
        }

        list.push({ inst, scheme });
      });
    });

    return list;
  }, [data, displayedSchemes, statusFilter, search]);

  // View Mode: 'MEMBER' (consolidated multi-chit) or 'CHIT' (individual share cards)
  const [viewMode, setViewMode] = useState<'MEMBER' | 'CHIT'>('MEMBER');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [isUpdatingDate, setIsUpdatingDate] = useState<Record<string, boolean>>({});

  const handleUpdateChitDate = async (groupId: string, newDate: string) => {
    if (!newDate) return;
    try {
      setIsUpdatingDate((prev) => ({ ...prev, [groupId]: true }));
      await updateAuctionDate(groupId, selectedMonth, newDate);
      await loadMonthData(selectedMonth);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update chit date');
    } finally {
      setIsUpdatingDate((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  // Group all installments for each member across ALL schemes in this month
  const memberInstallmentsMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        inst: MonthlyPaymentInstallment;
        scheme: MonthlyPaymentScheme;
      }>
    >();

    if (!data) return map;

    data.schemes.forEach((sc) => {
      sc.installments.forEach((inst) => {
        if (!map.has(inst.member_id)) {
          map.set(inst.member_id, []);
        }
        map.get(inst.member_id)!.push({ inst, scheme: sc });
      });
    });

    return map;
  }, [data]);

  // Consolidated member-level list for selectedMonth, filtered by status, search, and date
  const consolidatedMembers = useMemo(() => {
    if (!data) return [];
    const membersList: Array<{
      memberId: string;
      memberName: string;
      memberPhone: string;
      whatsappPhone?: string;
      items: Array<{
        inst: MonthlyPaymentInstallment;
        scheme: MonthlyPaymentScheme;
      }>;
      totalDue: number;
      totalPaid: number;
      totalRemaining: number;
      isAllPaid: boolean;
      isAnyPartial: boolean;
      isAllPending: boolean;
    }> = [];

    memberInstallmentsMap.forEach((items, memberId) => {
      if (items.length === 0) return;
      const first = items[0].inst;
      const totalDue = items.reduce((sum, it) => sum + Number(it.inst.net_due_amount), 0);
      const totalPaid = items.reduce((sum, it) => sum + Number(it.inst.paid_amount), 0);
      const totalRemaining = Math.max(0, totalDue - totalPaid);
      const isAllPaid = items.every((it) => it.inst.status === 'PAID');
      const isAnyPartial = items.some((it) => it.inst.status === 'PARTIAL');
      const isAllPending = items.every((it) => it.inst.status === 'PENDING');

      // Scheme filter
      if (selectedSchemeFilter !== 'ALL') {
        const hasSelectedScheme = items.some((it) => it.scheme.group.id === selectedSchemeFilter);
        if (!hasSelectedScheme) return;
      }

      // Status filter
      if (statusFilter === 'PAID' && !isAllPaid) return;
      if (statusFilter === 'PARTIAL' && !isAnyPartial && isAllPaid) return;
      if (statusFilter === 'PENDING' && isAllPaid) return;

      // Date filter on calendar
      if (dateFilter) {
        const hasDateMatch = items.some((it) => {
          if (it.inst.last_payment_date && it.inst.last_payment_date.startsWith(dateFilter)) return true;
          return it.inst.transactions?.some((tx) => tx.payment_date && tx.payment_date.startsWith(dateFilter));
        });
        if (!hasDateMatch) return;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = first.member_name && first.member_name.toLowerCase().includes(q);
        const matchPhone = first.member_phone && first.member_phone.includes(q);
        const matchTicket = items.some((it) => String(it.inst.share_ticket_number).includes(q));
        const matchGroup = items.some((it) => it.inst.group_name && it.inst.group_name.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchTicket && !matchGroup) return;
      }

      membersList.push({
        memberId,
        memberName: first.member_name,
        memberPhone: first.member_phone,
        whatsappPhone: first.whatsapp_phone,
        items,
        totalDue,
        totalPaid,
        totalRemaining,
        isAllPaid,
        isAnyPartial,
        isAllPending,
      });
    });

    return membersList;
  }, [data, memberInstallmentsMap, selectedSchemeFilter, statusFilter, dateFilter, search]);

  // Consolidated statistics for the current month view
  const currentMonthSummary = useMemo(() => {
    if (!data) {
      return {
        expected: 0,
        collected: 0,
        pending: 0,
        percentage: 0,
        totalMembers: 0,
        paidCount: 0,
      };
    }
    const expected = displayedSchemes.reduce((sum, s) => sum + s.summary.totalExpected, 0);
    const collected = displayedSchemes.reduce((sum, s) => sum + s.summary.totalCollected, 0);
    const pending = Math.max(0, expected - collected);
    const percentage = expected > 0 ? Math.round((collected / expected) * 100) : 0;
    const totalMembers = displayedSchemes.reduce((sum, s) => sum + s.summary.totalMembers, 0);
    const paidCount = displayedSchemes.reduce((sum, s) => sum + s.summary.paidCount, 0);

    return { expected, collected, pending, percentage, totalMembers, paidCount };
  }, [data, displayedSchemes]);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------ */}
      {/* 1. Header Section */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-forest-50 text-forest-700 border border-forest-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Monthly Payments &amp; Installments
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                மாதாந்திர தவணை வரவு &bull; 20-Month Ledger &bull; In-Place 1-Tap Collection &bull; Instant SMS &amp; WhatsApp Receipts
              </p>
            </div>
          </div>
        </div>

        {onGoToBidding && (
          <button
            onClick={onGoToBidding}
            className="flex items-center gap-1.5 py-2 px-3 bg-forest-50 hover:bg-forest-100 text-forest-800 font-bold text-xs rounded-xl border border-forest-200 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Gavel className="w-4 h-4 text-forest-700" />
            <span>View Month Bidding</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. 20-Month Slider / Selector Bar */}
      {/* ------------------------------------------------------------ */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Chit Cycle Duration (20 Months)
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-forest-700" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Select Payment Month: Month {selectedMonth} of 20
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedMonth((m) => Math.max(1, m - 1))}
              disabled={selectedMonth === 1}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="px-3 py-1 rounded-xl bg-forest-700 text-white font-extrabold text-xs">
              M{selectedMonth}
            </span>
            <button
              onClick={() => setSelectedMonth((m) => Math.min(20, m + 1))}
              disabled={selectedMonth === 20}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* 20 Months Interactive Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {Array.from({ length: 20 }, (_, idx) => {
            const m = idx + 1;
            const isSelected = selectedMonth === m;
            const status = data?.monthsStatus?.find((s) => s.month === m);
            const isCompleted = status?.isCompleted;
            const hasAny = status?.hasAny;

            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`flex flex-col items-center justify-center min-w-[42px] h-12 rounded-xl font-extrabold text-xs transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-forest-700 text-white shadow-md shadow-forest-700/30 ring-2 ring-forest-700/40'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    : hasAny
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <span>M{m}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-white'
                      : isCompleted
                      ? 'bg-emerald-500'
                      : hasAny
                      ? 'bg-amber-500'
                      : 'bg-slate-300'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3. Scheme Filter Tabs & Month Summary Banner */}
      {/* ------------------------------------------------------------ */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSchemeFilter('ALL')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedSchemeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All 3 Schemes (1L, 2L, 3L)
        </button>

        {data?.schemes.map((s) => (
          <button
            key={s.group.id}
            onClick={() => setSelectedSchemeFilter(s.group.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedSchemeFilter === s.group.id
                ? 'bg-forest-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.group.name} ({formatINR(s.group.total_pot_value)})
          </button>
        ))}
      </div>

      {/* 3b. Chit Payment Date Selector Banner (Can vary per month, select from calendar from any day) */}
      <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center border border-forest-100 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-forest-900 block">
                Chit Payment Date / சீட்டு தேதி
              </span>
              <span className="text-[10px] font-bold text-forest-700 bg-forest-50 px-2 py-0.5 rounded-md border border-forest-200">
                Select from calendar
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Chit payment date can vary per month &bull; Select any day from calendar below:
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {displayedSchemes.map((s) => {
            const currentChitDate = s.auction?.auction_date
              ? new Date(s.auction.auction_date).toISOString().split('T')[0]
              : '';
            return (
              <div
                key={s.group.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
              >
                <span className="text-forest-900 font-black">{s.group.name}:</span>
                <input
                  type="date"
                  value={currentChitDate}
                  onChange={(e) => handleUpdateChitDate(s.group.id, e.target.value)}
                  disabled={isUpdatingDate[s.group.id]}
                  className="px-2 py-0.5 text-xs font-black bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-forest-700 cursor-pointer shadow-2xs"
                  title="Select any day from calendar for this chit's payment date"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Health Banner for Selected Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Month {selectedMonth} Expected Due
          </span>
          <strong className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
            {formatINR(currentMonthSummary.expected)}
          </strong>
          <span className="text-[10px] text-slate-500">
            {currentMonthSummary.totalMembers} Members Active
          </span>
        </div>

        <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Collected / Received
          </span>
          <strong className="text-base sm:text-lg font-black text-emerald-700 block mt-0.5">
            {formatINR(currentMonthSummary.collected)}
          </strong>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {currentMonthSummary.paidCount} / {currentMonthSummary.totalMembers} Cleared
          </span>
        </div>

        <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Pending Collections
          </span>
          <strong className="text-base sm:text-lg font-black text-amber-700 block mt-0.5">
            {formatINR(currentMonthSummary.pending)}
          </strong>
          <span className="text-[10px] text-amber-600 font-semibold">
            Action Required
          </span>
        </div>

        <div className="bg-white/95 p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Collection Progress
          </span>
          <strong className="text-base sm:text-lg font-black text-forest-900 block mt-0.5">
            {currentMonthSummary.percentage}%
          </strong>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-forest-700 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, currentMonthSummary.percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bidding Summary Note if Single Scheme is Selected */}
      {selectedSchemeFilter !== 'ALL' && (
        (() => {
          const scheme = data?.schemes.find((s) => s.group.id === selectedSchemeFilter);
          if (!scheme) return null;
          const isAuctionDone = scheme.auction !== null;

          return (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isAuctionDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      {scheme.group.name} &bull; Month {selectedMonth} Bidding Status:
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isAuctionDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isAuctionDone ? 'Finalized' : 'Pending Bidding'}
                    </span>
                  </div>
                  {isAuctionDone ? (
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Winner: <strong>{scheme.auction?.winning_member_name}</strong> &bull; Payout: {formatINR(scheme.auction?.payout_amount || 0)} &bull; Thalubadi: {formatINR(scheme.auction?.thalubadi || 0)} &bull; Kasiru 5%: {formatINR(scheme.auction?.kasiru || 0)} &bull; <strong>Per Member Due: {formatINR(scheme.auction?.net_installment_due || 0)}</strong>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Bidding has not been finalized yet. Base due of {formatINR(scheme.math.baseMonthly)} is currently applied until bidding is held.
                    </p>
                  )}
                </div>
              </div>

              {onGoToBidding && (
                <button
                  onClick={onGoToBidding}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors self-start sm:self-auto cursor-pointer"
                >
                  {isAuctionDone ? 'Edit Bidding' : 'Conduct Bidding'}
                </button>
              )}
            </div>
          );
        })()
      )}

      {/* ------------------------------------------------------------ */}
      {/* 4. Filter Tabs, View Mode Switcher, Date Calendar & Search */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-white/90 p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            {[
              { id: 'PENDING', label: 'Action Required' },
              { id: 'PARTIAL', label: 'Partial Only' },
              { id: 'PAID', label: 'Paid' },
              { id: 'ALL', label: 'All' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-forest-700 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Mode Switcher: By Member vs By Individual Chit */}
          <div className="flex items-center bg-white/90 p-1 rounded-2xl border border-slate-200 shadow-xs text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('MEMBER')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'MEMBER'
                  ? 'bg-forest-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Group multi-chit subscribers together so messages go as one"
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Member (1 Msg)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CHIT')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'CHIT'
                  ? 'bg-forest-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View individual chit shares"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Share</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Date Filter on Calendar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-forest-700 shrink-0" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              title="Filter by payment transaction date"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member, phone, #..."
              className="w-full pl-9 pr-3 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 5. Members Installments Ledger for Selected Month */}
      {/* ------------------------------------------------------------ */}
      {loading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
          <div className="w-8 h-8 border-4 border-forest-700/20 border-t-forest-700 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Loading Month {selectedMonth} Installments...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          <p className="text-xs font-bold">{error}</p>
          <button
            onClick={() => loadMonthData(selectedMonth)}
            className="mt-2 px-3 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : viewMode === 'MEMBER' ? (
        /* ============================================================ */
        /* VIEW A: Grouped by Member (Multi-Chit Consolidated Mode)      */
        /* If a person is in 2 or more chits, messages go as ONE!       */
        /* ============================================================ */
        consolidatedMembers.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              No members found for Month {selectedMonth} with current filters
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {consolidatedMembers.map((member) => {
              const isMultiChit = member.items.length > 1;

              // Build multi-chit due items
              const multiChitDueItems = member.items.map(({ inst, scheme }) => {
                const due = Number(inst.net_due_amount);
                const paid = Number(inst.paid_amount);
                const rem = Math.max(0, due - paid);
                const base = Number(scheme.group.installment_base_amount);
                const kas = scheme.auction ? Number(scheme.auction.kasiru) : Math.max(0, base - due);
                return {
                  groupName: inst.group_name,
                  ticketNumber: inst.share_ticket_number,
                  monthNumber: selectedMonth,
                  installmentDue: due,
                  kasiru: kas,
                  baseAmount: base,
                  paidAmount: paid,
                  remainingBalance: rem,
                  status: inst.status,
                };
              });

              // Build multi-chit receipt items
              const multiChitReceiptItems = member.items.map(({ inst }) => ({
                groupName: inst.group_name,
                ticketNumber: inst.share_ticket_number,
                monthNumber: selectedMonth,
                installmentDue: Number(inst.net_due_amount),
                amountPaid: Number(inst.paid_amount),
                remainingBalance: Math.max(0, Number(inst.net_due_amount) - Number(inst.paid_amount)),
                status: inst.status,
              }));

              // Primary chit payment date from the scheme
              const primaryChitDate = member.items[0]?.scheme?.auction?.auction_date
                ? new Date(member.items[0].scheme.auction.auction_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : undefined;

              const lastPaymentDateStr = member.items.find((it) => it.inst.last_payment_date)?.inst.last_payment_date;
              const formattedLastPaymentDate = lastPaymentDateStr
                ? new Date(lastPaymentDateStr).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : primaryChitDate;

              // Consolidated Message URLs
              const dueSmsUrl = isMultiChit
                ? createMultiChitMonthlyBiddingDueSmsUrl({
                    phone: member.memberPhone,
                    memberName: member.memberName,
                    noticeDate: primaryChitDate,
                    monthNumber: selectedMonth,
                    items: multiChitDueItems,
                  })
                : createMonthlyBiddingDueSmsUrl({
                    phone: member.memberPhone,
                    memberName: member.memberName,
                    groupName: member.items[0].inst.group_name,
                    monthNumber: selectedMonth,
                    winnerPayoutAmount: member.items[0].scheme.auction?.payout_amount || 0,
                    installmentDue: Number(member.items[0].inst.net_due_amount),
                    dividendSavings: member.items[0].scheme.auction ? Number(member.items[0].scheme.auction.dividend_per_share) : 0,
                    kasiru: multiChitDueItems[0].kasiru,
                    baseAmount: multiChitDueItems[0].baseAmount,
                    noticeDate: primaryChitDate,
                  });

              const dueWaUrl = isMultiChit
                ? createMultiChitMonthlyBiddingDueWhatsAppUrl({
                    phone: member.whatsappPhone || member.memberPhone,
                    memberName: member.memberName,
                    noticeDate: primaryChitDate,
                    monthNumber: selectedMonth,
                    items: multiChitDueItems,
                  })
                : createMonthlyBiddingDueWhatsAppUrl({
                    phone: member.whatsappPhone || member.memberPhone,
                    memberName: member.memberName,
                    groupName: member.items[0].inst.group_name,
                    monthNumber: selectedMonth,
                    winnerPayoutAmount: member.items[0].scheme.auction?.payout_amount || 0,
                    installmentDue: Number(member.items[0].inst.net_due_amount),
                    dividendSavings: member.items[0].scheme.auction ? Number(member.items[0].scheme.auction.dividend_per_share) : 0,
                    kasiru: multiChitDueItems[0].kasiru,
                    baseAmount: multiChitDueItems[0].baseAmount,
                    noticeDate: primaryChitDate,
                  });

              const receiptSmsUrl = isMultiChit
                ? createMultiChitPaymentClearedSmsUrl({
                    phone: member.memberPhone,
                    memberName: member.memberName,
                    paymentDate: formattedLastPaymentDate,
                    items: multiChitReceiptItems,
                  })
                : createPaymentClearedSmsUrl({
                    phone: member.memberPhone,
                    memberName: member.memberName,
                    groupName: member.items[0].inst.group_name,
                    monthNumber: selectedMonth,
                    amountPaid: Number(member.items[0].inst.paid_amount),
                    installmentDue: Number(member.items[0].inst.net_due_amount),
                    remainingBalance: Number(member.items[0].inst.net_due_amount) - Number(member.items[0].inst.paid_amount),
                    paymentDate: formattedLastPaymentDate,
                  });

              const receiptWaUrl = isMultiChit
                ? createMultiChitPaymentReceiptWhatsAppUrl({
                    phone: member.whatsappPhone || member.memberPhone,
                    memberName: member.memberName,
                    paymentDate: formattedLastPaymentDate,
                    items: multiChitReceiptItems,
                  })
                : createWhatsAppReceiptUrl({
                    phone: member.whatsappPhone || member.memberPhone,
                    memberName: member.memberName,
                    groupName: member.items[0].inst.group_name,
                    ticketNumber: member.items[0].inst.share_ticket_number,
                    monthNumber: selectedMonth,
                    amountPaid: Number(member.items[0].inst.paid_amount),
                    installmentDue: Number(member.items[0].inst.net_due_amount),
                    remainingBalance: Number(member.items[0].inst.net_due_amount) - Number(member.items[0].inst.paid_amount),
                    status: member.items[0].inst.status,
                    paymentDate: formattedLastPaymentDate,
                  });

              // Target installment for "Collect" button (prioritizes pending installment)
              const pendingInst = member.items.find((it) => Number(it.inst.net_due_amount) - Number(it.inst.paid_amount) > 0)?.inst || member.items[0].inst;

              return (
                <div
                  key={member.memberId}
                  className={`bg-white/95 backdrop-blur-md rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
                    isMultiChit
                      ? 'border-amber-200/90 hover:border-amber-400 bg-amber-50/15'
                      : 'border-slate-200/80 hover:border-forest-300'
                  }`}
                >
                  {/* Member Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isMultiChit
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-forest-50 text-forest-800 border border-forest-100'
                        }`}
                      >
                        {isMultiChit ? `${member.items.length}C` : `#${member.items[0].inst.share_ticket_number}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">
                            {member.memberName}
                          </h4>
                          {isMultiChit ? (
                            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              {member.items.length} Chits &bull; Messages go as ONE
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-100">
                              1 Chit Scheme
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              member.isAllPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : member.isAnyPartial
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {member.isAllPaid ? 'Fully Paid ✓' : member.isAnyPartial ? 'Partially Paid' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {member.memberPhone} &bull; Month {selectedMonth} of 20
                        </p>
                      </div>
                    </div>

                    {/* Member Totals */}
                    <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/70">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Due</span>
                        <strong className="text-slate-900 font-extrabold">{formatINR(member.totalDue)}</strong>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Paid</span>
                        <strong className="text-emerald-700 font-extrabold">{formatINR(member.totalPaid)}</strong>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Remaining</span>
                        <strong className={member.totalRemaining > 0 ? 'text-amber-800 font-black' : 'text-emerald-700 font-black'}>
                          {member.totalRemaining > 0 ? formatINR(member.totalRemaining) : 'NIL ✓'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Enrolled Chits Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
                    {member.items.map(({ inst, scheme }) => {
                      const itemDue = Number(inst.net_due_amount);
                      const itemPaid = Number(inst.paid_amount);
                      const itemRem = Math.max(0, itemDue - itemPaid);
                      const itemSettled = inst.status === 'PAID';

                      return (
                        <div
                          key={inst.id}
                          className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-slate-900">{inst.group_name}</span>
                              <span className="text-[10px] font-bold text-forest-700 bg-white px-1.5 py-0.2 rounded border border-forest-200">
                                #{inst.share_ticket_number}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Due: {formatINR(itemDue)} &bull; Paid: {formatINR(itemPaid)}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            {itemSettled ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                Paid ✓
                              </span>
                            ) : (
                              <span className="text-xs font-black text-amber-700">
                                {formatINR(itemRem)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 1-Tap Consolidated Actions Row (Messages go as ONE) */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 mt-3">
                    <span className="text-[11px] font-bold text-forest-800 flex items-center gap-1">
                      {isMultiChit && <span>✓ Consolidated 1-Message enabled for all {member.items.length} chits</span>}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Due Notices (Message 2 - as 1 message) */}
                      {!member.isAllPaid && (
                        <>
                          <a
                            href={dueSmsUrl}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                            title={isMultiChit ? `Send ONE combined SMS due notice for ${member.items.length} chits` : 'Send SMS Due Notice'}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                            <span>{isMultiChit ? 'SMS Due (1 Msg)' : 'SMS Due'}</span>
                          </a>

                          <a
                            href={dueWaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            title={isMultiChit ? `Send ONE combined WhatsApp due notice for ${member.items.length} chits` : 'Send WhatsApp Due Notice'}
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{isMultiChit ? 'WhatsApp Due (1 Msg)' : 'WhatsApp Due'}</span>
                          </a>
                        </>
                      )}

                      {/* Payment Receipts (Message 3 - as 1 consolidated receipt) */}
                      {member.totalPaid > 0 && (
                        <>
                          <a
                            href={receiptSmsUrl}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors cursor-pointer"
                            title={isMultiChit ? `Send ONE combined SMS receipt for all ${member.items.length} chits` : 'Send SMS Receipt'}
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                            <span>{isMultiChit ? 'SMS Receipt (1 Msg)' : 'SMS Receipt'}</span>
                          </a>

                          <a
                            href={receiptWaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                            title={isMultiChit ? `Send ONE combined WhatsApp receipt for all ${member.items.length} chits` : 'Send WhatsApp Receipt'}
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{isMultiChit ? 'WA Receipt (1 Msg)' : 'WhatsApp Receipt'}</span>
                          </a>
                        </>
                      )}

                      {/* In-place Record Payment */}
                      {!member.isAllPaid && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(pendingInst as any)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                          title={`Record payment for ${member.memberName}`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect {formatINR(member.totalRemaining)}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ============================================================ */
        /* VIEW B: Individual Share List View                            */
        /* If subscriber has 2 or more chits, messages still go as ONE! */
        /* ============================================================ */
        filteredInstallments.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">
              No installments found for Month {selectedMonth} with this filter
            </p>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
            {filteredInstallments.map(({ inst, scheme }) => {
              const due = Number(inst.net_due_amount);
              const paid = Number(inst.paid_amount);
              const remaining = Math.max(0, due - paid);
              const isPaid = inst.status === 'PAID';
              const isPartial = inst.status === 'PARTIAL';

              const pot = Number(scheme.group.total_pot_value);
              const thalubadi = scheme.auction ? Number(scheme.auction.thalubadi) : scheme.math.thalubadi;
              const kasiru = scheme.auction ? Number(scheme.auction.kasiru) : scheme.math.kasiru;
              const baseAmount = Number(scheme.group.installment_base_amount);
              const savings = scheme.auction ? Number(scheme.auction.dividend_per_share) : scheme.math.dividendPerShare;
              const payoutAmount = scheme.auction ? Number(scheme.auction.payout_amount) : 0;

              // Check if member holds 2 or more chits across this month
              const allInstsForMember = memberInstallmentsMap.get(inst.member_id) || [];
              const isMultiChit = allInstsForMember.length > 1;

              const multiChitDueItems = allInstsForMember.map(({ inst: i, scheme: s }) => ({
                groupName: i.group_name,
                ticketNumber: i.share_ticket_number,
                monthNumber: selectedMonth,
                installmentDue: Number(i.net_due_amount),
                kasiru: s.auction ? Number(s.auction.kasiru) : Math.max(0, Number(s.group.installment_base_amount) - Number(i.net_due_amount)),
                baseAmount: Number(s.group.installment_base_amount),
                paidAmount: Number(i.paid_amount),
                remainingBalance: Math.max(0, Number(i.net_due_amount) - Number(i.paid_amount)),
                status: i.status,
              }));

              const multiChitReceiptItems = allInstsForMember.map(({ inst: i }) => ({
                groupName: i.group_name,
                ticketNumber: i.share_ticket_number,
                monthNumber: selectedMonth,
                installmentDue: Number(i.net_due_amount),
                amountPaid: Number(i.paid_amount),
                remainingBalance: Math.max(0, Number(i.net_due_amount) - Number(i.paid_amount)),
                status: i.status,
              }));

              const chitDateStr = scheme.auction?.auction_date
                ? new Date(scheme.auction.auction_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : undefined;

              // Message 2 URLs (Due Notice with in-built date - ONE message if multi-chit)
              const dueSmsUrl = isMultiChit
                ? createMultiChitMonthlyBiddingDueSmsUrl({
                    phone: inst.member_phone,
                    memberName: inst.member_name,
                    noticeDate: chitDateStr,
                    monthNumber: selectedMonth,
                    items: multiChitDueItems,
                  })
                : createMonthlyBiddingDueSmsUrl({
                    phone: inst.member_phone,
                    memberName: inst.member_name,
                    groupName: inst.group_name,
                    monthNumber: selectedMonth,
                    winnerPayoutAmount: payoutAmount,
                    installmentDue: due,
                    dividendSavings: savings,
                    thalubadi,
                    kasiru,
                    baseAmount,
                    noticeDate: chitDateStr,
                  });

              const dueWaUrl = isMultiChit
                ? createMultiChitMonthlyBiddingDueWhatsAppUrl({
                    phone: inst.whatsapp_phone || inst.member_phone,
                    memberName: inst.member_name,
                    noticeDate: chitDateStr,
                    monthNumber: selectedMonth,
                    items: multiChitDueItems,
                  })
                : createMonthlyBiddingDueWhatsAppUrl({
                    phone: inst.whatsapp_phone || inst.member_phone,
                    memberName: inst.member_name,
                    groupName: inst.group_name,
                    monthNumber: selectedMonth,
                    winnerPayoutAmount: payoutAmount,
                    installmentDue: due,
                    dividendSavings: savings,
                    thalubadi,
                    kasiru,
                    baseAmount,
                    noticeDate: chitDateStr,
                  });

              // Message 3 URLs (Payment Confirmation Receipt - ONE message if multi-chit)
              const paymentDateStr = inst.last_payment_date
                ? new Date(inst.last_payment_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : chitDateStr;

              const expectedDateStr = inst.expected_payment_date
                ? new Date(inst.expected_payment_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : undefined;

              const receiptSmsUrl = isMultiChit
                ? createMultiChitPaymentClearedSmsUrl({
                    phone: inst.member_phone,
                    memberName: inst.member_name,
                    paymentDate: paymentDateStr,
                    items: multiChitReceiptItems,
                  })
                : createPaymentClearedSmsUrl({
                    phone: inst.member_phone,
                    memberName: inst.member_name,
                    groupName: inst.group_name,
                    monthNumber: selectedMonth,
                    amountPaid: paid,
                    installmentDue: due,
                    thalubadi,
                    kasiru,
                    remainingBalance: remaining,
                    paymentDate: paymentDateStr,
                    expectedPaymentDate: expectedDateStr,
                  });

              const receiptWaUrl = isMultiChit
                ? createMultiChitPaymentReceiptWhatsAppUrl({
                    phone: inst.whatsapp_phone || inst.member_phone,
                    memberName: inst.member_name,
                    paymentDate: paymentDateStr,
                    items: multiChitReceiptItems,
                  })
                : createWhatsAppReceiptUrl({
                    phone: inst.whatsapp_phone || inst.member_phone,
                    memberName: inst.member_name,
                    groupName: inst.group_name,
                    ticketNumber: inst.share_ticket_number,
                    monthNumber: selectedMonth,
                    amountPaid: paid,
                    installmentDue: due,
                    remainingBalance: remaining,
                    status: inst.status,
                    paymentDate: paymentDateStr,
                    expectedPaymentDate: expectedDateStr,
                  });

              return (
                <div
                  key={inst.id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Member Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-800 font-black flex items-center justify-center text-xs shrink-0 mt-0.5 border border-forest-100">
                      #{inst.share_ticket_number}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          {inst.member_name}
                        </span>
                        {isMultiChit && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            {allInstsForMember.length} Chits &bull; 1 Msg
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isPaid ? 'Fully Paid ✓' : isPartial ? 'Partially Paid' : 'Pending'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5">
                        {inst.group_name} &bull; Month {selectedMonth} of 20 &bull; {inst.member_phone}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs mt-1.5 font-medium">
                        <span className="text-slate-500">
                          Month Due: <strong className="text-slate-900">{formatINR(due)}</strong>
                        </span>
                        <span className="text-emerald-700 font-semibold">
                          Paid: <strong>{formatINR(paid)}</strong>
                        </span>
                        {!isPaid && (
                          <span className="text-amber-700 font-bold">
                            Pending: {formatINR(remaining)}
                          </span>
                        )}
                        {inst.last_payment_date && (
                          <span className="text-[11px] text-slate-400">
                            Last Paid: {new Date(inst.last_payment_date).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>

                      {/* Breakdown of split installment dates */}
                      {inst.transactions && inst.transactions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Instalments ({inst.transactions.length}):
                          </span>
                          {inst.transactions.map((tx, idx) => (
                            <span
                              key={tx.id || idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200"
                            >
                              <span className="text-forest-800 font-extrabold">#{idx + 1}: {formatINR(tx.amount_paid)}</span>
                              <span className="text-slate-400">&bull;</span>
                              <span className="text-slate-600">
                                {new Date(tx.payment_date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-[10px] text-slate-400">({tx.payment_method})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Expected promised date */}
                      {!isPaid && inst.expected_payment_date && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80 w-fit">
                          <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>
                            Promised Payment Date (அடுத்த தவணை):{' '}
                            {new Date(inst.expected_payment_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Action Buttons Row */}
                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                    {/* If Paid: Offer Receipt Triggers (Message 3) */}
                    {isPaid ? (
                      <>
                        <a
                          href={receiptSmsUrl}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors"
                          title={isMultiChit ? `Send 1 combined SMS receipt for ${allInstsForMember.length} chits` : 'Send SMS Receipt'}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                          <span>{isMultiChit ? 'SMS Receipt (1 Msg)' : 'SMS Receipt'}</span>
                        </a>

                        <a
                          href={receiptWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                          title={isMultiChit ? `Send 1 combined WhatsApp receipt for ${allInstsForMember.length} chits` : 'Send WhatsApp Receipt'}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{isMultiChit ? 'WA Receipt (1 Msg)' : 'WhatsApp Receipt'}</span>
                        </a>
                      </>
                    ) : isPartial ? (
                      /* If Partial: Offer In-Place Collect + Receipt + Due Notice */
                      <>
                        <a
                          href={receiptWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                          title={isMultiChit ? `Send 1 combined WhatsApp receipt for ${allInstsForMember.length} chits` : 'Send WhatsApp Receipt'}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{isMultiChit ? 'WA Receipt (1 Msg)' : 'WhatsApp Receipt'}</span>
                        </a>

                        <a
                          href={dueWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                          title={isMultiChit ? `Send 1 combined WhatsApp due notice for ${allInstsForMember.length} chits` : 'Send WhatsApp Due'}
                        >
                          <Phone className="w-3.5 h-3.5 text-amber-700" />
                          <span>{isMultiChit ? 'WA Due (1 Msg)' : 'WhatsApp Due'}</span>
                        </a>

                        <button
                          onClick={() => onRecordPayment(inst as any)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                          title={`Record payment of ${formatINR(remaining)} for ${inst.member_name}`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect {formatINR(remaining)}</span>
                        </button>
                      </>
                    ) : (
                      /* If Pending: Offer Due Reminders (Message 2) + In-Place Collect */
                      <>
                        <a
                          href={dueSmsUrl}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                          title={isMultiChit ? `Send 1 combined SMS due notice for ${allInstsForMember.length} chits` : 'Send Due SMS'}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                          <span>{isMultiChit ? 'SMS Due (1 Msg)' : 'SMS Due'}</span>
                        </a>

                        <a
                          href={dueWaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                          title={isMultiChit ? `Send 1 combined WhatsApp due notice for ${allInstsForMember.length} chits` : 'Send Due WhatsApp'}
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{isMultiChit ? 'WA Due (1 Msg)' : 'WhatsApp Due'}</span>
                        </a>

                        <button
                          onClick={() => onRecordPayment(inst as any)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                          title={`Record payment of ${formatINR(remaining)} for ${inst.member_name}`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Collect {formatINR(remaining)}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
