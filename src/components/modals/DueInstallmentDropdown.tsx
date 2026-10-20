import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, CheckCircle2, User } from 'lucide-react';
import { Installment } from '@/lib/api';
import { formatINR } from '@/lib/whatsapp';

interface DueInstallmentDropdownProps {
  installments: Installment[];
  selectedId: string;
  onSelect: (installment: Installment) => void;
  disabled?: boolean;
}

export const DueInstallmentDropdown: React.FC<DueInstallmentDropdownProps> = ({
  installments,
  selectedId,
  onSelect,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'pending' | 'all' | 'settled'>('pending');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const currentInst = useMemo(
    () => installments.find((i) => i.id === selectedId),
    [installments, selectedId]
  );

  // Calculate pending and settled counts
  const pendingCount = useMemo(
    () => installments.filter((i) => Number(i.net_due_amount) - Number(i.paid_amount) > 0).length,
    [installments]
  );
  const settledCount = installments.length - pendingCount;

  // Filtered and searched list
  const filteredInstallments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return installments.filter((i) => {
      const rem = Number(i.net_due_amount) - Number(i.paid_amount);
      const isPending = rem > 0;

      // Filter tab check
      if (filterTab === 'pending' && !isPending) return false;
      if (filterTab === 'settled' && isPending) return false;

      // Search query check
      if (!query) return true;

      const nameMatch = (i.member_name || '').toLowerCase().includes(query);
      const groupMatch = (i.group_name || '').toLowerCase().includes(query);
      const ticketMatch =
        String(i.share_ticket_number || '').includes(query) ||
        `#${i.share_ticket_number}`.includes(query);
      const phoneMatch = (i.member_phone || '').includes(query);
      const monthMatch =
        `m${i.month_number}`.includes(query) || `month ${i.month_number}`.includes(query);

      return nameMatch || groupMatch || ticketMatch || phoneMatch || monthMatch;
    });
  }, [installments, searchQuery, filterTab]);

  const getInitials = (name?: string) => {
    if (!name) return 'M';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getSchemeColor = (groupName?: string) => {
    const name = (groupName || '').toLowerCase();
    if (name.includes('1 lakh') || name.includes('1l')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
    }
    if (name.includes('2 lakh') || name.includes('2l')) {
      return 'bg-sky-50 text-sky-800 border-sky-200/90';
    }
    if (name.includes('3 lakh') || name.includes('3l')) {
      return 'bg-purple-50 text-purple-800 border-purple-200/90';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const currentRem = currentInst
    ? Number(currentInst.net_due_amount) - Number(currentInst.paid_amount)
    : 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full text-left p-2.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer group ${
          isOpen
            ? 'bg-white border-forest-600 ring-2 ring-forest-500/20 shadow-md'
            : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {currentInst ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Avatar Initials */}
            <div className="w-10 h-10 rounded-xl bg-forest-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ring-2 ring-forest-100">
              {getInitials(currentInst.member_name)}
            </div>

            {/* Member and Chit Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-sm truncate">
                  {currentInst.member_name}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getSchemeColor(
                    currentInst.group_name
                  )}`}
                >
                  {currentInst.group_name}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span>Month {currentInst.month_number}</span>
                <span>&bull;</span>
                <span className="font-semibold text-slate-700">
                  Ticket #{currentInst.share_ticket_number}
                </span>
              </p>
            </div>

            {/* Due Badge */}
            <div className="shrink-0 text-right">
              {currentRem > 0 ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 text-xs font-bold shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{formatINR(currentRem)} Due</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/90 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settled (₹0)</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-400 py-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-xs font-medium">Select a due installment...</span>
          </div>
        )}

        {/* Chevron Icon */}
        <div className="shrink-0 pl-1">
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-forest-700' : 'group-hover:text-slate-600'
            }`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 bg-slate-50/90 border-b border-slate-100 space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, ticket #, or scheme..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Segment Filter Tabs */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setFilterTab('pending')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterTab === 'pending'
                    ? 'bg-amber-100/90 text-amber-900 shadow-2xs font-extrabold border border-amber-300/80'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Pending Dues ({pendingCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-forest-700 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                All ({installments.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('settled')}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  filterTab === 'settled'
                    ? 'bg-emerald-700 text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                Settled ({settledCount})
              </button>
            </div>
          </div>

          {/* List Options */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
            {filteredInstallments.length > 0 ? (
              filteredInstallments.map((inst) => {
                const rem = Number(inst.net_due_amount) - Number(inst.paid_amount);
                const isSelected = inst.id === selectedId;
                const isPending = rem > 0;

                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => {
                      onSelect(inst);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-forest-50/80 border-l-4 border-l-forest-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Initials */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-105 ${
                          isPending
                            ? 'bg-forest-100 text-forest-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {getInitials(inst.member_name)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected
                                ? 'text-forest-900'
                                : 'text-slate-800 group-hover:text-slate-900'
                            }`}
                          >
                            {inst.member_name}
                          </span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getSchemeColor(
                              inst.group_name
                            )}`}
                          >
                            {inst.group_name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Month {inst.month_number} &bull; Ticket #{inst.share_ticket_number}
                        </p>
                      </div>
                    </div>

                    {/* Amount & Status */}
                    <div className="shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        {isPending ? (
                          <span className="inline-block text-xs font-extrabold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/60">
                            {formatINR(rem)}
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                            ₹0 Paid
                          </span>
                        )}
                      </div>

                      {/* Selection Checkmark */}
                      <div className="w-5 flex items-center justify-center">
                        {isSelected && <Check className="w-4 h-4 text-forest-700" />}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No installments found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Try searching with a different name, scheme, or ticket number.
                </p>
                {(searchQuery || filterTab !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterTab('all');
                    }}
                    className="mt-3 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Showing {filteredInstallments.length} of {installments.length} records
            </span>
            <span className="hidden sm:inline">Press ESC to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
