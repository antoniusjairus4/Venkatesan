import React, { useState, useEffect } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle, MessageSquare, Plus, Minus, Ticket } from 'lucide-react';
import { ChitGroup, createMember } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';
import { createEnrollmentSmsUrl } from '@/lib/sms';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups?: ChitGroup[];
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
  const [idProofType, setIdProofType] = useState('Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [shareCount, setShareCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    memberName: string;
    phone: string;
    groupName?: string;
    potValue?: number;
    baseAmount?: number;
    startDate?: string;
    ticketCount?: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setWhatsapp('');
      setAddress('');
      setIdProofNumber('');
      setSelectedGroup('');
      setShareCount(1);
      setError(null);
      setSuccessData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide member name and phone number.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await createMember({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_phone: whatsapp.trim() || phone.trim(),
        address: address.trim() || undefined,
        id_proof_type: idProofType || undefined,
        id_proof_number: idProofNumber.trim() || undefined,
        chit_group_id: selectedGroup || undefined,
        share_count: selectedGroup ? shareCount : undefined,
      });

      const grp = groups.find((g) => g.id === selectedGroup);
      setSuccessData({
        memberName: name.trim(),
        phone: phone.trim(),
        groupName: grp?.name,
        potValue: grp ? Number(grp.total_pot_value) : undefined,
        baseAmount: grp ? Number(grp.installment_base_amount) * shareCount : undefined,
        startDate: grp ? new Date(grp.start_date).toLocaleDateString('en-IN') : undefined,
        ticketCount: shareCount,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGrp = groups.find((g) => g.id === selectedGroup);
  const availableSlots = selectedGrp
    ? Math.max(1, (selectedGrp.total_shares || 20) - Number(selectedGrp.enrolled_shares || 0))
    : 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-bold text-slate-900">
              Register New Member
            </h3>
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
              {successData.groupName && (
                <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-forest-50 text-forest-800 border border-forest-200">
                  Enrolled: {successData.groupName} {successData.ticketCount && successData.ticketCount > 1 ? `(${successData.ticketCount} Tickets)` : ''}
                </div>
              )}
            </div>

            {successData.groupName && successData.potValue && successData.baseAmount && (
              <div className="pt-2">
                <a
                  href={createEnrollmentSmsUrl({
                    phone: successData.phone,
                    memberName: successData.memberName,
                    groupName: successData.groupName,
                    potValue: successData.potValue,
                    baseAmount: successData.baseAmount,
                    startDate: successData.startDate || 'Immediate',
                  })}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white font-bold text-sm shadow-md shadow-forest-700/20 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send SMS to Member (Phone Messages App)</span>
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
              Done & Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                KYC ID Proof
              </label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                ID Number
              </label>
              <input
                type="text"
                value={idProofNumber}
                onChange={(e) => setIdProofNumber(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Enroll In Scheme (Rule 2)
              </label>
              <select
                aria-label="Enroll In Scheme"
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setShareCount(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              >
                <option value="">-- Do Not Enroll Yet --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatINR(Number(g.total_pot_value))})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Interactive Ticket Counter */}
            {selectedGroup && selectedGrp && (
              <div className="p-3 bg-forest-50/60 border border-forest-200/80 rounded-2xl space-y-2.5 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-forest-700" />
                      <span>Number of Chits / Tickets</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">
                      சீட்டுகள் எண்ணிக்கை ({availableSlots} slots available)
                    </span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        disabled={num > availableSlots}
                        onClick={() => setShareCount(num)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          shareCount === num
                            ? 'bg-forest-700 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Counter Stepper with Decrement (-) and Increment (+) */}
                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={shareCount <= 1}
                      onClick={() => setShareCount((prev) => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Decrease ticket count"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex items-baseline gap-1.5 px-2">
                      <input
                        type="number"
                        min="1"
                        max={availableSlots}
                        value={shareCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val) || val < 1) {
                            setShareCount(1);
                          } else {
                            setShareCount(Math.min(availableSlots, val));
                          }
                        }}
                        className="w-10 text-center text-base font-extrabold text-slate-900 bg-transparent focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600">
                        {shareCount === 1 ? 'Chit Ticket' : 'Chit Tickets'}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={shareCount >= availableSlots}
                      onClick={() => setShareCount((prev) => Math.min(availableSlots, prev + 1))}
                      className="w-8 h-8 rounded-lg bg-forest-700 hover:bg-forest-800 active:scale-95 text-white font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Increase ticket count"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Real-time Calculation Tag */}
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Monthly Base</div>
                    <div className="text-xs font-extrabold text-forest-800">
                      {formatINR(Number(selectedGrp.installment_base_amount) * shareCount)}
                      <span className="text-[10px] font-normal text-slate-400 ml-1">/ mo</span>
                    </div>
                  </div>
                </div>

                {/* Informative Note */}
                {shareCount > 1 && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
                    ✓ Member will receive <strong>{shareCount} unique ticket numbers</strong> and <strong>{shareCount} payouts</strong> during the 20 months.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Registering...' : 'Register Member'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

