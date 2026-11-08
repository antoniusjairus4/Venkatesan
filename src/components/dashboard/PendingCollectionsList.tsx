import React, { useState, useMemo } from 'react';
import { Phone, CheckCircle, Clock, MessageSquare, Users, Layers, Send } from 'lucide-react';
import { Installment } from '@/lib/api';
import {
  formatINR,
  createOverdueReminderSmsUrl,
  createMultiChitOverdueReminderSmsUrl,
} from '@/lib/sms';
import {
  createWhatsAppReminderUrl,
  createMultiChitOverdueReminderWhatsAppUrl,
} from '@/lib/whatsapp';

interface PendingCollectionsListProps {
  installments: Installment[];
  onCollect: (installment: Installment) => void;
  onViewAll?: () => void;
}

interface MemberPendingSummary {
  memberKey: string;
  memberId: string;
  memberName: string;
  phone: string;
  totalDue: number;
  totalPaid: number;
  totalPending: number;
  installments: Installment[];
}

export const PendingCollectionsList: React.FC<PendingCollectionsListProps> = ({
  installments,
  onCollect,
  onViewAll,
}) => {
  const [viewMode, setViewMode] = useState<'MEMBER' | 'SHARE'>('MEMBER');

  const pendingItems = useMemo(
    () => installments.filter((i) => i.status !== 'PAID'),
    [installments]
  );

  // Group pending installments by member phone (or member id)
  const { memberSummaries, memberPendingMap } = useMemo(() => {
    const map = new Map<string, Installment[]>();
    pendingItems.forEach((inst) => {
      const key = (inst.member_phone && inst.member_phone.trim()) || inst.member_id || inst.member_name || 'unknown';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(inst);
    });

    const summaries: MemberPendingSummary[] = [];
    map.forEach((items, key) => {
      const first = items[0];
      const totalDue = items.reduce((acc, it) => acc + Number(it.net_due_amount || 0), 0);
      const totalPaid = items.reduce((acc, it) => acc + Number(it.paid_amount || 0), 0);
      const totalPending = totalDue - totalPaid;

      summaries.push({
        memberKey: key,
        memberId: first.member_id || key,
        memberName: first.member_name || 'Member',
        phone: first.member_phone || '',
        totalDue,
        totalPaid,
        totalPending,
        installments: items,
      });
    });

    // Sort by highest pending amount
    summaries.sort((a, b) => b.totalPending - a.totalPending);

    return { memberSummaries: summaries, memberPendingMap: map };
  }, [pendingItems]);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Pending Installments (Action Required)
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">
              {viewMode === 'MEMBER' ? `${memberSummaries.length} Members` : `${pendingItems.length} Shares`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Rule 1: Remains pending until full installment amount is collected. Multi-chit members receive 1 consolidated notice.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('MEMBER')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'MEMBER'
                  ? 'bg-white text-forest-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Consolidate members enrolled in 2 or more chits into 1 message"
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Member (1 Msg)</span>
            </button>
            <button
              onClick={() => setViewMode('SHARE')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'SHARE'
                  ? 'bg-white text-forest-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="View each installment share individually"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Share</span>
            </button>
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-forest-700 hover:text-forest-800 cursor-pointer ml-1"
            >
              View All &rarr;
            </button>
          )}
        </div>
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
      ) : viewMode === 'MEMBER' ? (
        /* Member-Level Consolidated View (1 Message per Subscriber) */
        <div className="divide-y divide-slate-100">
          {memberSummaries.slice(0, 5).map((member) => {
            const isMultiChit = member.installments.length > 1;

            const smsUrl = isMultiChit
              ? createMultiChitOverdueReminderSmsUrl({
                  phone: member.phone,
                  memberName: member.memberName,
                  items: member.installments.map((inst) => ({
                    groupName: inst.group_name || 'Chit Scheme',
                    ticketNumber: inst.share_ticket_number,
                    monthNumber: inst.month_number,
                    pendingAmount: Number(inst.net_due_amount) - Number(inst.paid_amount),
                    unpaidCount: 1,
                  })),
                })
              : createOverdueReminderSmsUrl({
                  phone: member.phone,
                  memberName: member.memberName,
                  groupName: member.installments[0].group_name || 'Chit Scheme',
                  pendingAmount: member.totalPending,
                  unpaidCount: 1,
                  monthNumber: member.installments[0].month_number,
                });

            const whatsAppUrl = isMultiChit
              ? createMultiChitOverdueReminderWhatsAppUrl({
                  phone: member.phone,
                  memberName: member.memberName,
                  items: member.installments.map((inst) => ({
                    groupName: inst.group_name || 'Chit Scheme',
                    ticketNumber: inst.share_ticket_number,
                    monthNumber: inst.month_number,
                    pendingAmount: Number(inst.net_due_amount) - Number(inst.paid_amount),
                    unpaidCount: 1,
                  })),
                })
              : createWhatsAppReminderUrl({
                  phone: member.phone,
                  memberName: member.memberName,
                  groupName: member.installments[0].group_name || 'Chit Scheme',
                  monthNumber: member.installments[0].month_number,
                  netDue: member.totalDue,
                  pendingBalance: member.totalPending,
                });

            return (
              <div
                key={member.memberKey}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Member & Multi-Chit Info */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-forest-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                    {member.memberName.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {member.memberName}
                      </span>
                      {isMultiChit ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
                          {member.installments.length} Chits (1 Msg)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          1 Share
                        </span>
                      )}
                    </div>

                    {/* Chit Breakdown */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                      {member.installments.map((it, idx) => {
                        const itRem = Number(it.net_due_amount) - Number(it.paid_amount);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
                          >
                            <span className="font-bold text-slate-800">{it.group_name}</span>
                            <span>(#{it.share_ticket_number}):</span>
                            <span className="text-amber-700 font-bold">{formatINR(itRem)}</span>
                          </span>
                        );
                      })}
                    </div>

                    {/* Total Dues breakdown */}
                    <div className="flex items-center gap-2.5 text-xs mt-1.5 font-medium">
                      <span className="text-slate-500">
                        Total Due: <strong className="text-slate-800">{formatINR(member.totalDue)}</strong>
                      </span>
                      {member.totalPaid > 0 && (
                        <span className="text-emerald-600">
                          Paid: <strong>{formatINR(member.totalPaid)}</strong>
                        </span>
                      )}
                      <span className="text-amber-700 font-bold">
                        Pending: {formatINR(member.totalPending)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons: Call, SMS (1 Msg), WA (1 Msg), Collect */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {member.phone && (
                    <>
                      <a
                        href={`tel:${member.phone}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                        title="Call member directly"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Call</span>
                      </a>

                      <a
                        href={smsUrl}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors cursor-pointer"
                        title={isMultiChit ? `Send 1 SMS covering ${member.installments.length} chits` : 'Send Overdue SMS'}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                        <span>{isMultiChit ? 'SMS (1 Msg)' : 'SMS'}</span>
                      </a>

                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                        title={isMultiChit ? `Send 1 WhatsApp covering ${member.installments.length} chits` : 'Send Overdue WhatsApp'}
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isMultiChit ? 'WA (1 Msg)' : 'WA'}</span>
                      </a>
                    </>
                  )}

                  {/* Collect Payment Button */}
                  <button
                    onClick={() => onCollect(member.installments[0])}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <span>Collect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Individual Share / Installment View with Multi-Chit Notice */
        <div className="divide-y divide-slate-100">
          {pendingItems.slice(0, 5).map((inst) => {
            const due = Number(inst.net_due_amount);
            const paid = Number(inst.paid_amount);
            const remaining = due - paid;
            const isPartial = inst.status === 'PARTIAL';

            const key = (inst.member_phone && inst.member_phone.trim()) || inst.member_id || inst.member_name || '';
            const memberPending = memberPendingMap.get(key) || [inst];
            const isMultiChit = memberPending.length > 1;

            const smsUrl = isMultiChit
              ? createMultiChitOverdueReminderSmsUrl({
                  phone: inst.member_phone || '',
                  memberName: inst.member_name || 'Member',
                  items: memberPending.map((item) => ({
                    groupName: item.group_name || 'Chit Scheme',
                    ticketNumber: item.share_ticket_number,
                    monthNumber: item.month_number,
                    pendingAmount: Number(item.net_due_amount) - Number(item.paid_amount),
                    unpaidCount: 1,
                  })),
                })
              : createOverdueReminderSmsUrl({
                  phone: inst.member_phone || '',
                  memberName: inst.member_name || 'Member',
                  groupName: inst.group_name || 'Chit Group',
                  pendingAmount: remaining,
                  unpaidCount: 1,
                  monthNumber: inst.month_number,
                });

            const whatsAppUrl = isMultiChit
              ? createMultiChitOverdueReminderWhatsAppUrl({
                  phone: inst.member_phone || '',
                  memberName: inst.member_name || 'Member',
                  items: memberPending.map((item) => ({
                    groupName: item.group_name || 'Chit Scheme',
                    ticketNumber: item.share_ticket_number,
                    monthNumber: item.month_number,
                    pendingAmount: Number(item.net_due_amount) - Number(item.paid_amount),
                    unpaidCount: 1,
                  })),
                })
              : createWhatsAppReminderUrl({
                  phone: inst.member_phone || '',
                  memberName: inst.member_name || 'Member',
                  groupName: inst.group_name || 'Chit Group',
                  monthNumber: inst.month_number,
                  netDue: due,
                  pendingBalance: remaining,
                });

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
                    <div className="flex items-center gap-2 flex-wrap">
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
                      {isMultiChit && (
                        <span className="text-[10px] font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full border border-forest-200">
                          +{memberPending.length - 1} other chit
                        </span>
                      )}
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

                {/* Direct Action Buttons: Call, SMS (Consolidated if 2+ chits), WA, Collect */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {inst.member_phone && (
                    <>
                      <a
                        href={`tel:${inst.member_phone}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                        title="Call member directly"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span className="hidden sm:inline">Call</span>
                      </a>

                      <a
                        href={smsUrl}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 transition-colors cursor-pointer"
                        title={isMultiChit ? `Send 1 SMS covering ${memberPending.length} chits` : 'Send Overdue Notice SMS to member'}
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                        <span>{isMultiChit ? 'SMS (1 Msg)' : 'SMS'}</span>
                      </a>

                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                        title={isMultiChit ? `Send 1 WhatsApp covering ${memberPending.length} chits` : 'Send Overdue Notice WhatsApp to member'}
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isMultiChit ? 'WA (1 Msg)' : 'WA'}</span>
                      </a>
                    </>
                  )}

                  {/* Collect Payment Button */}
                  <button
                    onClick={() => onCollect(inst)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-700 hover:bg-forest-800 text-white shadow-xs transition-colors cursor-pointer"
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
