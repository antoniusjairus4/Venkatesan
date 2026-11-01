import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Plus,
  Minus,
  Ticket,
  Check,
  Layers,
} from 'lucide-react';
import { ChitGroup, createMember, fetchChitGroups } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';
import { createEnrollmentSmsUrl, createMultiEnrollmentSmsUrl } from '@/lib/sms';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups?: ChitGroup[];
}

interface SchemeSelection {
  enabled: boolean;
  shareCount: number;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groups = [],
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [loadedGroups, setLoadedGroups] = useState<ChitGroup[]>(groups);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Sync groups from props or fetch directly if not available yet
  useEffect(() => {
    if (groups && groups.length > 0) {
      setLoadedGroups(groups);
    } else if (isOpen) {
      setLoadingGroups(true);
      fetchChitGroups()
        .then((data) => {
          setLoadedGroups(data);
          setLoadingGroups(false);
        })
        .catch((err) => {
          console.error('Failed to load active chit groups in modal:', err);
          setLoadingGroups(false);
        });
    }
  }, [groups, isOpen]);

  // Multi-scheme selection: groupId -> { enabled, shareCount }
  const [selectedSchemes, setSelectedSchemes] = useState<Record<string, SchemeSelection>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    memberName: string;
    phone: string;
    enrolledSchemes: Array<{
      groupName: string;
      potValue: number;
      baseAmount: number;
      ticketCount: number;
      startDate: string;
    }>;
  } | null>(null);

  // Always keep schemes sorted in ascending order of scheme value (1L, 2L, 3L)
  const sortedGroups = useMemo(() => {
    return [...loadedGroups].sort(
      (a, b) => Number(a.total_pot_value) - Number(b.total_pot_value)
    );
  }, [loadedGroups]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setSelectedSchemes({});
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle a scheme on or off
  const handleToggleScheme = (groupId: string) => {
    setSelectedSchemes((prev) => {
      const current = prev[groupId];
      if (current && current.enabled) {
        return {
          ...prev,
          [groupId]: { ...current, enabled: false },
        };
      }
      return {
        ...prev,
        [groupId]: { enabled: true, shareCount: current?.shareCount || 1 },
      };
    });
  };

  // Change share count for a specific scheme
  const handleShareCountChange = (groupId: string, count: number) => {
    setSelectedSchemes((prev) => ({
      ...prev,
      [groupId]: {
        enabled: true,
        shareCount: Math.max(1, count),
      },
    }));
  };

  // Calculate totals across all selected schemes
  const activeEnrolledList = sortedGroups
    .filter((g) => selectedSchemes[g.id]?.enabled)
    .map((g) => ({
      group: g,
      shareCount: selectedSchemes[g.id]?.shareCount || 1,
      totalBase: Number(g.installment_base_amount) * (selectedSchemes[g.id]?.shareCount || 1),
    }));

  const totalMonthlyCommitment = activeEnrolledList.reduce(
    (sum, item) => sum + item.totalBase,
    0
  );
  const totalTicketsAllotted = activeEnrolledList.reduce(
    (sum, item) => sum + item.shareCount,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide member name and phone number.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const enrolledPayload = activeEnrolledList.map((item) => ({
        chit_group_id: item.group.id,
        share_count: item.shareCount,
      }));

      await createMember({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_phone: whatsapp.trim() || phone.trim(),
        address: address.trim() || undefined,
        enrolled_schemes: enrolledPayload.length > 0 ? enrolledPayload : undefined,
      });

      setSuccessData({
        memberName: name.trim(),
        phone: phone.trim(),
        enrolledSchemes: activeEnrolledList.map((item) => ({
          groupName: item.group.name,
          potValue: Number(item.group.total_pot_value),
          baseAmount: item.totalBase,
          ticketCount: item.shareCount,
          startDate: new Date(item.group.start_date).toLocaleDateString('en-IN'),
        })),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-forest-700" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Register New Member
              </h3>
              <p className="text-[11px] text-slate-500">
                Enroll in 1, 2, or all 3 chit schemes simultaneously
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSuccessData(null);
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-6 text-center space-y-4 overflow-y-auto flex-1">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                Member Registered Successfully!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {successData.memberName} &bull; {successData.phone}
              </p>

              {successData.enrolledSchemes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Enrolled Schemes ({successData.enrolledSchemes.length})
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {successData.enrolledSchemes.map((s, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-forest-50 text-forest-900 border border-forest-200 flex items-center gap-2"
                      >
                        <Ticket className="w-3.5 h-3.5 text-forest-700" />
                        <span>
                          {s.groupName}: {s.ticketCount} {s.ticketCount === 1 ? 'Member' : 'Members'}
                        </span>
                        <span className="text-forest-600 font-normal">
                          ({formatINR(s.baseAmount)}/mo)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Native SMS Trigger */}
            {successData.enrolledSchemes.length > 0 && (
              <div className="pt-2">
                <a
                  href={
                    successData.enrolledSchemes.length === 1
                      ? createEnrollmentSmsUrl({
                          phone: successData.phone,
                          memberName: successData.memberName,
                          groupName: successData.enrolledSchemes[0].groupName,
                          potValue: successData.enrolledSchemes[0].potValue,
                          baseAmount: successData.enrolledSchemes[0].baseAmount,
                          startDate: successData.enrolledSchemes[0].startDate,
                        })
                      : createMultiEnrollmentSmsUrl({
                          phone: successData.phone,
                          memberName: successData.memberName,
                          schemes: successData.enrolledSchemes,
                        })
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white font-bold text-sm shadow-md shadow-forest-700/20 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Confirmation SMS (Messages App)</span>
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setSuccessData(null);
                onClose();
              }}
              className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Done &amp; Close
            </button>
          </div>
        ) : (
          /* Member Registration Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Member Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Member Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. R. Murugan"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>

            {/* Primary & WhatsApp Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Primary Phone #
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  WhatsApp Phone #
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Optional (same as phone)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
                />
              </div>
            </div>

            {/* Address / Town */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Address / Town
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Meyyanur, Salem"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Multi-Scheme Selection (Select 1, 2, or All 3 Chit Schemes) */}
            {/* ------------------------------------------------------------- */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-forest-700" />
                  <span>Enroll in Chit Schemes (Select 1, 2, or All 3)</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-900">
                  {activeEnrolledList.length} Selected
                </span>
              </div>

              {/* Grid of Schemes with Checkbox & Share Counter */}
              {loadingGroups && sortedGroups.length === 0 ? (
                <div className="space-y-2">
                  <div className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                  <div className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                  <div className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedGroups.map((group) => {
                    const selection = selectedSchemes[group.id];
                    const isChecked = Boolean(selection?.enabled);
                    const shares = selection?.shareCount || 1;
                    const pot = Number(group.total_pot_value);
                    const base = Number(group.installment_base_amount);
                    const enrolledCount = Number(group.enrolled_shares || 0);
                    const availableSlots = Math.max(
                      1,
                      (group.total_shares || 20) - enrolledCount
                    );

                    return (
                      <div
                        key={group.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-forest-50/70 border-forest-600 shadow-2xs'
                            : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Top Checkbox & Scheme Info Header */}
                        <div
                          onClick={() => handleToggleScheme(group.id)}
                          className="flex items-start justify-between gap-3 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            {/* Styled Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-forest-700 text-white shadow-2xs'
                                  : 'bg-white border-2 border-slate-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900">
                                {group.name} ({formatINR(pot)})
                              </h4>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Base: {formatINR(base)}/mo &bull; 20 Months
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isChecked
                                ? 'bg-forest-700 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {enrolledCount} / {group.total_shares || 20} Enrolled
                          </span>
                        </div>

                        {/* Expanded Ticket Counter if Checked */}
                        {isChecked && (
                          <div className="mt-2.5 pt-2.5 border-t border-forest-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in-50 duration-150">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-forest-900 flex items-center gap-1">
                                <Ticket className="w-3.5 h-3.5 text-forest-700" />
                                Members:
                              </span>

                              {/* Stepper */}
                              <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-2xs p-0.5">
                                <button
                                  type="button"
                                  disabled={shares <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareCountChange(group.id, shares - 1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <span className="w-8 text-center text-xs font-extrabold text-slate-900">
                                  {shares}
                                </span>

                                <button
                                  type="button"
                                  disabled={shares >= availableSlots}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareCountChange(group.id, shares + 1);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-forest-700 hover:bg-forest-800 text-white font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Quick Presets */}
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    disabled={num > availableSlots}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareCountChange(group.id, num);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      shares === num
                                        ? 'bg-forest-800 text-white'
                                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Line Item Total */}
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                                Monthly Due
                              </span>
                              <span className="text-xs font-extrabold text-forest-900">
                                {formatINR(base * shares)}/mo
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Combined Multi-Scheme Commitment Summary */}
              {activeEnrolledList.length > 0 ? (
                <div className="p-3 bg-forest-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest-300 block">
                      Total Monthly Commitment ({activeEnrolledList.length} Schemes)
                    </span>
                    <span className="text-xs text-forest-200">
                      {totalTicketsAllotted} {totalTicketsAllotted === 1 ? 'Member' : 'Members'} Total
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-white">
                      {formatINR(totalMonthlyCommitment)}
                    </span>
                    <span className="text-[10px] text-forest-300 block">per month</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic text-center py-1">
                  Optional: Select chit schemes above to enroll this member immediately.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? 'Registering Member...'
                  : activeEnrolledList.length > 0
                  ? `Register & Enroll in ${activeEnrolledList.length} Schemes`
                  : 'Register Member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
