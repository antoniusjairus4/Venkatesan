import React, { useState, useEffect } from 'react';
import { X, CheckCircle, IndianRupee, MessageCircle, AlertCircle } from 'lucide-react';
import { Installment, recordPayment } from '@/lib/api';
import { formatINR, createWhatsAppReceiptUrl } from '@/lib/whatsapp';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  installments: Installment[];
  selectedInstallment?: Installment | null;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  installments,
  selectedInstallment,
}) => {
  const [installmentId, setInstallmentId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with WhatsApp receipt trigger
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

  useEffect(() => {
    if (selectedInstallment) {
      setInstallmentId(selectedInstallment.id);
      const remaining = Number(selectedInstallment.net_due_amount) - Number(selectedInstallment.paid_amount);
      setAmountPaid(String(Math.max(0, remaining)));
    } else if (installments.length > 0 && !installmentId) {
      setInstallmentId(installments[0].id);
      const remaining = Number(installments[0].net_due_amount) - Number(installments[0].paid_amount);
      setAmountPaid(String(Math.max(0, remaining)));
    }
  }, [selectedInstallment, installments]);

  if (!isOpen) return null;

  const currentInst = installments.find((i) => i.id === installmentId);
  const due = currentInst ? Number(currentInst.net_due_amount) : 0;
  const currentPaid = currentInst ? Number(currentInst.paid_amount) : 0;
  const pending = due - currentPaid;
  const payAmt = Number(amountPaid) || 0;
  const nextRemaining = Math.max(0, pending - payAmt);
  const nextStatus = nextRemaining === 0 && payAmt > 0 ? 'PAID' : 'PARTIAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!installmentId || payAmt <= 0) {
      setError('Please select an installment and enter a valid amount.');
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {receiptData ? 'Payment Recorded' : 'Record Member Payment'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {receiptData
                ? 'External collection confirmed and ledger updated'
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
          /* Success Screen with WhatsApp Button */
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">
                ₹{receiptData.amountPaid.toLocaleString('en-IN')} Received
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {receiptData.memberName} &bull; Ticket #{receiptData.ticketNumber} &bull; {receiptData.groupName}
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

            {/* Direct WhatsApp Share Button */}
            {receiptData.phone && (
              <div className="pt-2">
                <a
                  href={createWhatsAppReceiptUrl(receiptData)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Send WhatsApp Receipt to Member</span>
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
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Installment */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Select Due Installment
              </label>
              <select
                value={installmentId}
                onChange={(e) => {
                  setInstallmentId(e.target.value);
                  const sel = installments.find((i) => i.id === e.target.value);
                  if (sel) {
                    const rem = Number(sel.net_due_amount) - Number(sel.paid_amount);
                    setAmountPaid(String(Math.max(0, rem)));
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-700"
              >
                {installments.map((i) => {
                  const rem = Number(i.net_due_amount) - Number(i.paid_amount);
                  return (
                    <option key={i.id} value={i.id}>
                      {i.member_name} — {i.group_name} (M{i.month_number}, #{i.share_ticket_number}) &bull; Pending {formatINR(rem)}
                    </option>
                  );
                })}
              </select>
            </div>

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
                {submitting ? 'Recording...' : `Confirm & Record ₹${payAmt.toLocaleString('en-IN')}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

