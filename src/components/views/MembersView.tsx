import React, { useState } from 'react';
import {
  UserPlus,
  Search,
  Phone,
  MessageSquare,
  MapPin,
  Layers,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Send,
} from 'lucide-react';
import { Member, Installment, deleteMember } from '@/lib/api';
import {
  formatINR,
  createWhatsAppReminderUrl,
  createMultiChitOverdueReminderWhatsAppUrl,
} from '@/lib/whatsapp';
import {
  cleanPhone,
  createSmsUrl,
  createOverdueReminderSmsUrl,
  createMultiChitOverdueReminderSmsUrl,
} from '@/lib/sms';

interface MembersViewProps {
  members: Member[];
  installments?: Installment[];
  onNewMember: () => void;
  onRecordPayment: (member: Member) => void;
  onRefresh?: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  installments = [],
  onNewMember,
  onRecordPayment,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteMember(memberToDelete.id);
      setDeleteSuccess(`Member "${memberToDelete.name}" deleted successfully.`);
      setMemberToDelete(null);
      if (onRefresh) {
        onRefresh();
      }
      setTimeout(() => setDeleteSuccess(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete member.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone.includes(q) ||
      (m.address && m.address.toLowerCase().includes(q)) ||
      (m.enrolled_schemes && m.enrolled_schemes.toLowerCase().includes(q)) ||
      (m.ticket_details && m.ticket_details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Member Directory
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200">
              {members.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            All registered subscribers, enrolled chit allocations, and direct contact
          </p>
        </div>

        <button
          onClick={onNewMember}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {deleteSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteSuccess}</span>
          </div>
          <button
            onClick={() => setDeleteSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-sm font-bold px-2 py-0.5 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name, phone, town, or chit scheme (e.g. 1 Lakh, 2 Lakhs)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-forest-700 shadow-xs"
        />
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((member) => {
          const rawPhone = member.phone;
          const chitsCount = Number(member.total_shares_held) || 0;

          // Calculate member dues from active installments
          const memberInst = installments.filter((i) => i.member_id === member.id);
          const pendingSum = memberInst.reduce(
            (acc, i) => acc + Math.max(0, Number(i.net_due_amount) - Number(i.paid_amount)),
            0
          );
          const hasPending = pendingSum > 0;

          return (
            <div
              key={member.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-forest-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">
                      {member.name}
                    </h3>

                    {/* Directly below the name: Number of chits taken */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-forest-100/90 text-forest-800 border border-forest-200">
                        <Layers className="w-3.5 h-3.5 text-forest-700" />
                        <span>
                          {chitsCount === 1 ? '1 Chit Taken' : `${chitsCount} Chits Taken`}
                        </span>
                      </span>

                      {member.enrolled_schemes && (
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {member.enrolled_schemes}
                        </span>
                      )}

                      {/* Dues Status Badge */}
                      {chitsCount > 0 && (
                        hasPending ? (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{formatINR(pendingSum)} Due</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Cleared ✓</span>
                          </span>
                        )
                      )}
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 mt-1.5 flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{member.phone}</span>
                      {member.ticket_details && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-[10px] text-slate-400 font-semibold truncate">
                            {member.ticket_details}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        member.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {member.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setMemberToDelete(member);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                      title={`Delete ${member.name} from directory`}
                      aria-label={`Delete ${member.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {member.address && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 my-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{member.address}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 space-y-2 mt-2">
                {chitsCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => onRecordPayment(member)}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      hasPending
                        ? 'bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white'
                        : 'bg-forest-50 hover:bg-forest-100 active:bg-forest-200 text-forest-800 border border-forest-300'
                    }`}
                    title={
                      chitsCount > 1
                        ? `Record payment across ${chitsCount} enrolled chits`
                        : 'Record payment for this member'
                    }
                  >
                    <IndianRupee className="w-3.5 h-3.5" />
                    <span>
                      {hasPending
                        ? chitsCount > 1
                          ? `Record Payment (${chitsCount} Chits • ${formatINR(pendingSum)} Due)`
                          : `Record Payment (${formatINR(pendingSum)} Due)`
                        : chitsCount > 1
                          ? `Record Payment (${chitsCount} Chits)`
                          : 'Record Payment'}
                    </span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 font-semibold text-[11px] text-center">
                    No active chits enrolled
                  </div>
                )}

                {(() => {
                  const memberPendingInst = memberInst.filter(
                    (i) => Math.max(0, Number(i.net_due_amount) - Number(i.paid_amount)) > 0
                  );
                  const isMultiChitPending = memberPendingInst.length > 1;

                  let smsUrl = '';
                  let whatsAppUrl = '';

                  if (hasPending) {
                    if (isMultiChitPending) {
                      smsUrl = createMultiChitOverdueReminderSmsUrl({
                        phone: rawPhone,
                        memberName: member.name,
                        items: memberPendingInst.map((it) => ({
                          groupName: it.group_name || 'Chit Scheme',
                          chitAmount: it.total_pot_value ? Number(it.total_pot_value) : undefined,
                          ticketNumber: it.share_ticket_number,
                          monthNumber: it.month_number,
                          pendingAmount: Number(it.net_due_amount) - Number(it.paid_amount),
                          unpaidCount: 1,
                        })),
                      });
                      whatsAppUrl = createMultiChitOverdueReminderWhatsAppUrl({
                        phone: rawPhone,
                        memberName: member.name,
                        items: memberPendingInst.map((it) => ({
                          groupName: it.group_name || 'Chit Scheme',
                          chitAmount: it.total_pot_value ? Number(it.total_pot_value) : undefined,
                          ticketNumber: it.share_ticket_number,
                          monthNumber: it.month_number,
                          pendingAmount: Number(it.net_due_amount) - Number(it.paid_amount),
                          unpaidCount: 1,
                        })),
                      });
                    } else if (memberPendingInst.length === 1) {
                      smsUrl = createOverdueReminderSmsUrl({
                        phone: rawPhone,
                        memberName: member.name,
                        groupName: memberPendingInst[0].group_name || 'Chit Scheme',
                        pendingAmount: pendingSum,
                        unpaidCount: 1,
                        monthNumber: memberPendingInst[0].month_number,
                      });
                      whatsAppUrl = createWhatsAppReminderUrl({
                        phone: rawPhone,
                        memberName: member.name,
                        groupName: memberPendingInst[0].group_name || 'Chit Scheme',
                        monthNumber: memberPendingInst[0].month_number,
                        netDue: Number(memberPendingInst[0].net_due_amount),
                        pendingBalance: pendingSum,
                      });
                    }
                  } else {
                    smsUrl = createSmsUrl(
                      rawPhone,
                      `வணக்கம் / Hello ${member.name},\n\nRAJAMANICKAM CHIT FUND\nGreetings from Rajamanickam Chit Fund, Yethapur.\nராஜமாணிக்கம் சிட் பண்ட்-ன் அன்பான வணக்கங்கள்.\n\nRegards / இங்ஙனம்,\nRajamanickam Chit Fund, Yethapur\nPh: +91 99944 18186`
                    );
                    whatsAppUrl = `https://wa.me/${cleanPhone(rawPhone)}?text=${encodeURIComponent(
                      `வணக்கம் / Hello ${member.name},\n\n*RAJAMANICKAM CHIT FUND*\nGreetings from Rajamanickam Chit Fund, Yethapur.\nராஜமாணிக்கம் சிட் பண்ட்-ன் அன்பான வணக்கங்கள்.\n\nRegards / இங்ஙனம்,\n*Rajamanickam Chit Fund, Yethapur*\nPh: +91 99944 18186`
                    )}`;
                  }

                  return (
                    <div className="flex items-center justify-between gap-1.5">
                      <a
                        href={`tel:${rawPhone}`}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
                        title="Call member directly"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>Call</span>
                      </a>

                      <a
                        href={smsUrl}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-forest-50 hover:bg-forest-100 text-forest-800 border border-forest-200 text-xs font-bold transition-colors cursor-pointer"
                        title={
                          isMultiChitPending
                            ? `Send 1 SMS covering ${memberPendingInst.length} chits`
                            : 'Send SMS'
                        }
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-forest-700" />
                        <span>{isMultiChitPending ? 'SMS (1 Msg)' : 'SMS'}</span>
                      </a>

                      <a
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
                        title={
                          isMultiChitPending
                            ? `Send 1 WhatsApp covering ${memberPendingInst.length} chits`
                            : 'Send WhatsApp'
                        }
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isMultiChitPending ? 'WA (1 Msg)' : 'WA'}</span>
                      </a>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Member from Directory?
                </h3>
                <p className="text-xs text-slate-500">
                  Permanently remove subscriber and revoke chit shares
                </p>
              </div>
            </div>

            {/* Error Message if Deletion Blocked */}
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{deleteError}</span>
              </div>
            )}

            {/* Member Details */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member Name:</span>
                <span className="font-bold text-slate-900">{memberToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-semibold text-slate-700">{memberToDelete.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Enrolled Schemes:</span>
                <span className="font-bold text-forest-800 text-right">
                  {memberToDelete.enrolled_schemes || 'None'}
                </span>
              </div>
              {memberToDelete.ticket_details && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tickets Held:</span>
                  <span className="font-semibold text-slate-700 text-right">
                    {memberToDelete.ticket_details}
                  </span>
                </div>
              )}
              {(() => {
                const memberInst = installments.filter((i) => i.member_id === memberToDelete.id);
                const pendingSum = memberInst.reduce(
                  (acc, i) => acc + Math.max(0, Number(i.net_due_amount) - Number(i.paid_amount)),
                  0
                );
                if (pendingSum > 0) {
                  return (
                    <div className="flex justify-between pt-1 border-t border-slate-200/80">
                      <span className="text-slate-500">Pending Installments:</span>
                      <span className="font-bold text-amber-700">{formatINR(pendingSum)}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Warning Note */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Permanent Deletion Warning</span>
              </p>
              <p className="text-amber-800">
                Deleting this member will release their assigned ticket slots across all enrolled chit schemes, along with associated installment records. This action cannot be undone.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMemberToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  'Deleting Member...'
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

