import React, { useState, useEffect } from 'react';
import { Hammer, Calendar, Award, PlusCircle } from 'lucide-react';
import { Auction } from '@/lib/api';
import { formatINR } from '@/lib/sms';
import { AuctionsViewSkeleton } from '@/components/common/Skeleton';

interface AuctionsViewProps {
  onRecordAuction: () => void;
}

export const AuctionsView: React.FC<AuctionsViewProps> = ({ onRecordAuction }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auctions')
      .then((res) => res.json())
      .then((data) => {
        setAuctions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <AuctionsViewSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Auction (&ldquo;Yelam&rdquo;) Records & Dividends
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recorded offline auction outcomes, distributed member dividends, and winner payouts
          </p>
        </div>

        <button
          onClick={onRecordAuction}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Log Auction Result</span>
        </button>
      </div>

      {/* Auctions Cards */}
      <div className="space-y-3">
        {auctions.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 border border-slate-200 text-center text-slate-400">
            <Hammer className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No Auction Records Entered Yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Log Auction Result&quot; to enter this month&apos;s physical auction outcome.
            </p>
          </div>
        ) : (
          auctions.map((a) => {
            const discount = Number(a.bid_discount_amount);
            const commission = Number(a.organizer_commission);
            const netDividend = Number(a.net_dividend_pool);
            const divPerShare = Number(a.dividend_per_share);
            const payout = Number(a.payout_amount);
            const netDue = Number(a.net_installment_due);

            return (
              <div
                key={a.id}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-forest-300 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm">
                      M{a.month_number}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {a.group_name} &bull; Month {a.month_number} Auction
                      </h3>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Auction Date: {new Date(a.auction_date).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Winning Bidder Pill */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-50 border border-forest-200 text-xs font-bold text-forest-800 self-start sm:self-center">
                    <Award className="w-4 h-4 text-forest-700" />
                    <span>Prized: {a.winning_member_name} (Ticket #{a.share_ticket_number})</span>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">
                      Auction Discount
                    </span>
                    <strong className="text-slate-900 font-extrabold text-sm">
                      {formatINR(discount)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">
                      5% Commission
                    </span>
                    <strong className="text-slate-700 font-bold">
                      {formatINR(commission)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">
                      Dividend / Member
                    </span>
                    <strong className="text-emerald-700 font-extrabold text-sm">
                      +{formatINR(divPerShare)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium block">
                      Net Installment Due
                    </span>
                    <strong className="text-slate-900 font-extrabold text-sm">
                      {formatINR(netDue)}
                    </strong>
                  </div>
                </div>

                {/* Final Winner Payout */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-slate-500 font-medium">
                    Total Disbursed to Winner:
                  </span>
                  <span className="text-sm font-extrabold text-forest-700">
                    {formatINR(payout)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
