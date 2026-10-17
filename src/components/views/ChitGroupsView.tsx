import React from 'react';
import { FolderPlus, Layers, Calendar, IndianRupee } from 'lucide-react';
import { ChitGroup } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface ChitGroupsViewProps {
  groups: ChitGroup[];
  onNewGroup: () => void;
}

export const ChitGroupsView: React.FC<ChitGroupsViewProps> = ({
  groups,
  onNewGroup,
}) => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Chit Schemes & Groups
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure total pot values, duration, and manage member tickets
          </p>
        </div>

        <button
          onClick={onNewGroup}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Chit Group</span>
        </button>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {groups.map((group) => {
          const pot = Number(group.total_pot_value);
          const months = Number(group.total_months);
          const base = Number(group.installment_base_amount);
          const enrolled = Number(group.enrolled_shares || 0);

          return (
            <div
              key={group.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-forest-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Starts: {new Date(group.start_date).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {group.status}
                  </span>
                </div>

                <div className="my-3 p-3 rounded-xl bg-forest-50/60 border border-forest-100">
                  <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                    Total Pot Value
                  </span>
                  <span className="text-xl font-extrabold text-forest-900">
                    {formatINR(pot)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                    <strong className="text-slate-800">{months} Months</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base Monthly</span>
                    <strong className="text-slate-800">{formatINR(base)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Commission</span>
                    <strong className="text-slate-800">{group.commission_percent || 5}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Shares Assigned</span>
                    <strong className="text-slate-800">{enrolled} / {group.total_shares}</strong>
                  </div>
                </div>
              </div>

              {group.notes && (
                <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-100">
                  &ldquo;{group.notes}&rdquo;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

