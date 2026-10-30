import React, { useState } from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  ArrowRight,
  Trash2,
  Copy,
  Check,
  Share2,
} from 'lucide-react';
import {
  MonthSchemeBiddingData,
  WinnerPayoutSummary,
  WinnerPayoutInstallment,
  recordWinnerPayout,
  deleteWinnerPayout,
} from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';
import { createWinnerPayoutInstallmentSmsUrl, getWinnerPayoutInstallmentText } from '@/lib/sms';
import { createWinnerPayoutInstallmentWhatsAppUrl } from '@/lib/whatsapp';

interface WinnerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: MonthSchemeBiddingData;
  selectedMonth: number;
  onPayoutUpdated: (updatedSummary: WinnerPayoutSummary) => void;
}

export const WinnerPayoutModal: React.FC<WinnerPayoutModalProps> = ({
  isOpen,
  onClose,
  scheme,
  selectedMonth,
  onPayoutUpdated,
}) => {
  const auction = scheme.auction;
  const payoutSummary = auction?.payout_summary;

  const totalPayout = auction ? Number(auction.payout_amount) : 0;
  const totalDisbursed = payoutSummary ? Number(payoutSummary.total_disbursed) : 0;
  const balanceRemaining = payoutSummary ? Number(payoutSummary.balance_remaining) : totalPayout;
  const payoutStatus = payoutSummary ? payoutSummary.payout_status : 'PENDING';
  const installments = payoutSummary?.installments || [];

  // Form states
  const [amountPaid, setAmountPaid] = useState<string>(String(balanceRemaining > 0 ? balanceRemaining : ''));
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [nextExpectedPayoutDate, setNextExpectedPayoutDate] = useState<string>(payoutSummary?.next_expected_payout_date || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER');
  const [receiptReference, setReceiptReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected installment to preview / send message for (defaults to latest)
  const [selectedInstId, setSelectedInstId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen || !auction) return null;

  // Active installment for messaging preview
  const activeInstallment =
    installments.find((i) => i.id === selectedInstId) ||
    (installments.length > 0 ? installments[installments.length - 1] : null);

  // Calculate percentage disbursed
  const pctDisbursed = totalPayout > 0 ? Math.min(100, Math.round((totalDisbursed / totalPayout) * 100)) : 0;

  // Handle Recording New Installment
  const handleSubmitInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountPaid);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid installment amount greater than ₹0.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await recordWinnerPayout(auction.id, {
        amount_paid: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        receipt_reference: receiptReference.trim() || undefined,
        notes: notes.trim() || undefined,
        next_expected_payout_date: nextExpectedPayoutDate.trim() || undefined,
      });

      onPayoutUpdated(res.payout_summary);
      setSelectedInstId(res.installment.id);

      // Reset form
      const newRemaining = res.payout_summary.balance_remaining;
      setAmountPaid(newRemaining > 0 ? String(newRemaining) : '');
      setNextExpectedPayoutDate(res.payout_summary.next_expected_payout_date || '');
      setReceiptReference('');
      setNotes('');
    } catch (err: unknown) {
      console.error('Failed to record payout installment:', err);
      setError((err as Error).message || 'Failed to record payout installment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Deleting an Installment
  const handleDeleteInstallment = async (instId: string) => {
    if (!window.confirm('Are you sure you want to delete this payout installment record?')) {
      return;
    }

    try {
      setDeletingId(instId);
      setError(null);
      const res = await deleteWinnerPayout(instId);
      onPayoutUpdated(res.payout_summary);
      if (selectedInstId === instId) {
        setSelectedInstId(null);
      }
    } catch (err: unknown) {
      console.error('Failed to delete payout installment:', err);
      setError((err as Error).message || 'Failed to delete payout installment');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Copy Message
  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextPayoutDateStr = payoutSummary?.next_expected_payout_date || nextExpectedPayoutDate;

  // Build message parameters for active installment
  const messageParams = activeInstallment
    ? {
        phone: auction.winning_member_phone,
        winnerName: auction.winning_member_name,
        groupName: scheme.group.name,
        monthNumber: selectedMonth,
        installmentNumber: activeInstallment.installment_number,
        installmentAmount: activeInstallment.amount_paid,
        totalPayoutAmount: totalPayout,
        totalDisbursedSoFar: totalDisbursed,
        remainingBalance: balanceRemaining,
        paymentDate: activeInstallment.payment_date,
        nextExpectedPayoutDate: nextPayoutDateStr ? new Date(nextPayoutDateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : undefined,
        paymentMethod: activeInstallment.payment_method,
        receiptReference: activeInstallment.receipt_reference,
        notes: activeInstallment.notes,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* ------------------------------------------------------------ */}
        {/* 1. Modal Top Bar */}
        {/* ------------------------------------------------------------ */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-forest-900 via-forest-800 to-forest-900 text-white flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  Winner Prize Payout & Installments
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-forest-950">
                  வெற்றித் தொகை
                </span>
              </div>
              <p className="text-xs text-forest-200 mt-0.5">
                {auction.winning_member_name} &bull; Ticket #{auction.share_ticket_number} &bull; {scheme.group.name} (Month {selectedMonth} of 20)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-forest-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 2. Scrollable Body Content */}
        {/* ------------------------------------------------------------ */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* 2a. Prize Financial Summary Cards & Progress */}
          {/* ------------------------------------------------------------ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Payout Progress & Balance
              </span>
              {payoutStatus === 'PAID' ? (
                <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Fully Disbursed ({installments.length} {installments.length === 1 ? 'Payment' : 'Installments'})</span>
                </span>
              ) : payoutStatus === 'PARTIAL' ? (
                <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                  <Clock className="w-3.5 h-3.5 text-blue-700" />
                  <span>Partially Disbursed ({installments.length} Paid)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Pending Payout</span>
                </span>
              )}
            </div>

            {/* 3 Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Total Prize Won
                </span>
                <strong className="text-base font-black text-slate-900 block mt-0.5">
                  {formatINR(totalPayout)}
                </strong>
                <span className="text-[9px] text-slate-400">Fixed at Auction</span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Disbursed So Far
                </span>
                <strong className="text-base font-black text-forest-800 block mt-0.5">
                  {formatINR(totalDisbursed)}
                </strong>
                <span className="text-[9px] text-forest-600 font-semibold">
                  {pctDisbursed}% Paid
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Remaining Due
                </span>
                <strong
                  className={`text-base font-black block mt-0.5 ${
                    balanceRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {formatINR(balanceRemaining)}
                </strong>
                <span className="text-[9px] text-slate-400">
                  {balanceRemaining > 0 ? 'Balance to Pay' : 'Cleared ✓'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-forest-700 rounded-full transition-all duration-500"
                  style={{ width: `${pctDisbursed}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>₹0</span>
                <span>{pctDisbursed}% Disbursed</span>
                <span>{formatINR(totalPayout)}</span>
              </div>
            </div>

            {payoutSummary?.next_expected_payout_date && balanceRemaining > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/70 px-3 py-1.5 rounded-xl border border-amber-300/80">
                <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Next Payout Scheduled (அடுத்த தவணை தேதி): {new Date(payoutSummary.next_expected_payout_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------ */}
          {/* 2b. Form to Record New Installment or Bulk Payment */}
          {/* ------------------------------------------------------------ */}
          {balanceRemaining > 0 ? (
            <form onSubmit={handleSubmitInstallment} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Disburse Prize Payment (வழங்கல் பதிவு)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Pay in bulk or split across multiple installments (Installment #{installments.length + 1})
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-forest-50 text-forest-800 border border-forest-100">
                  Installment #{installments.length + 1}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(balanceRemaining))}
                  className="px-3 py-1.5 rounded-xl bg-forest-700 text-white text-xs font-bold hover:bg-forest-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Pay Full Balance (Bulk: {formatINR(balanceRemaining)})</span>
                </button>

                {balanceRemaining > 10000 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(String(Math.round(balanceRemaining / 2)))}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      50% ({formatINR(Math.round(balanceRemaining / 2))})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountPaid(String(Math.round(balanceRemaining / 3)))}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      33% ({formatINR(Math.round(balanceRemaining / 3))})
                    </button>
                  </>
                )}
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Amount to Pay */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount to Pay (வழங்கும் தொகை) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 25000"
                      max={balanceRemaining}
                      min={1}
                      required
                      className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Max: {formatINR(balanceRemaining)}
                  </span>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Disbursement Date (தேதி)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Payment Mode (செலுத்தும் வழி)</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="GPAY">Google Pay (GPay UPI)</option>
                    <option value="PHONEPE">PhonePe UPI</option>
                    <option value="CASH">Cash (ரொக்கம்)</option>
                    <option value="CHEQUE">Cheque (காசோலை)</option>
                  </select>
                </div>

                {/* UTR / Ref Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reference / UTR / Cheque #</span>
                  </label>
                  <input
                    type="text"
                    value={receiptReference}
                    onChange={(e) => setReceiptReference(e.target.value)}
                    placeholder="e.g. UTR-982837492"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                  />
                </div>

                {/* Next Expected Payout Date (Optional, when balance remaining > 0) */}
                {(parseFloat(amountPaid) || 0) < balanceRemaining && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Next Installment Due Date (அடுத்த தவணை தேதி)</span>
                    </label>
                    <input
                      type="date"
                      value={nextExpectedPayoutDate}
                      onChange={(e) => setNextExpectedPayoutDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-700"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Remarks (விருப்ப குறிப்புகள்)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 1st installment transferred to SBI account"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <span>Recording Payout Installment...</span>
                ) : (
                  <>
                    <span>Confirm & Record Installment ({formatINR(parseFloat(amountPaid) || 0)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-7 h-7 text-emerald-700 mx-auto" />
              <h4 className="text-sm font-black text-emerald-900">
                Prize Payout Fully Settled
              </h4>
              <p className="text-xs text-emerald-700">
                The entire prize amount of {formatINR(totalPayout)} has been fully disbursed in {installments.length} installment(s).
              </p>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* 2c. 1-Tap Winner Message Card (Features the Amount Set in that Installment) */}
          {/* ------------------------------------------------------------ */}
          {messageParams && activeInstallment && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-forest-50/70 to-emerald-50/50 border border-forest-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-forest-800" />
                  <h4 className="text-xs font-black text-forest-900 uppercase tracking-wide">
                    Winner Message (Installment #{activeInstallment.installment_number}: {formatINR(activeInstallment.amount_paid)})
                  </h4>
                </div>
                <span className="text-[10px] font-bold text-forest-700 bg-forest-100/70 px-2 py-0.5 rounded-full">
                  Contains Amount Set in Installment
                </span>
              </div>

              {/* Message Preview Box */}
              <div className="p-3 bg-white rounded-xl border border-forest-100 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                {getWinnerPayoutInstallmentText(messageParams)}
              </div>

              {/* 1-Tap Messaging Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={createWinnerPayoutInstallmentWhatsAppUrl(messageParams)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send WhatsApp ({formatINR(activeInstallment.amount_paid)})</span>
                </a>

                <a
                  href={createWinnerPayoutInstallmentSmsUrl(messageParams)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send Native SMS</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopyMessage(getWinnerPayoutInstallmentText(messageParams))}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  title="Copy Message Text"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* 2d. Disbursement Installments History */}
          {/* ------------------------------------------------------------ */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Payout Installments History ({installments.length})</span>
              <span className="text-[11px] font-bold text-slate-500">
                Disbursed: {formatINR(totalDisbursed)} / {formatINR(totalPayout)}
              </span>
            </h4>

            {installments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                No prize payout installments recorded yet. Use the form above to disburse in bulk or in installments.
              </div>
            ) : (
              <div className="space-y-2">
                {installments.map((inst: WinnerPayoutInstallment) => {
                  const isSelected = activeInstallment?.id === inst.id;
                  const instDate = new Date(inst.payment_date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={inst.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-forest-50/80 border-forest-300 ring-1 ring-forest-400'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-black text-xs">
                          #{inst.installment_number}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-black text-slate-900">
                              {formatINR(Number(inst.amount_paid))}
                            </strong>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {inst.payment_method.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {instDate} {inst.receipt_reference ? `• Ref: ${inst.receipt_reference}` : ''} {inst.notes ? `• ${inst.notes}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInstId(inst.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-forest-800 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? 'Active Message' : 'Select'}
                        </button>

                        <button
                          type="button"
                          disabled={deletingId === inst.id}
                          onClick={() => handleDeleteInstallment(inst.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Installment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* 3. Modal Bottom Action Bar */}
        {/* ------------------------------------------------------------ */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};

