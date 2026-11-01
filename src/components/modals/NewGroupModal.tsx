import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import { createChitGroup } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [totalPot, setTotalPot] = useState('100000');
  const [months, setMonths] = useState('20');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const potNum = Number(totalPot) || 0;
  const monthsNum = Number(months) || 20;
  const basePerMonth = monthsNum > 0 ? potNum / monthsNum : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || potNum <= 0 || monthsNum <= 0) {
      setError('Please provide a valid group name, pot value, and duration.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await createChitGroup({
        name: name.trim(),
        total_pot_value: potNum,
        total_months: monthsNum,
        start_date: startDate,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create chit group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-forest-700" />
            <h3 className="text-base font-bold text-slate-900">
              Create New Chit Group
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Chit Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 5 Lakhs Group B"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Total Pot Value (₹)
              </label>
              <input
                type="number"
                step="5000"
                min="10000"
                value={totalPot}
                onChange={(e) => setTotalPot(e.target.value)}
                placeholder="100000"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Duration (Months)
                </label>
                <span className="text-[10px] font-bold text-forest-700">
                  {monthsNum} Members
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="100"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="20"
                required
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-forest-700"
              />
            </div>
          </div>

          {/* Quick Duration Presets */}
          <div className="flex items-center gap-1.5 -mt-1">
            <span className="text-[10px] font-bold text-slate-400">Presets:</span>
            {['10', '12', '20', '25'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonths(m)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  months === m
                    ? 'bg-forest-700 text-white border-forest-700 shadow-2xs'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>

          {/* Computed Base summary */}
          <div className="p-3 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Base Installment / Month:</span>
            <span className="font-extrabold text-forest-800">{formatINR(basePerMonth)}</span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              When Chit Starts / தொடங்கும் தேதி (Start Date)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700 font-medium"
            />
            {startDate && (
              <p className="text-[10px] text-forest-700 mt-1 font-semibold">
                ✓ Scheme commences on {new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} for {monthsNum} months ({monthsNum} members)
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 20 shares, 20 months duration"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-forest-700"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Creating Group...' : 'Create Chit Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

