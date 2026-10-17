import React from 'react';
import { IndianRupee, AlertCircle, Layers, Users } from 'lucide-react';
import { DashboardSummary } from '@/lib/api';

interface StatCardsProps {
  summary: DashboardSummary | null;
  onFilterPending?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary, onFilterPending }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Collections */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Collected
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <IndianRupee className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            ₹{summary ? summary.totalCollected.toLocaleString('en-IN') : '0'}
          </h3>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
            Confirmed external receipts
          </p>
        </div>
      </div>

      {/* Pending Dues (Clickable to jump to pending installments) */}
      <div
        onClick={onFilterPending}
        className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-amber-200/90 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 transition-all group"
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Pending Dues
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-amber-700 tracking-tight">
            ₹{summary ? summary.totalPendingDues.toLocaleString('en-IN') : '0'}
          </h3>
          <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
            <span>Tap to view & send reminders &rarr;</span>
          </p>
        </div>
      </div>

      {/* Active Chit Groups */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Active Groups
          </span>
          <div className="w-7 h-7 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {summary ? summary.activeChits : '0'}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {summary ? summary.totalGroups : '0'} total
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Running chit schemes
          </p>
        </div>
      </div>

      {/* Total Members */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Members Enrolled
          </span>
          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {summary ? summary.totalMembers : '0'}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Registered subscribers
          </p>
        </div>
      </div>
    </div>
  );
};

