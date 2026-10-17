import React, { useState, useEffect } from 'react';
import {
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Coins,
  ArrowLeftRight,
  Hammer,
  Award,
  Database,
  Users,
  Layers,
  IndianRupee,
  RefreshCw,
} from 'lucide-react';
import { clearSession } from '@/lib/auth';
import { fetchDashboardSummary, fetchHealth, DashboardSummary } from '@/lib/api';

interface AuthenticatedViewProps {
  onLogout: () => void;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({ onLogout }) => {
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const health = await fetchHealth();
      if (health.status === 'ok') {
        setDbStatus('connected');
      }
      const data = await fetchDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch from Neon DB:', err);
      setDbStatus('error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  const businessRules = [
    {
      title: 'Rule 1: Full Installment Settlement',
      desc: 'Monthly payments are marked as "PAID" strictly when the full balance is cleared. Partial dues remain pending.',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50/90 border-emerald-200',
    },
    {
      title: 'Rule 2: Multiple Shares at Inception',
      desc: 'Members can join with 1, 2, or 5 shares when the group starts. Additional shares cannot be added mid-term.',
      icon: Coins,
      color: 'text-forest-700 bg-forest-50/90 border-forest-200',
    },
    {
      title: 'Rule 3: One-Time Takeover Settlement',
      desc: 'Chit turn transfers between members are settled through a single lump-sum payment.',
      icon: ArrowLeftRight,
      color: 'text-amber-700 bg-amber-50/90 border-amber-200',
    },
    {
      title: 'Rule 4: Monthly Auction ("Yelam") & Dividends',
      desc: 'Auction discounts are determined monthly. The net dividend is distributed equally to reduce all members\' dues.',
      icon: Hammer,
      color: 'text-blue-700 bg-blue-50/90 border-blue-200',
    },
    {
      title: 'Rule 5: Final Month Payout Cap',
      desc: 'The final month payout is determined by the final auction/nomination (e.g. ₹95,000 for a ₹1,00,000 chit).',
      icon: Award,
      color: 'text-purple-700 bg-purple-50/90 border-purple-200',
    },
  ];

  return (
    <div className="min-h-screen app-bg-mobile sm:app-bg-desktop flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo-transparent.png"
            alt="Rajamanickam Chit Fund"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Neon Database Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-forest-700" />
            <span>Neon PostgreSQL:</span>
            {dbStatus === 'connected' && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
            {dbStatus === 'checking' && <span className="text-slate-500">Connecting...</span>}
            {dbStatus === 'error' && <span className="text-red-600 font-semibold">Offline</span>}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-xs font-semibold text-forest-800">
            <span className="w-2 h-2 rounded-full bg-forest-600" />
            <span>Venkatesan (Admin)</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Status Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-forest-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome, <span className="text-forest-700">Venkatesan</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Production Database Online &bull; Direct Neon Cloud Connection (neondb)
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={refreshing}
              className="self-start sm:self-center flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sync Database</span>
            </button>
          </div>

          {/* Quick Metrics Bar from Neon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Layers className="w-4 h-4 text-forest-700" />
                <span>Chit Groups</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {summary ? summary.totalGroups : '0'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <Users className="w-4 h-4 text-forest-700" />
                <span>Total Members</span>
              </div>
              <p className="text-xl font-bold text-slate-900">
                {summary ? summary.totalMembers : '0'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span>Collections</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                ₹{summary ? summary.totalCollected.toLocaleString('en-IN') : '0'}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                <IndianRupee className="w-4 h-4 text-amber-600" />
                <span>Pending Dues</span>
              </div>
              <p className="text-xl font-bold text-amber-700">
                ₹{summary ? summary.totalPendingDues.toLocaleString('en-IN') : '0'}
              </p>
            </div>
          </div>
        </div>

        {/* 5 Business Rules Grid */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Chit Fund Master Rules Configured
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enforced directly in Neon database schema constraints and backend API rules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {businessRules.map((rule, idx) => {
              const Icon = rule.icon;
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border ${rule.color} transition-all`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <h3 className="font-bold text-xs sm:text-sm">{rule.title}</h3>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed pl-6.5">{rule.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
