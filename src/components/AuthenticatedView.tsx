import React from 'react';
import { LogOut, ShieldCheck, CheckCircle2, Coins, ArrowLeftRight, Hammer, Award } from 'lucide-react';
import { clearSession } from '@/lib/auth';

interface AuthenticatedViewProps {
  onLogout: () => void;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({ onLogout }) => {
  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  const businessRules = [
    {
      title: 'Rule 1: Full Installment Settlement',
      desc: 'Monthly payments are marked as "PAID" strictly when the full balance is cleared. Partial dues remain pending.',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Rule 2: Multiple Shares at Inception',
      desc: 'Members can join with 1, 2, or 5 shares when the group starts. Additional shares cannot be added mid-term.',
      icon: Coins,
      color: 'text-forest-700 bg-forest-50 border-forest-200',
    },
    {
      title: 'Rule 3: One-Time Takeover Settlement',
      desc: 'Chit turn transfers between members are settled through a single lump-sum payment.',
      icon: ArrowLeftRight,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      title: 'Rule 4: Monthly Auction ("Yelam") & Dividends',
      desc: 'Auction discounts are determined monthly. The net dividend is distributed equally to reduce all members\' dues.',
      icon: Hammer,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Rule 5: Final Month Payout Cap',
      desc: 'The final month payout is determined by the final auction/nomination (e.g. ₹95,000 for a ₹1,00,000 chit).',
      icon: Award,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
  ];

  return (
    <div className="min-h-screen app-bg-mobile sm:app-bg-desktop flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo-transparent.png"
            alt="Rajamanickam Chit Fund"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-xs font-semibold text-forest-800">
            <span className="w-2 h-2 rounded-full bg-forest-600 animate-pulse" />
            <span>Venkatesan (Admin)</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Status Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest-700 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome, <span className="text-forest-700">Venkatesan</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Admin session verified and authenticated. Ready for chit fund management.
              </p>
            </div>
          </div>
        </div>

        {/* 5 Business Rules Grid */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Chit Fund Master Rules Configured
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These 5 rules govern all calculations, member share limits, auctions, and payments.
            </p>
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
