import React, { useState, useEffect, useMemo } from 'react';
import {
  Gavel,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calculator,
  UserCheck,
  AlertTriangle,
  Copy,
  Check,
  X,
  Phone,
  Layers,
  Users,
  Archive,
} from 'lucide-react';
import {
  fetchMonthBiddingData,
  recordBidding,
  deleteBidding,
  moveChitGroupAsCompleted,
  MonthBiddingResponse,
  MonthSchemeBiddingData,
  ChitGroup,
} from '@/lib/api';
import {
  formatINR,
  createBiddingWinnerSmsUrl,
  createMonthlyBiddingDueSmsUrl,
  getBiddingWinnerText,
  getMonthlyBiddingDueText,
} from '@/lib/sms';
import {
  createBiddingWinnerWhatsAppUrl,
  createMonthlyBiddingDueWhatsAppUrl,
} from '@/lib/whatsapp';

interface BiddingViewProps {
  onGoToChits?: () => void;
  onGoToPayments?: () => void;
}

export const BiddingView: React.FC<BiddingViewProps> = ({ onGoToChits }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [data, setData] = useState<MonthBiddingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scheme filter: 'ALL' or specific group id
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<string>('ALL');

  // Input states per scheme (keyed by group.id)
  const [formInputs, setFormInputs] = useState<
    Record<
      string,
      {
        winningMemberId: string;
        payoutAmount: string;
        notes: string;
        isSubmitting: boolean;
      }
    >
  >({});

  // Modals state
  const [winnerModalScheme, setWinnerModalScheme] = useState<MonthSchemeBiddingData | null>(null);
  const [membersModalScheme, setMembersModalScheme] = useState<MonthSchemeBiddingData | null>(null);
  const [deleteConfirmScheme, setDeleteConfirmScheme] = useState<MonthSchemeBiddingData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [moveConfirmGroup, setMoveConfirmGroup] = useState<ChitGroup | null>(null);
  const [isMovingCompleted, setIsMovingCompleted] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load bidding data whenever selectedMonth changes
  const loadMonthData = async (month: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchMonthBiddingData(month);
      setData(res);

      // Pre-fill form inputs with sensible defaults
      const initialInputs: Record<
        string,
        { winningMemberId: string; payoutAmount: string; notes: string; isSubmitting: boolean }
      > = {};

      res.schemes.forEach((s) => {
        const defaultWinner =
          s.subscribers.find((sub) => !sub.is_prized)?.member_id ||
          (s.subscribers[0] ? s.subscribers[0].member_id : '');

        // Default suggestion: 95% of pot or default discount
        const pot = Number(s.group.total_pot_value);
        const defaultPayout = String(Math.round(pot * 0.95));

        initialInputs[s.group.id] = {
          winningMemberId: s.auction ? s.auction.winning_member_id : defaultWinner,
          payoutAmount: s.auction ? String(s.auction.payout_amount) : defaultPayout,
          notes: s.auction?.notes || '',
          isSubmitting: false,
        };
      });

      setFormInputs(initialInputs);
    } catch (err: unknown) {
      console.error('Failed to load month bidding data:', err);
      setError((err as Error).message || 'Failed to load month bidding data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Handle saving a scheme bidding
  const handleSaveBidding = async (scheme: MonthSchemeBiddingData) => {
    const inputs = formInputs[scheme.group.id];
    if (!inputs || !inputs.winningMemberId) {
      alert('Please select a winning member.');
      return;
    }

    const payoutNum = parseFloat(inputs.payoutAmount);
    const pot = Number(scheme.group.total_pot_value);

    if (isNaN(payoutNum) || payoutNum <= 0 || payoutNum > pot) {
      alert(`Please enter a valid winning payout amount between ₹1 and ₹${pot.toLocaleString('en-IN')}`);
      return;
    }

    try {
      setFormInputs((prev) => ({
        ...prev,
        [scheme.group.id]: { ...prev[scheme.group.id], isSubmitting: true },
      }));

      await recordBidding({
        chit_group_id: scheme.group.id,
        month_number: selectedMonth,
        winning_member_id: inputs.winningMemberId,
        winner_payout_amount: payoutNum,
        notes: inputs.notes.trim() || undefined,
      });

      // Reload updated month data
      await loadMonthData(selectedMonth);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save bidding record.');
    } finally {
      setFormInputs((prev) => ({
        ...prev,
        [scheme.group.id]: { ...prev[scheme.group.id], isSubmitting: false },
      }));
    }
  };

  // Handle deleting a scheme bidding
  const handleConfirmDelete = async () => {
    if (!deleteConfirmScheme) return;
    try {
      setIsDeleting(true);
      await deleteBidding(deleteConfirmScheme.group.id, selectedMonth);
      setDeleteConfirmScheme(null);
      await loadMonthData(selectedMonth);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete bidding record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle moving an entire scheme as completed
  const handleMoveCompleted = async () => {
    if (!moveConfirmGroup) return;
    try {
      setIsMovingCompleted(true);
      await moveChitGroupAsCompleted(moveConfirmGroup.id);
      setMoveConfirmGroup(null);
      await loadMonthData(selectedMonth);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to move scheme as completed.');
    } finally {
      setIsMovingCompleted(false);
    }
  };

  // Schemes to display based on filter
  const displayedSchemes = useMemo(() => {
    if (!data) return [];
    if (selectedSchemeFilter === 'ALL') return data.schemes;
    return data.schemes.filter((s) => s.group.id === selectedSchemeFilter);
  }, [data, selectedSchemeFilter]);

  // Overall statistics for current month
  const monthCompletedCount = data?.schemes.filter((s) => s.auction !== null).length || 0;
  const totalSchemesCount = data?.schemes.length || 3;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ */}
      {/* 1. Header Section */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-forest-50 text-forest-700 border border-forest-100">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Monthly Chit Bidding &amp; Yelam
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                மாதாந்திர ஏலம் &bull; Winner Payout &bull; Automated Math (₹Amount ÷ 20 Members) &bull; 1-Tap Notifications
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onGoToChits && (
            <button
              onClick={onGoToChits}
              className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Chit Schemes</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-forest-50 border border-forest-200 text-xs font-bold text-forest-900">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
            <span>
              Month {selectedMonth} Bidding: {monthCompletedCount}/{totalSchemesCount} Done
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 2. Interactive Month Slider (1 to 20 Months) */}
      {/* ------------------------------------------------------------ */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-forest-700 block">
              Chit Cycle Duration (20 Months)
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Select Bidding Month: <span className="text-forest-700">Month {selectedMonth} of 20</span>
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedMonth((m) => Math.max(1, m - 1))}
              disabled={selectedMonth <= 1}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-forest-700 text-white font-extrabold text-xs shadow-2xs min-w-[50px] text-center">
              M{selectedMonth}
            </span>

            <button
              onClick={() => setSelectedMonth((m) => Math.min(20, m + 1))}
              disabled={selectedMonth >= 20}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Range Slider Track */}
        <div className="space-y-2 pt-1">
          <input
            type="range"
            min={1}
            max={20}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-forest-700 transition-all focus:outline-none"
          />

          <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
            <span>Month 1 (Start)</span>
            <span>Month 10 (Mid-Cycle)</span>
            <span>Month 20 (Maturity)</span>
          </div>
        </div>

        {/* 20 Clickable Month Pills with Completion Dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {data?.monthsStatus?.map((m) => {
            const isSelected = m.month === selectedMonth;
            const hasAuction = m.hasAny;
            const isAllDone = m.isCompleted;

            return (
              <button
                key={m.month}
                onClick={() => setSelectedMonth(m.month)}
                className={`shrink-0 flex flex-col items-center justify-center min-w-[42px] py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-forest-700 text-white shadow-xs scale-105 ring-2 ring-forest-500/20'
                    : hasAuction
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>M{m.month}</span>
                <span className="flex items-center gap-0.5 mt-0.5">
                  {isAllDone ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="All 3 Biddings Completed" />
                  ) : hasAuction ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Partial Biddings Logged" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 3. Scheme Filter Switcher (All vs 1L vs 2L vs 3L) */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedSchemeFilter('ALL')}
          className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedSchemeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white/90 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          All 3 Schemes (1L, 2L, 3L)
        </button>

        {data?.schemes.map((s) => (
          <button
            key={s.group.id}
            onClick={() => setSelectedSchemeFilter(s.group.id)}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedSchemeFilter === s.group.id
                ? 'bg-forest-700 text-white shadow-xs'
                : 'bg-white/90 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {s.group.name} ({formatINR(Number(s.group.total_pot_value))})
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* 4. Scheme Bidding Cards Grid */}
      {/* ------------------------------------------------------------ */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-slate-200 animate-pulse space-y-4"
            >
              <div className="h-6 bg-slate-200 rounded-lg w-1/2" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          <p className="font-bold text-sm">Failed to load bidding data</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button
            onClick={() => loadMonthData(selectedMonth)}
            className="mt-3 px-4 py-2 bg-rose-700 text-white text-xs font-bold rounded-xl"
          >
            Retry Loading
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {displayedSchemes.map((scheme) => {
            const pot = Number(scheme.group.total_pot_value);
            const totalMembers = Number(scheme.group.total_shares || 20);
            const isFinalized = scheme.auction !== null;
            const currentInputs = formInputs[scheme.group.id] || {
              winningMemberId: '',
              payoutAmount: String(Math.round(pot * 0.95)),
              notes: '',
              isSubmitting: false,
            };

            // Real-time live math calculation
            const inputPayout = parseFloat(currentInputs.payoutAmount) || 0;
            const liveWinnerPayout = isFinalized ? Number(scheme.auction?.payout_amount) : inputPayout;
            const liveTasiru = Math.max(0, pot - liveWinnerPayout);
            const livePerMemberDue = Math.round(liveWinnerPayout / totalMembers);
            const liveDividendPerMember = Math.round(liveTasiru / totalMembers);

            // Preset suggestions based on pot
            const presets =
              pot === 100000
                ? [80000, 85000, 90000, 95000]
                : pot === 200000
                ? [160000, 170000, 180000, 190000]
                : [240000, 255000, 270000, 285000];

            return (
              <div
                key={scheme.group.id}
                className={`bg-white/95 backdrop-blur-md rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  isFinalized
                    ? 'border-emerald-200/90 hover:border-emerald-300'
                    : 'border-slate-200/90 hover:border-forest-300'
                }`}
              >
                {/* Card Top / Scheme Details */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Scheme Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-slate-900">{scheme.group.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 border border-forest-100">
                          {formatINR(pot)}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Month {selectedMonth} of 20 &bull; {totalMembers} Members
                      </span>
                    </div>

                    {isFinalized ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>Finalized</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Pending Bidding</span>
                      </span>
                    )}
                  </div>

                  {/* ------------------------------------------------------------ */}
                  {/* Case A: Bidding NOT Yet Recorded (Interactive Entry Form) */}
                  {/* ------------------------------------------------------------ */}
                  {!isFinalized ? (
                    <div className="space-y-4">
                      {/* 1. Winner Selection Dropdown */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Select Bidding Winner (வெற்றியாளர்)
                        </label>
                        <select
                          value={currentInputs.winningMemberId}
                          onChange={(e) =>
                            setFormInputs((prev) => ({
                              ...prev,
                              [scheme.group.id]: {
                                ...prev[scheme.group.id],
                                winningMemberId: e.target.value,
                              },
                            }))
                          }
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                        >
                          <option value="">-- Choose Winning Member --</option>
                          {scheme.subscribers.map((sub) => (
                            <option key={sub.share_id} value={sub.member_id}>
                              #{sub.share_ticket_number} - {sub.member_name} ({sub.member_phone})
                              {sub.is_prized ? ` [Prized M${sub.prized_month_number || ''}]` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Winner Payout Amount Input */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Winner Prize Amount (வெற்றித் தொகை)
                          </label>
                          <span className="text-[10px] font-bold text-slate-400">
                            Max: {formatINR(pot)}
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="1"
                            max={pot}
                            value={currentInputs.payoutAmount}
                            onChange={(e) =>
                              setFormInputs((prev) => ({
                                ...prev,
                                [scheme.group.id]: {
                                  ...prev[scheme.group.id],
                                  payoutAmount: e.target.value,
                                },
                              }))
                            }
                            placeholder="e.g. 95000 or 80000"
                            className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                          />
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[10px] font-bold text-slate-400">Presets:</span>
                          {presets.map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setFormInputs((prev) => ({
                                  ...prev,
                                  [scheme.group.id]: {
                                    ...prev[scheme.group.id],
                                    payoutAmount: String(val),
                                  },
                                }))
                              }
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                currentInputs.payoutAmount === String(val)
                                  ? 'bg-forest-700 text-white border-forest-700'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                              }`}
                            >
                              ₹{val / 1000}K
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Automated Real-Time Math Logic Display */}
                      <div className="p-3.5 rounded-xl bg-forest-50/70 border border-forest-100 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-forest-800 font-extrabold text-xs">
                          <Calculator className="w-3.5 h-3.5 text-forest-700" />
                          <span>Automated Chit Fund Math Logic</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white p-2 rounded-lg border border-forest-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Tasiru (தள்ளுபடி)
                            </span>
                            <span className="font-extrabold text-amber-700 text-sm">
                              {formatINR(liveTasiru)}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              ({formatINR(pot)} - {formatINR(liveWinnerPayout)})
                            </span>
                          </div>

                          <div className="bg-white p-2 rounded-lg border border-forest-100">
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">
                              Per Member Due
                            </span>
                            <span className="font-black text-forest-900 text-sm">
                              {formatINR(livePerMemberDue)}
                            </span>
                            <span className="text-[9px] text-forest-600 font-semibold block">
                              ({formatINR(liveWinnerPayout)} ÷ 20 Members)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1 pt-1 border-t border-forest-100/60">
                          <span>Dividend Savings per Member:</span>
                          <span className="text-emerald-700 font-extrabold">
                            +{formatINR(liveDividendPerMember)}
                          </span>
                        </div>
                      </div>

                      {/* 4. Save Button */}
                      <button
                        onClick={() => handleSaveBidding(scheme)}
                        disabled={currentInputs.isSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>
                          {currentInputs.isSubmitting
                            ? 'Saving Bidding...'
                            : `Finalize Month ${selectedMonth} Bidding`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* ------------------------------------------------------------ */
                    /* Case B: Bidding IS Recorded & Finalized */
                    /* ------------------------------------------------------------ */
                    <div className="space-y-4">
                      {/* Prized Winner Card */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                              Prized Bidding Winner
                            </span>
                            <strong className="text-sm font-extrabold text-slate-900 block">
                              {scheme.auction?.winning_member_name}
                            </strong>
                            <span className="text-[11px] text-slate-500">
                              Ticket #{scheme.auction?.share_ticket_number} &bull; {scheme.auction?.winning_member_phone}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setDeleteConfirmScheme(scheme)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete / Reset Bidding"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 4 Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Winner Payout
                          </span>
                          <strong className="text-forest-800 font-extrabold text-sm block">
                            {formatINR(Number(scheme.auction?.payout_amount))}
                          </strong>
                          <span className="text-[9px] text-slate-400">Prize Disbursed</span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Tasiru (தள்ளுபடி)
                          </span>
                          <strong className="text-amber-700 font-extrabold text-sm block">
                            {formatINR(Number(scheme.auction?.bid_discount_amount))}
                          </strong>
                          <span className="text-[9px] text-slate-400">Total Discount</span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Monthly Due / Person
                          </span>
                          <strong className="text-slate-900 font-extrabold text-sm block">
                            {formatINR(Number(scheme.auction?.net_installment_due))}
                          </strong>
                          <span className="text-[9px] text-forest-700 font-semibold">
                            (Winning ÷ 20 Members)
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">
                            Dividend Savings
                          </span>
                          <strong className="text-emerald-700 font-extrabold text-sm block">
                            +{formatINR(Number(scheme.auction?.dividend_per_share))}
                          </strong>
                          <span className="text-[9px] text-emerald-600 font-semibold">
                            (Tasiru ÷ 20 Members)
                          </span>
                        </div>
                      </div>

                      {/* Action 1: Winner ONLY Notification */}
                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => setWinnerModalScheme(scheme)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Winner SMS (Winner Only)</span>
                        </button>

                        {/* Action 2: Members Dues Notification */}
                        <button
                          onClick={() => setMembersModalScheme(scheme)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            Notify 20 Members ({formatINR(Number(scheme.auction?.net_installment_due))} Due)
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Enrolled Subscriber Count & Actions */}
                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{scheme.subscribers.length} / {totalMembers} Members Enrolled</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMoveConfirmGroup(scheme.group)}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      title="Move this entire scheme as completed to historical archives"
                    >
                      <Archive className="w-3 h-3 text-emerald-700" />
                      <span>Move as Completed</span>
                    </button>

                    {isFinalized && (
                      <button
                        onClick={() => setDeleteConfirmScheme(scheme)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                        title="Delete Month Bidding"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Bidding</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 1: Bidding Winner ONLY Notification Modal */}
      {/* ------------------------------------------------------------ */}
      {winnerModalScheme && winnerModalScheme.auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700">
                  Strictly Winner-Only Dispatch
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Bidding Winner Notification &bull; {winnerModalScheme.group.name}
                </h3>
              </div>
              <button
                onClick={() => setWinnerModalScheme(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Details */}
            <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-forest-700 font-bold block uppercase">
                  Prized Winning Bidder
                </span>
                <strong className="text-sm font-extrabold text-forest-950">
                  {winnerModalScheme.auction.winning_member_name}
                </strong>
                <span className="text-xs text-forest-800 block">
                  Ph: {winnerModalScheme.auction.winning_member_phone}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-forest-700 font-bold block uppercase">
                  Winning Payout
                </span>
                <strong className="text-base font-black text-forest-900">
                  {formatINR(winnerModalScheme.auction.payout_amount)}
                </strong>
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Message Text (Bilingual Tamil &amp; English):</span>
                <button
                  onClick={() =>
                    handleCopy(
                      getBiddingWinnerText({
                        winnerName: winnerModalScheme.auction!.winning_member_name,
                        groupName: winnerModalScheme.group.name,
                        monthNumber: selectedMonth,
                        payoutAmount: winnerModalScheme.auction!.payout_amount,
                        tasiruAmount: winnerModalScheme.auction!.bid_discount_amount,
                      }),
                      'winner-text'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-forest-700 hover:text-forest-900 font-bold cursor-pointer"
                >
                  {copiedText === 'winner-text' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed">
                {getBiddingWinnerText({
                  winnerName: winnerModalScheme.auction.winning_member_name,
                  groupName: winnerModalScheme.group.name,
                  monthNumber: selectedMonth,
                  payoutAmount: winnerModalScheme.auction.payout_amount,
                  tasiruAmount: winnerModalScheme.auction.bid_discount_amount,
                })}
              </pre>
            </div>

            {/* 1-Tap Trigger Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={createBiddingWinnerSmsUrl({
                  phone: winnerModalScheme.auction.winning_member_phone,
                  winnerName: winnerModalScheme.auction.winning_member_name,
                  groupName: winnerModalScheme.group.name,
                  monthNumber: selectedMonth,
                  payoutAmount: winnerModalScheme.auction.payout_amount,
                  tasiruAmount: winnerModalScheme.auction.bid_discount_amount,
                })}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-md transition-all text-center cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send Native SMS</span>
              </a>

              <a
                href={createBiddingWinnerWhatsAppUrl({
                  phone:
                    winnerModalScheme.auction.winning_member_whatsapp ||
                    winnerModalScheme.auction.winning_member_phone,
                  winnerName: winnerModalScheme.auction.winning_member_name,
                  groupName: winnerModalScheme.group.name,
                  monthNumber: selectedMonth,
                  payoutAmount: winnerModalScheme.auction.payout_amount,
                  tasiruAmount: winnerModalScheme.auction.bid_discount_amount,
                })}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all text-center cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Send WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 2: Members Monthly Dues Notification Modal */}
      {/* ------------------------------------------------------------ */}
      {membersModalScheme && membersModalScheme.auction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700">
                  Scheme Members Notification Roster
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Notify Members &bull; {membersModalScheme.group.name} (Month {selectedMonth})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated Due: <strong>{formatINR(membersModalScheme.auction.net_installment_due)}</strong> per member
                  (₹{membersModalScheme.auction.payout_amount.toLocaleString('en-IN')} ÷ 20 Members)
                </p>
              </div>
              <button
                onClick={() => setMembersModalScheme(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Copy Bar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Default Bilingual Message Template
              </span>
              <button
                onClick={() =>
                  handleCopy(
                    getMonthlyBiddingDueText({
                      memberName: '[Member Name]',
                      groupName: membersModalScheme.group.name,
                      monthNumber: selectedMonth,
                      winnerPayoutAmount: membersModalScheme.auction!.payout_amount,
                      installmentDue: membersModalScheme.auction!.net_installment_due,
                      dividendSavings: membersModalScheme.auction!.dividend_per_share,
                    }),
                    'roster-copy'
                  )
                }
                className="flex items-center gap-1 font-bold text-forest-700 hover:text-forest-900 cursor-pointer"
              >
                {copiedText === 'roster-copy' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text Template</span>
                  </>
                )}
              </button>
            </div>

            {/* Members Roster List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {membersModalScheme.subscribers.map((sub) => {
                const dueAmount = membersModalScheme.auction!.net_installment_due;
                const savings = membersModalScheme.auction!.dividend_per_share;

                const smsUrl = createMonthlyBiddingDueSmsUrl({
                  phone: sub.member_phone,
                  memberName: sub.member_name,
                  groupName: membersModalScheme.group.name,
                  monthNumber: selectedMonth,
                  winnerPayoutAmount: membersModalScheme.auction!.payout_amount,
                  installmentDue: dueAmount,
                  dividendSavings: savings,
                });

                const waUrl = createMonthlyBiddingDueWhatsAppUrl({
                  phone: sub.whatsapp_phone || sub.member_phone,
                  memberName: sub.member_name,
                  groupName: membersModalScheme.group.name,
                  monthNumber: selectedMonth,
                  winnerPayoutAmount: membersModalScheme.auction!.payout_amount,
                  installmentDue: dueAmount,
                  dividendSavings: savings,
                });

                return (
                  <div
                    key={sub.share_id}
                    className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-forest-300 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        #{sub.share_ticket_number}
                      </span>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 block">
                          {sub.member_name}
                        </strong>
                        <span className="text-[11px] text-slate-500">{sub.member_phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-forest-900 mr-2">
                        {formatINR(dueAmount)}
                      </span>

                      <a
                        href={smsUrl}
                        className="py-1.5 px-2.5 rounded-lg bg-forest-50 hover:bg-forest-700 text-forest-800 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        title="Send SMS"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>SMS</span>
                      </a>

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        title="Send WhatsApp"
                      >
                        <Phone className="w-3 h-3" />
                        <span>WA</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setMembersModalScheme(null)}
                className="py-2 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 3: Delete Bidding Confirmation Modal */}
      {/* ------------------------------------------------------------ */}
      {deleteConfirmScheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Delete Month {selectedMonth} Bidding?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete the Month {selectedMonth} bidding record for{' '}
              <strong>{deleteConfirmScheme.group.name}</strong>?
            </p>

            <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-[11px] text-rose-900 space-y-1">
              <p className="font-bold">• Winning payout record will be deleted.</p>
              <p className="font-bold">• Member monthly dues will reset to base {formatINR(Number(deleteConfirmScheme.group.installment_base_amount))}.</p>
              <p className="font-bold">• Winning share prized status will be reset.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmScheme(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Bidding'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ */}
      {/* MODAL 4: Move Entire Scheme as Completed Modal */}
      {/* ------------------------------------------------------------ */}
      {moveConfirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                <Archive className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Move Scheme as Completed?
                </h3>
                <p className="text-[11px] text-slate-500">
                  Archive scheme to historical records
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to move <strong>{moveConfirmGroup.name}</strong> (
              {formatINR(Number(moveConfirmGroup.total_pot_value))}) as completed?
            </p>

            <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl text-[11px] text-emerald-950 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Stores in database: <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-mono font-bold">moved_as_completed = true</code>
                </span>
              </p>
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Safely transitions scheme into <strong>Past Groups</strong> section.</span>
              </p>
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Historical records, bidding history, and PDF / Excel reports remain accessible.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMoveConfirmGroup(null)}
                disabled={isMovingCompleted}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleMoveCompleted}
                disabled={isMovingCompleted}
                className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isMovingCompleted ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Moving...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Yes, Move as Completed</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

