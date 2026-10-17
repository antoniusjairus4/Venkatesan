import React from 'react';
import { PlusCircle, UserPlus, FolderPlus } from 'lucide-react';

interface QuickActionsProps {
  onOpenRecordPayment: () => void;
  onOpenNewMember: () => void;
  onOpenNewGroup: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenRecordPayment,
  onOpenNewMember,
  onOpenNewGroup,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Quick Actions
        </h2>
        <span className="text-[10px] text-slate-400">Mobile Fast-Tap</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Record Payment */}
        <button
          onClick={onOpenRecordPayment}
          className="flex flex-col items-start p-3 sm:p-4 rounded-2xl bg-forest-700 hover:bg-forest-800 active:scale-98 text-white shadow-sm shadow-forest-700/20 transition-all cursor-pointer text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-2">
            <PlusCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold leading-tight">
            Record Payment
          </span>
          <span className="text-[10px] text-white/80 mt-0.5">
            Cash / UPI / Bank
          </span>
        </button>

        {/* Add Member */}
        <button
          onClick={onOpenNewMember}
          className="flex flex-col items-start p-3 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 text-slate-900 shadow-xs transition-all cursor-pointer text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center mb-2">
            <UserPlus className="w-5 h-5 text-blue-700" />
          </div>
          <span className="text-xs sm:text-sm font-bold leading-tight">
            New Member
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Register Subscriber
          </span>
        </button>

        {/* Create Chit Group */}
        <button
          onClick={onOpenNewGroup}
          className="flex flex-col items-start p-3 sm:p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 text-slate-900 shadow-xs transition-all cursor-pointer text-left group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-2">
            <FolderPlus className="w-5 h-5 text-emerald-700" />
          </div>
          <span className="text-xs sm:text-sm font-bold leading-tight">
            New Chit Group
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Configure Scheme
          </span>
        </button>
      </div>
    </div>
  );
};
