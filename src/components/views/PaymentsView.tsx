import React, { useState } from 'react';
import { CreditCard, Search, MessageSquare, Clock, CheckCircle } from 'lucide-react';
import { Installment } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';
import { createPaymentClearedSmsUrl, createOverdueReminderSmsUrl } from '@/lib/sms';

interface PaymentsViewProps {
  installments: Installment[];
  onRecordPayment: (inst?: Installment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  installments,
  onRecordPayment,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'PAID'>('PENDING');
  const [search, setSearch] = useState('');

  const filtered = installments.filter((i) => {
    if (filter === 'PENDING' && i.status === 'PAID') return false;
    if (filter === 'PARTIAL' && i.status !== 'PARTIAL') return false;
    if (filter === 'PAID' && i.status !== 'PAID') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (i.member_name && i.member_name.toLowerCase().includes(q)) ||
        (i.group_name && i.group_name.toLowerCase().includes(q)) ||
        (i.member_phone && i.member_phone.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Monthly Installment Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rule 1: Paid only upon full balance clearance. Track pending dues and send reminders.
          </p>
        </div>

        <button
          onClick={() => onRecordPayment()}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-white/90 p-1 rounded-2xl border border-slate-200 shadow-xs">
          {[
            { id: 'PENDING', label: 'Action Required (Pending/Partial)' },
            { id: 'PARTIAL', label: 'Partial Only' },
            { id: 'PAID', label: 'Paid' },
            { id: 'ALL', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-forest-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member or group..."
            className="w-full pl-9 pr-4 py-2 bg-white/90 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-700"
          />
        </div>
      </div>

      {/* Installments List */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No installments found for this filter</p>
          </div>
        ) : (
          filtered.map((inst) => {
            const due = Number(inst.net_due_amount);
            const paid = Number(inst.paid_amount);
            const remaining = due - paid;
            const isPaid = inst.status === 'PAID';
            const isPartial = inst.status === 'PARTIAL';

            return (
              <div
                key={inst.id}
                className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">
                    #{inst.share_ticket_number || 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {inst.member_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {isPaid ? 'Fully Paid' : isPartial ? 'Partially Paid' : 'Pending'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {inst.group_name} &bull; Month {inst.month_number}
                    </p>

                    <div className="flex items-center gap-3 text-xs mt-1.5 font-medium">
                      <span className="text-slate-500">
                        Net Due: <strong className="text-slate-800">{formatINR(due)}</strong>
                      </span>
                      <span className="text-emerald-700">
                        Paid: <strong>{formatINR(paid)}</strong>
                      </span>
                      {!isPaid && (
                        <span className="text-amber-700 font-bold">
                          Pending: {formatINR(remaining)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {isPaid && inst.member_phone && (
                    <a
                      href={createPaymentClearedSmsUrl({
                        phone: inst.member_phone,
                        memberName: inst.member_name || 'Member',
                        groupName: inst.group_name || 'Chit Group',
                        monthNumber: inst.month_number,
                      })}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors"
                      title="Send Payment Cleared SMS via mobile Messages app"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                      <span>SMS Receipt</span>
                    </a>
                  )}

                  {!isPaid && (
                    <div className="flex items-center gap-2">
                      {inst.member_phone && (
                        <a
                          href={createOverdueReminderSmsUrl({
                            phone: inst.member_phone,
                            memberName: inst.member_name || 'Member',
                            groupName: inst.group_name || 'Chit Group',
                            pendingAmount: remaining,
                            unpaidCount: 1,
                            monthNumber: inst.month_number,
                          })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
                          title="Send Overdue Reminder SMS to member"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                          <span>SMS Due</span>
                        </a>
                      )}

                      <button
                        onClick={() => onRecordPayment(inst)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <span>Collect</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

