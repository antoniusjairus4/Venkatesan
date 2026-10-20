import React from 'react';
import { Layers, Calendar, ChevronRight, CheckCircle2 } from 'lucide-react';
import { ChitGroup } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface ActiveChitsOverviewProps {
  groups: ChitGroup[];
  onSelectGroup?: (group: ChitGroup) => void;
  onNewGroup: () => void;
}

export const ActiveChitsOverview: React.FC<ActiveChitsOverviewProps> = ({
  groups,
  onSelectGroup,
  onNewGroup,
}) => {
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Chit Schemes Overview
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Active and upcoming chit funds under management
          </p>
        </div>

        <button
          onClick={onNewGroup}
          className="text-xs font-semibold text-forest-700 hover:text-forest-800 cursor-pointer flex items-center gap-1"
        >
          <span>+ Add Scheme</span>
        </button>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {groups.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No Chit Groups Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;+ Add Scheme&quot; to configure your first chit.
            </p>
          </div>
        ) : (
          [...groups]
            .sort((a, b) => Number(a.total_pot_value) - Number(b.total_pot_value))
            .map((group) => {
            const pot = Number(group.total_pot_value);
            const months = Number(group.total_months);
            const baseAmount = Number(group.installment_base_amount);
            const enrolled = Number(group.enrolled_shares || 0);
            const progress = Math.min(100, Math.round((enrolled / group.total_shares) * 100));

            return (
              <div
                key={group.id}
                onClick={() => onSelectGroup && onSelectGroup(group)}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-forest-200 bg-slate-50/50 hover:bg-forest-50/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-forest-700 transition-colors">
                      {group.name}
                    </span>
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

                  <span className="text-sm font-extrabold text-forest-700">
                    {formatINR(pot)}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 my-2 pt-2 border-t border-slate-200/50">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">Duration</span>
                    <span className="font-semibold">{months} Months</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">Base / Mo</span>
                    <span className="font-semibold">{formatINR(baseAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-medium">Shares</span>
                    <span className="font-semibold">{enrolled} / {group.total_shares}</span>
                  </div>
                </div>

                {/* Enrollment Progress Bar */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>Member Allocation</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-forest-700 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

