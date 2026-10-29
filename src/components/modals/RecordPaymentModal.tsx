import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle,
  IndianRupee,
  MessageSquare,
  AlertCircle,
  Layers,
  ChevronDown,
  Check,
  User,
  Phone,
} from 'lucide-react';
import { Installment, Member, recordPayment } from '@/lib/api';
import { formatINR, createWhatsAppReceiptUrl } from '@/lib/whatsapp';
import { createPaymentClearedSmsUrl } from '@/lib/sms';
import { DueInstallmentDropdown } from './DueInstallmentDropdown';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installments: Installment[];
  selectedInstallment?: Installment | null;
  targetMember?: Member | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installments,
  selectedInstallment,
  targetMember,
}) => {
  const [installmentId, setInstallmentId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Success state with WhatsApp & SMS receipt trigger
  const [receiptData, setReceiptData] = useState<{
    phone: string;
    memberName: string;
    groupName: string;
    ticketNumber: number;
    monthNumber: number;
    amountPaid: number;
    paymentMethod: string;
    receiptNumber?: string;
    remainingBalance: number;
    status: string;
  } | null>(null);

  // Synchronize initial selection on modal open or prop change
  useEffect(() => {
    if (!isOpen) return;

    setShowMemberDropdown(false);
    setError(null);

    if (targetMember) {
      // Find all installments belonging to this specific target member
      const memberInsts = installments.filter((i) => i.member_id === targetMember.id);
      // Prioritize an installment with pending dues, or fallback to the first one
      const targetInst =
        memberInsts.find(
          (i) => Number(i.net_due_amount) - Number(i.paid_amount) > 0
        ) || memberInsts[0];

      if (targetInst) {
        setInstallmentId(targetInst.id);
        const remaining = Number(targetInst.net_due_amount) - Number(targetInst.paid_amount);
        setAmountPaid(String(Math.max(0, remaining)));
      } else {
        setInstallmentId('');
        setAmountPaid('');
      }
    } else if (selectedInstallment) {
      setInstallmentId(selectedInstallment.id);
      const remaining = Number(selectedInstallment.net_due_amount) - Number(selectedInstallment.paid_amount);
      setAmountPaid(String(Math.max(0, remaining)));
    } else if (installments.length > 0 && !installmentId) {
      const firstWithDues =
        installments.find(
          (i) => Number(i.net_due_amount) - Number(i.paid_amount) > 0
        ) ||
        installments.find((i) => i.status !== 'PAID') ||
        installments[0];
      setInstallmentId(firstWithDues.id);
      const remaining = Number(firstWithDues.net_due_amount) - Number(firstWithDues.paid_amount);
      setAmountPaid(String(Math.max(0, remaining)));
    }
  }, [isOpen, targetMember, selectedInstallment, installments]);

  const currentInst = useMemo(
    () => installments.find((i) => i.id === installmentId),
    [installments, installmentId]
  );

  // Active member identification
  const activeMemberId = targetMember?.id || currentInst?.member_id;

  // Find all chits/installments held by this active member
  const memberChits = useMemo(() => {
    if (!activeMemberId) return [];
    return installments.filter((i) => i.member_id === activeMemberId);
  }, [installments, activeMemberId]);

  if (!isOpen) return null;

  const due = currentInst ? Number(currentInst.net_due_amount) : 0;
  const currentPaid = currentInst ? Number(currentInst.paid_amount) : 0;
  const pending = due - currentPaid;
  const payAmt = Number(amountPaid) || 0;
  const nextRemaining = Math.max(0, pending - payAmt);
  const nextStatus = nextRemaining === 0 && payAmt > 0 ? 'PAID' : 'PARTIAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installmentId || payAmt <= 0) {
      setError('Please select a valid chit scheme/ticket and enter an amount.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await recordPayment({
        installment_id: installmentId,
        amount_paid: payAmt,
        payment_method: paymentMethod,
        receipt_number: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (currentInst) {
        setReceiptData({
          phone: currentInst.member_phone || '',
          memberName: currentInst.member_name || 'Member',
          groupName: currentInst.group_name || 'Chit Group',
          ticketNumber: currentInst.share_ticket_number || 1,
          monthNumber: currentInst.month_number,
          amountPaid: payAmt,
          paymentMethod,
          receiptNumber: receiptNumber || undefined,
          remainingBalance: res.remaining_balance,
          status: res.rule_status,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setReceiptData(null);
    setError(null);
    setShowMemberDropdown(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {receiptData ? 'Payment Recorded' : 'Record Member Payment'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {receiptData
                ? 'External collection confirmed and ledger updated'
                : targetMember
                ? `Recording payment for ${targetMember.name}`
                : 'Enter physical or UPI payment details'}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {receiptData ? (
          /* Success Screen with Native SMS Button */
          <div className="p-6 text-center space-y-4 overflow-y-auto flex-1">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                ₹{receiptData.amountPaid.toLocaleString('en-IN')} Received
              </h4>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {receiptData.memberName} &bull; {receiptData.groupName} (Ticket #{receiptData.ticketNumber}) &bull; Month {receiptData.monthNumber}
              </p>
              <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                Status: {receiptData.status}
              </div>
            </div>

            {receiptData.remainingBalance > 0 && (
              <p className="text-xs text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Rule 1 Notice: Remaining balance of {formatINR(receiptData.remainingBalance)} is still pending for this month.
              </p>
            )}

            {/* Inbuilt Mobile SMS & WhatsApp Buttons (Message 3 with Date) */}
            {receiptData.phone && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <a
                  href={createPaymentClearedSmsUrl({
                    phone: receiptData.phone,
                    memberName: receiptData.memberName,
                    groupName: receiptData.groupName,
                    monthNumber: receiptData.monthNumber,
                    amountPaid: receiptData.amountPaid,
                    remainingBalance: receiptData.remainingBalance,
                    paymentMethod: receiptData.paymentMethod,
                  })}
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send SMS Receipt</span>
                </a>

                <a
                  href={createWhatsAppReceiptUrl({
                    phone: receiptData.phone,
                    memberName: receiptData.memberName,
                    groupName: receiptData.groupName,
                    ticketNumber: receiptData.ticketNumber,
                    monthNumber: receiptData.monthNumber,
                    amountPaid: receiptData.amountPaid,
                    paymentMethod: receiptData.paymentMethod,
                    receiptNumber: receiptData.receiptNumber,
                    remainingBalance: receiptData.remainingBalance,
                    status: receiptData.status,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Send WhatsApp</span>
                </a>
              </div>
            )}

            <button
              onClick={resetAndClose}
              className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Member Header or Selection Dropdown */}
            {targetMember && !showMemberDropdown ? (
              <div className="p-3.5 rounded-2xl bg-forest-50/70 border border-forest-200/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-forest-700 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{targetMember.name}</h4>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{targetMember.phone}</span>
                      {targetMember.enrolled_schemes && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="font-semibold text-forest-800">{targetMember.enrolled_schemes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-forest-800 bg-white px-2.5 py-1 rounded-lg border border-forest-200 shadow-2xs">
                    {Number(targetMember.total_shares_held) === 1
                      ? '1 Chit'
                      : `${targetMember.total_shares_held} Chits`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMemberDropdown(true)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer ml-1"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Select Member & Installment
                  </label>
                  {targetMember && (
                    <button
                      type="button"
                      onClick={() => setShowMemberDropdown(false)}
                      className="text-[10px] font-semibold text-forest-700 hover:underline cursor-pointer"
                    >
                      Back to {targetMember.name}
                    </button>
                  )}
                </div>
                <DueInstallmentDropdown
                  installments={installments}
                  selectedId={installmentId}
                  onSelect={(sel) => {
                    setInstallmentId(sel.id);
                    const rem = Number(sel.net_due_amount) - Number(sel.paid_amount);
                    setAmountPaid(String(Math.max(0, rem)));
                  }}
                />
              </div>
            )}

            {/* Multi-Chit Scheme & Ticket Selector */}
            {memberChits.length > 1 ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Layers className="w-4 h-4 text-amber-700" />
                    <span>Select Chit Scheme & Ticket</span>
                  </div>
                  <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
                    {memberChits.length} Chits Enrolled
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80">
                  Select which chit group and ticket this payment belongs to:
                </p>

                <div className="grid grid-cols-1 gap-2 pt-0.5">
                  {memberChits.map((item) => {
                    const isSelected = item.id === installmentId;
                    const rem = Number(item.net_due_amount) - Number(item.paid_amount);
                    const isPaid = rem <= 0;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setInstallmentId(item.id);
                          setAmountPaid(String(Math.max(0, rem)));
                        }}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-forest-600 shadow-sm ring-2 ring-forest-600/20'
                            : 'bg-white/85 border-slate-200 hover:border-forest-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-forest-700 bg-forest-700 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {item.group_name}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-forest-50 text-forest-700 border border-forest-200">
                                Ticket #{item.share_ticket_number}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Month {item.month_number}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Due: {formatINR(Number(item.net_due_amount))} &bull; Paid: {formatINR(Number(item.paid_amount))}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {isPaid ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Paid ✓
                            </span>
                          ) : (
                            <span className="text-xs font-extrabold text-amber-700">
                              {formatINR(rem)} Due
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : currentInst && targetMember ? (
              <div className="p-3 rounded-2xl bg-forest-50/70 border border-forest-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-forest-700 block">
                    Enrolled Scheme & Ticket
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-900">
                      {currentInst.group_name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-forest-700 border border-forest-200">
                      Ticket #{currentInst.share_ticket_number}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Month {currentInst.month_number}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  {pending <= 0 ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Paid ✓
                    </span>
                  ) : (
                    <span className="text-xs font-extrabold text-amber-700">
                      {formatINR(pending)} Due
                    </span>
                  )}
                </div>
              </div>
            ) : null}

            {/* Payment Summary Box */}
            {currentInst && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Net Installment Due:</span>
                  <span className="font-semibold text-slate-800">{formatINR(due)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Already Paid:</span>
                  <span className="font-semibold text-emerald-700">{formatINR(currentPaid)}</span>
                </div>
                <div className="flex justify-between text-slate-700 font-bold pt-1 border-t border-slate-200">
                  <span>Balance Due:</span>
                  <span className="text-amber-700">{formatINR(pending)}</span>
                </div>
              </div>
            )}

            {/* Amount Paid Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Amount Received (₹)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-forest-700"
                />
              </div>

              {/* Dynamic Rule 1 Feedback */}
              <div className="flex items-center justify-between text-[11px] mt-1.5 px-1 font-medium">
                <span className="text-slate-500">Remaining Balance:</span>
                <span className={nextRemaining === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                  {formatINR(nextRemaining)} ({nextStatus})
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {['CASH', 'G_PAY', 'PHONEPE', 'PAYTM', 'BANK_TRANSFER', 'CHEQUE'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      paymentMethod === m
                        ? 'bg-forest-700 text-white border-forest-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt Number (Optional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Receipt / Voucher No. (Optional)
              </label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. REC-2026-0042"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || payAmt <= 0}
                className="w-full py-3 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting
                  ? 'Recording...'
                  : currentInst
                  ? `Confirm & Record ₹${payAmt.toLocaleString('en-IN')} for ${currentInst.group_name} (#${currentInst.share_ticket_number})`
                  : `Confirm & Record ₹${payAmt.toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

