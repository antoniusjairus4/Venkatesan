import React from 'react';
import { Phone, CheckCircle, Clock } from 'lucide-react';
import { Installment } from '@/lib/api';
import { formatINR } from '@/lib/sms';

interface PendingCollectionsListProps {
  installments: Installment[];
  onCollect: (installment: Installment) => void;
  onViewAll?: () => void;
}

export const PendingCollectionsList: React.FC<PendingCollectionsListProps> = ({
  installments,
  onCollect,
  onViewAll,
}) => {
  const pendingItems = installments.filter((i) => i.status !== 'PAID');

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Pending Installments (Action Required)
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">
              {pendingItems.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Rule 1: Remains pending until full installment amount is collected.
          </p>
        </div>

        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-forest-700 hover:text-forest-800 cursor-pointer"
          >
            View All &rarr;
          </button>
        )}
      </div>

      {/* List */}
      {pendingItems.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-semibold text-slate-700">All Installments Settled!</p>
          <p className="text-xs text-slate-400 mt-0.5">
            No pending balances or partial payments at this moment.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingItems.slice(0, 5).map((inst) => {
            const due = Number(inst.net_due_amount);
            const paid = Number(inst.paid_amount);
            const remaining = due - paid;
            const isPartial = inst.status === 'PARTIAL';

            return (
              <div
                key={inst.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Member & Chit Information */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    #{inst.share_ticket_number || '1'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {inst.member_name || 'Unknown Member'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                          isPartial
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {isPartial ? 'Partially Paid' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {inst.group_name} &bull; Month {inst.month_number}
                    </p>

                    {/* Dues breakdown */}
                    <div className="flex items-center gap-2.5 text-xs mt-1.5 font-medium">
                      <span className="text-slate-500">
                        Due: <strong className="text-slate-800">{formatINR(due)}</strong>
                      </span>
                      {paid > 0 && (
                        <span className="text-emerald-600">
                          Paid: <strong>{formatINR(paid)}</strong>
                        </span>
                      )}
                      <span className="text-amber-700 font-bold">
                        Remaining: {formatINR(remaining)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons: Call & Collect */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {inst.member_phone && (
                    <a
                      href={`tel:${inst.member_phone}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                      title="Call member directly"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>Call</span>
                    </a>
                  )}

                  {/* Collect Payment Button */}
                  <button
                    onClick={() => onCollect(inst)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Collect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

