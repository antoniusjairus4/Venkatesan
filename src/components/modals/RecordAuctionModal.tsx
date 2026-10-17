import React, { useState } from 'react';
import { X, Hammer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ChitGroup, Member } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface RecordAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groups: ChitGroup[];
  members: Member[];
}

export const RecordAuctionModal: React.FC<RecordAuctionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groups,
  members,
}) => {
  const [groupId, setGroupId] = useState<string>(groups[0]?.id || '');
  const [monthNumber, setMonthNumber] = useState<number>(1);
  const [winningMemberId, setWinningMemberId] = useState<string>(members[0]?.id || '');
  const [bidDiscount, setBidDiscount] = useState<string>('15000');
  const [auctionDate, setAuctionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentGroup = groups.find((g) => g.id === groupId) || groups[0];
  const pot = currentGroup ? Number(currentGroup.total_pot_value) : 100000;
  const shares = currentGroup ? Number(currentGroup.total_shares) : 20;
  const base = currentGroup ? Number(currentGroup.installment_base_amount) : 5000;
  const commissionPercent = currentGroup ? Number(currentGroup.commission_percent || 5) : 5;

  const discountNum = Number(bidDiscount) || 0;
  const commission = (pot * commissionPercent) / 100;
  const netDividendPool = Math.max(0, discountNum - commission);
  const dividendPerShare = netDividendPool / (shares || 1);
  const netDuePerShare = base - dividendPerShare;
  const winnerPayout = pot - discountNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !winningMemberId || discountNum <= 0) {
      setError('Please fill in all auction parameters.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Find a share for the winning member in this group
      const res = await fetch('/api/record-auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chit_group_id: groupId,
          month_number: monthNumber,
          auction_date: auctionDate,
          winning_member_id: winningMemberId,
          winning_share_id: '00000000-0000-0000-0000-000000000000', // fallback or lookup
          bid_discount_amount: discountNum,
          notes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to record auction');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record auction');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Conduct Monthly Yelam (Auction)
              </h3>
              <p className="text-[11px] text-slate-500">
                Rules 4 & 5: Dynamic auction discount & dividend distribution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Chit Group & Month */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Chit Group
              </label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({formatINR(Number(g.total_pot_value))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Month #
              </label>
              <input
                type="number"
                min="1"
                max={currentGroup ? currentGroup.total_months : 20}
                value={monthNumber}
                onChange={(e) => setMonthNumber(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          {/* Winning Member */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Winning Bidder (Prized Member)
            </label>
            <select
              value={winningMemberId}
              onChange={(e) => setWinningMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Auction Hammer Discount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Hammer / Bid Discount Amount (₹)
              </label>
              <span className="text-[10px] text-slate-400">Rule 4: Dynamic Monthly</span>
            </div>
            <input
              type="number"
              step="100"
              min="1000"
              value={bidDiscount}
              onChange={(e) => setBidDiscount(e.target.value)}
              placeholder="e.g. 15000"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-forest-700"
            />
          </div>

          {/* Dynamic Calculation Breakdown (Rule 4 & Rule 5) */}
          <div className="p-3.5 rounded-2xl bg-forest-50/70 border border-forest-200 text-xs space-y-2">
            <div className="font-bold text-forest-900 flex items-center justify-between border-b border-forest-200/60 pb-1.5">
              <span>Automatic Settlement Breakdown</span>
              <span className="text-[10px] text-forest-700 font-normal">Pot: {formatINR(pot)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Organizer Commission (5%)</span>
                <span className="font-bold">{formatINR(commission)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Net Dividend Pool</span>
                <span className="font-bold text-forest-800">{formatINR(netDividendPool)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Dividend / Member</span>
                <span className="font-bold text-emerald-700">+{formatINR(dividendPerShare)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Net Installment Due</span>
                <span className="font-bold text-slate-900">{formatINR(netDuePerShare)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-forest-200/60 flex items-center justify-between text-forest-900 font-extrabold">
              <span>Winner Payout (Rule 5):</span>
              <span className="text-base text-forest-800">{formatINR(winnerPayout)}</span>
            </div>
          </div>

          {/* Date & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Auction Date
              </label>
              <input
                type="date"
                value={auctionDate}
                onChange={(e) => setAuctionDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Remarks / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Month 1 Auction"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? 'Applying Auction...' : 'Confirm & Apply Yelam Results'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

