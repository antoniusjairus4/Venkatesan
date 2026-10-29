import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Users,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Archive,
  BarChart3,
  Layers,
  Sparkles,
  Search,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  PastChitGroupSummary,
  PastChitSnapshot,
  fetchPastChitGroups,
  fetchPastChitSnapshot,
  restoreChitGroupActive,
} from '@/lib/api';
import { formatINR } from '@/lib/sms';
import {
  exportPastChitPdf,
  exportPastChitExcel,
  exportPastChitAll,
} from '@/lib/exportReports';

const SCHEME_OPTIONS = [
  { value: 100000, label: '₹1,00,000 (1 Lakh)', shortLabel: '1 Lakh' },
  { value: 200000, label: '₹2,00,000 (2 Lakhs)', shortLabel: '2 Lakhs' },
  { value: 300000, label: '₹3,00,000 (3 Lakhs)', shortLabel: '3 Lakhs' },
];

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface PastChitGroupsViewProps {
  onSchemeRestored?: () => void;
}

export const PastChitGroupsView: React.FC<PastChitGroupsViewProps> = ({ onSchemeRestored }) => {
  const [pastGroups, setPastGroups] = useState<PastChitGroupSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(true);
  const [selectedPotValue, setSelectedPotValue] = useState<number>(100000);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PastChitSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | 'all' | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restoreConfirm, setRestoreConfirm] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await fetchPastChitGroups();
      setPastGroups(data);
      // Auto-select first matching group for default pot value (100000)
      const matching = data.filter((g) => Number(g.total_pot_value) === selectedPotValue);
      if (matching.length > 0 && !selectedGroupId) {
        setSelectedGroupId(matching[0].id);
      }
    } catch (err) {
      console.error('Failed to load past chit groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Load all past completed groups once
  useEffect(() => {
    loadGroups();
  }, []);

  const handleRestore = async () => {
    if (!snapshot) return;
    try {
      setIsRestoring(true);
      await restoreChitGroupActive(snapshot.group.id);
      setRestoreConfirm(false);
      setSelectedGroupId(null);
      setSnapshot(null);
      await loadGroups();
      if (onSchemeRestored) onSchemeRestored();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to restore scheme.');
    } finally {
      setIsRestoring(false);
    }
  };

  // Filter groups by search query
  const filteredPastGroups = useMemo(() => {
    if (!searchQuery.trim()) return pastGroups;
    const q = searchQuery.toLowerCase();
    return pastGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.notes && g.notes.toLowerCase().includes(q)) ||
        g.total_pot_value.toString().includes(q) ||
        (g.start_date && g.start_date.includes(q)) ||
        (g.end_date && g.end_date.includes(q))
    );
  }, [pastGroups, searchQuery]);

  // Filter periods for the currently selected chit scheme type
  const periodsForScheme = useMemo(() => {
    return filteredPastGroups.filter((g) => Number(g.total_pot_value) === selectedPotValue);
  }, [filteredPastGroups, selectedPotValue]);

  // When chit scheme changes, auto-select its first completed period
  const handleSelectScheme = (pot: number) => {
    setSelectedPotValue(pot);
    const matching = filteredPastGroups.filter((g) => Number(g.total_pot_value) === pot);
    if (matching.length > 0) {
      setSelectedGroupId(matching[0].id);
    } else {
      setSelectedGroupId(null);
      setSnapshot(null);
    }
  };

  // Load snapshot when a completed period is selected
  useEffect(() => {
    if (!selectedGroupId) {
      setSnapshot(null);
      return;
    }

    let isMounted = true;
    setLoadingSnapshot(true);

    fetchPastChitSnapshot(selectedGroupId)
      .then((data) => {
        if (!isMounted) return;
        setSnapshot(data);
        setLoadingSnapshot(false);
      })
      .catch((err) => {
        console.error('Failed to fetch snapshot:', err);
        if (isMounted) setLoadingSnapshot(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGroupId]);

  // Export handlers
  const handleExportPdf = () => {
    if (!snapshot) return;
    setExportingType('pdf');
    try {
      exportPastChitPdf(snapshot);
    } finally {
      setTimeout(() => setExportingType(null), 1000);
    }
  };

  const handleExportExcel = () => {
    if (!snapshot) return;
    setExportingType('excel');
    try {
      exportPastChitExcel(snapshot);
    } finally {
      setTimeout(() => setExportingType(null), 1000);
    }
  };

  const handleExportAll = () => {
    if (!snapshot) return;
    setExportingType('all');
    try {
      exportPastChitAll(snapshot);
    } finally {
      setTimeout(() => setExportingType(null), 1500);
    }
  };

  // Chart Tooltip
  const CustomTimelineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">
            Month {data.month_number} Collections
          </p>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Total Collected:</span>
            <span className="font-bold text-emerald-400">
              {formatINR(Number(data.collected_amount))}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Target Expected:</span>
            <span className="font-bold text-slate-300">
              {formatINR(Number(data.expected_amount))}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Delays / Late:</span>
            <span className={data.late_count > 0 ? 'font-bold text-amber-400' : 'text-slate-400'}>
              {data.late_count > 0 ? `${data.late_count} delayed` : '0 (On time)'}
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
            <span>Status:</span>
            <span className="text-emerald-400 font-bold">100% Cleared</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* --------------------------------------------------------------------- */}
      {/* 1. Step 1: Scheme Selector & Period Tabs */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Search for Old Chits and Schemes */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search old chits and schemes by name, notes, pot value (e.g. 1 Lakh), or period date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Scheme Type Selector */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-forest-700" />
            <span>Select Chit Type / Scheme Value</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SCHEME_OPTIONS.map((opt) => {
              const isSelected = selectedPotValue === opt.value;
              const count = filteredPastGroups.filter((g) => Number(g.total_pot_value) === opt.value).length;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectScheme(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-forest-900 text-white border-forest-900 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200/80'
                  }`}
                >
                  <div>
                    <span
                      className={`text-xs font-extrabold block ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span
                      className={`text-[11px] block mt-0.5 ${
                        isSelected ? 'text-forest-200' : 'text-slate-500'
                      }`}
                    >
                      20 Months Duration
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-forest-800 text-forest-100'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count} {count === 1 ? 'Period' : 'Periods'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Completed Time Periods for Selected Scheme */}
        <div className="pt-3 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-forest-700" />
            <span>Completed Time Periods (Start Date → End Date)</span>
          </label>

          {loadingGroups ? (
            <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ) : periodsForScheme.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
              No completed cycles found for this chit scheme value.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {periodsForScheme.map((period) => {
                const isSelected = selectedGroupId === period.id;
                const startStr = formatDate(period.start_date);
                const endStr = formatDate(period.end_date);

                return (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSelectedGroupId(period.id)}
                    className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-forest-700 text-white border-forest-700 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-forest-200' : 'text-slate-400'}`} />
                    <span>
                      {period.name ? `${period.name}: ` : ''}{startStr} &rarr; {endStr}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? 'bg-forest-800 text-forest-100'
                          : period.moved_as_completed
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {period.moved_as_completed ? 'Moved as Completed ✓' : 'Completed'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. Step 3: Historical Snapshot Summary & Timeline Graph */}
      {/* --------------------------------------------------------------------- */}
      {loadingSnapshot ? (
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-forest-700/20 border-t-forest-700 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading historical archive snapshot...</p>
        </div>
      ) : !snapshot ? (
        <div className="bg-white/95 backdrop-blur-md p-8 rounded-2xl border border-slate-200/80 shadow-xs text-center text-slate-400 text-xs">
          Select a completed time period above to view its historical snapshot.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Period Header & Export Action Bar */}
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
                  ARCHIVED • READ-ONLY
                </span>
                {snapshot.group.moved_as_completed && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Moved as Completed</span>
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                  100% RECOVERED
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5">
                {snapshot.group.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-forest-700" />
                <span>
                  Active Cycle: {formatDate(snapshot.metrics.start_date)} &rarr;{' '}
                  {formatDate(snapshot.metrics.end_date)}
                </span>
                <span className="text-slate-300">•</span>
                <span>20 Months • Closed by K. Venkatesan</span>
              </p>
            </div>

            {/* Export & Actions Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Restore Scheme to Active Button */}
              <button
                type="button"
                onClick={() => setRestoreConfirm(true)}
                className="flex items-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                title="Restore this scheme back to active chits"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore to Active</span>
              </button>

              {/* Export PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportingType !== null}
                className="flex items-center gap-1.5 py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Download official PDF closure report"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span>{exportingType === 'pdf' ? 'Generating PDF...' : 'Export PDF'}</span>
              </button>

              {/* Export Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={exportingType !== null}
                className="flex items-center gap-1.5 py-2.5 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Download 6-sheet Excel workbook"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{exportingType === 'excel' ? 'Building Excel...' : 'Export Excel (.xlsx)'}</span>
              </button>

              {/* Export All */}
              <button
                type="button"
                onClick={handleExportAll}
                disabled={exportingType !== null}
                className="flex items-center gap-1.5 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                title="Download both PDF closure report and Excel spreadsheet"
              >
                <Download className="w-4 h-4" />
                <span>{exportingType === 'all' ? 'Downloading All...' : 'Export All'}</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Simple UI Summary: 6 Core Metrics */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Metric 1: Start / End Date */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-forest-700" />
                Start / End Date
              </span>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">
                {formatDate(snapshot.metrics.start_date)}
              </p>
              <p className="text-[11px] font-bold text-slate-600 leading-tight">
                &rarr; {formatDate(snapshot.metrics.end_date)}
              </p>
              <span className="text-[10px] text-slate-400 block pt-0.5">20-Month Cycle</span>
            </div>

            {/* Metric 2: Member Count */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Users className="w-3 h-3 text-forest-700" />
                Member Count
              </span>
              <p className="text-lg font-extrabold text-slate-900">
                {snapshot.metrics.member_count} Members
              </p>
              <span className="text-[10px] text-slate-500 block">20 of 20 Shares Enrolled</span>
            </div>

            {/* Metric 3: Total Collected */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-emerald-700" />
                Total Collected
              </span>
              <p className="text-lg font-extrabold text-emerald-700">
                {formatINR(Number(snapshot.metrics.total_collected))}
              </p>
              <span className="text-[10px] font-semibold text-emerald-600 block">100.0% Settled</span>
            </div>

            {/* Metric 4: Total Instalments */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-forest-700" />
                Total Instalments
              </span>
              <p className="text-lg font-extrabold text-slate-900">
                {snapshot.metrics.total_installments}
              </p>
              <span className="text-[10px] text-slate-500 block">All 400 Paid in Full</span>
            </div>

            {/* Metric 5: Late Payments */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Late Payments
              </span>
              <p className="text-lg font-extrabold text-amber-700">
                {snapshot.metrics.late_payments_count}
              </p>
              <span className="text-[10px] text-slate-500 block">Cleared After Follow-up</span>
            </div>

            {/* Metric 6: Completion Status */}
            <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Archive className="w-3 h-3 text-forest-700" />
                Status
              </span>
              <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                COMPLETED
              </span>
              <span className="text-[10px] text-slate-400 block pt-0.5">Archived &amp; Cleared</span>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Simple Collection / Payment Timeline Graph (Recharts) */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-forest-700" />
                  <span>Collection &amp; Payment Timeline (Month 1 to 20)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Monthly installment collections across the entire 20-month cycle
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-forest-700" />
                  <span className="text-slate-600 text-[11px]">Monthly Inflow</span>
                </div>
                <span className="text-emerald-700 font-extrabold text-[11px]">
                  100% Recovery Every Month
                </span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={snapshot.timeline}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month_number"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(val) => `M${val}`}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTimelineTooltip />} />
                  <Bar
                    dataKey="collected_amount"
                    fill="#134e4a"
                    radius={[6, 6, 0, 0]}
                    name="Collected Amount"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clean Archive Footnote - Avoids UI clutter with 400 rows */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  All 400 installments and 20 subscribers are fully verified and cleared in the database.
                </span>
              </div>
              <span className="text-[11px] text-slate-400 italic">
                Full 400-row records exported in PDF &amp; Excel sheets
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Restore Scheme to Active Confirmation Modal */}
      {restoreConfirm && snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-forest-800">
              <div className="p-2.5 rounded-2xl bg-forest-50 border border-forest-100">
                <RotateCcw className="w-6 h-6 text-forest-800" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Restore Scheme to Active?
                </h3>
                <p className="text-[11px] text-slate-500">
                  Reopen this scheme into active groups
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore <strong>{snapshot.group.name}</strong> ({formatINR(Number(snapshot.group.total_pot_value))}) back to Active Chit Schemes?
            </p>

            <div className="p-3.5 bg-forest-50/80 border border-forest-100 rounded-2xl text-[11px] text-forest-950 space-y-2">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
                <span>Resets <code className="bg-forest-100 text-forest-800 px-1 py-0.5 rounded font-mono font-bold">moved_as_completed = false</code> and status to ACTIVE.</span>
              </p>
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
                <span>Scheme will reappear immediately on Active Chit Groups and Monthly Bidding.</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirm(false)}
                disabled={isRestoring}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="py-2.5 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isRestoring ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yes, Restore to Active</span>
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

