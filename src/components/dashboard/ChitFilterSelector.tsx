import React from 'react';
import { Filter, Layers } from 'lucide-react';
import { ChitGroup } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface ChitFilterSelectorProps {
  groups: ChitGroup[];
  selectedGroupId: string; // 'ALL' or specific group id
  onSelectGroup: (groupId: string) => void;
}

export const ChitFilterSelector: React.FC<ChitFilterSelectorProps> = ({
  groups,
  selectedGroupId,
  onSelectGroup,
}) => {
  const currentGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Label & Active Description */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
          <Filter className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Filter Visualizations & Reports
          </span>
          <span className="text-xs sm:text-sm font-bold text-slate-900">
            {selectedGroupId === 'ALL'
              ? 'Consolidated — All Chit Schemes'
              : `${currentGroup?.name || 'Selected Scheme'} (${formatINR(Number(currentGroup?.total_pot_value || 0))})`}
          </span>
        </div>
      </div>

      {/* Select Dropdown */}
      <div className="relative min-w-[220px]">
        <select
          aria-label="Chit Scheme Filter"
          value={selectedGroupId}
          onChange={(e) => onSelectGroup(e.target.value)}
          className="w-full px-3.5 py-2 pr-8 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-forest-700 transition-colors cursor-pointer appearance-none"
        >
          <option value="ALL">All Chit Schemes (Combined)</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name} — {formatINR(Number(group.total_pot_value))}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
          ▼
        </div>
      </div>
    </div>
  );
};

