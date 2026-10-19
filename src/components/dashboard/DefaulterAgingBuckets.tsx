import React, { useState } from 'react';
import { AlertTriangle, Clock, ShieldAlert, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '@/lib/sms';

interface DefaulterMember {
  memberId: string;
  memberName: string;
  phone: string;
  groupName: string;
  unpaidCount: number;
  pendingAmount: number;
  riskLevel: 'MILD' | 'MODERATE' | 'CRITICAL';
}

interface DefaulterAgingBucketsProps {
  bucket1: { count: number; amount: number }; // 1 Month
  bucket2: { count: number; amount: number }; // 2 Months
  bucket3: { count: number; amount: number }; // 3+ Months
  defaultersList: DefaulterMember[];
  onCollectPayment?: (memberId: string) => void;
}

export const DefaulterAgingBuckets: React.FC<DefaulterAgingBucketsProps> = ({
  bucket1,
  bucket2,
  bucket3,
  defaultersList,
}) => {
  const [selectedBucket, setSelectedBucket] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredList = defaultersList.filter((m) => {
    if (selectedBucket === '1') return m.unpaidCount === 1;
    if (selectedBucket === '2') return m.unpaidCount === 2;
    if (selectedBucket === '3') return m.unpaidCount >= 3;
    return true;
  });

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Defaulter Aging &amp; Risk Buckets</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Aging analysis of overdue installments (1 Month, 2 Months, 3+ Months)
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* 3 Risk Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Bucket 1: 1 Month */}
        <div
          onClick={() => setSelectedBucket(selectedBucket === '1' ? 'ALL' : '1')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedBucket === '1'
              ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 1 Month Due
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900">
              {bucket1.count}
            </span>
          </div>
          <p className="text-lg font-black text-amber-900">
            {formatINR(bucket1.amount)}
          </p>
          <span className="text-[10px] text-amber-700 font-medium">Mild Risk &bull; Routine Reminder</span>
        </div>

        {/* Bucket 2: 2 Months */}
        <div
          onClick={() => setSelectedBucket(selectedBucket === '2' ? 'ALL' : '2')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedBucket === '2'
              ? 'bg-orange-100/70 border-orange-400 ring-2 ring-orange-400/20 shadow-xs'
              : 'bg-orange-50/60 hover:bg-orange-50 border-orange-200'
          }`}
        >
          <div className="flex items-center justify-between text-orange-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 2 Months Overdue
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-orange-200 text-orange-900">
              {bucket2.count}
            </span>
          </div>
          <p className="text-lg font-black text-orange-900">
            {formatINR(bucket2.amount)}
          </p>
          <span className="text-[10px] text-orange-700 font-medium">Moderate Risk &bull; Follow Up</span>
        </div>

        {/* Bucket 3: 3+ Months */}
        <div
          onClick={() => setSelectedBucket(selectedBucket === '3' ? 'ALL' : '3')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            selectedBucket === '3'
              ? 'bg-red-100/70 border-red-400 ring-2 ring-red-400/20 shadow-xs'
              : 'bg-red-50/60 hover:bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between text-red-800 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> 3+ Months Critical
            </span>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-red-200 text-red-900">
              {bucket3.count}
            </span>
          </div>
          <p className="text-lg font-black text-red-900">
            {formatINR(bucket3.amount)}
          </p>
          <span className="text-[10px] text-red-700 font-medium">High Risk &bull; Urgent Recovery</span>
        </div>
      </div>

      {/* Defaulters Breakdown List (Expandable) */}
      {isExpanded && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedBucket === 'ALL'
                ? `All Overdue Members (${defaultersList.length})`
                : `Bucket ${selectedBucket} Members (${filteredList.length})`}
            </span>
            {selectedBucket !== 'ALL' && (
              <button
                onClick={() => setSelectedBucket('ALL')}
                className="text-[10px] font-bold text-forest-700 hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {filteredList.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
              No members in this risk bucket.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto rounded-xl border border-slate-100">
              {filteredList.map((m) => {
                return (
                  <div
                    key={m.memberId}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{m.memberName}</strong>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            m.riskLevel === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : m.riskLevel === 'MODERATE'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.unpaidCount} Month{m.unpaidCount > 1 ? 's' : ''} Due
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {m.groupName} &bull; {m.phone}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <strong className="text-slate-800 font-extrabold text-sm">
                        {formatINR(m.pendingAmount)}
                      </strong>

                      {m.phone && (
                        <a
                          href={`tel:${m.phone}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition-colors"
                          title="Call member directly"
                        >
                          <Phone className="w-3 h-3 text-slate-600" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

