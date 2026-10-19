import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Calendar,
  IndianRupee,
  ArrowLeft,
  ArrowRight,
  Phone,
  MessageSquare,
  MapPin,
  Award,
  CheckCircle2,
  Search,
  Users,
  Layers,
  Sparkles,
  Ticket,
  Repeat,
  X,
} from 'lucide-react';
import { ChitGroup, GroupSubscriber, fetchGroupSubscribers } from '@/lib/api';
import {
  formatINR,
  createEnrollmentSmsUrl,
  createTakeoverSmsUrl,
  createSettlementSmsUrl,
} from '@/lib/sms';
import { Skeleton } from '@/components/common/Skeleton';

interface ChitGroupsViewProps {
  groups: ChitGroup[];
  onNewGroup: () => void;
}

export const ChitGroupsView: React.FC<ChitGroupsViewProps> = ({
  groups,
  onNewGroup,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<ChitGroup | null>(null);
  const [subscribers, setSubscribers] = useState<GroupSubscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRIZED' | 'ACTIVE'>('ALL');
  const [transferSub, setTransferSub] = useState<GroupSubscriber | null>(null);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newBuyerPhone, setNewBuyerPhone] = useState('');

  // Load subscribers when a group is selected
  useEffect(() => {
    if (!selectedGroup) {
      setSubscribers([]);
      return;
    }

    let isMounted = true;
    setLoadingSubscribers(true);
    setSearchQuery('');
    setStatusFilter('ALL');

    fetchGroupSubscribers(selectedGroup.id)
      .then((data) => {
        if (isMounted) {
          setSubscribers(data);
          setLoadingSubscribers(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load group subscribers:', err);
        if (isMounted) setLoadingSubscribers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGroup]);

  // Filter subscribers based on search and status
  const filteredSubscribers = subscribers.filter((sub) => {
    // Status filter
    if (statusFilter === 'PRIZED' && !sub.is_prized_winner) return false;
    if (statusFilter === 'ACTIVE' && sub.is_prized_winner) return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = sub.member_name.toLowerCase().includes(q);
    const phoneMatch = sub.phone?.includes(q);
    const addressMatch = sub.address?.toLowerCase().includes(q);
    const ticketMatch = sub.ticket_numbers?.some((t) => String(t).includes(q));

    return nameMatch || phoneMatch || addressMatch || ticketMatch;
  });

  // Calculate scheme subscriber metrics
  const totalSubscribers = subscribers.length;
  const totalSharesTaken = subscribers.reduce((acc, s) => acc + (s.shares_count || 1), 0);
  const prizedCount = subscribers.filter((s) => s.is_prized_winner).length;
  const activeCount = totalSubscribers - prizedCount;

  // ---------------------------------------------------------------------------
  // View 1: Group Subscribers Drill-Down View
  // ---------------------------------------------------------------------------
  if (selectedGroup) {
    const pot = Number(selectedGroup.total_pot_value);
    const months = Number(selectedGroup.total_months);
    const base = Number(selectedGroup.installment_base_amount);
    const maxShares = Number(selectedGroup.total_shares);

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Top Navigation & Scheme Quick-Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="flex items-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Chit Schemes</span>
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">
              Viewing Group Roster
            </span>
          </div>

          {/* Quick Switcher Pills for all groups */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-slate-400 mr-1 hidden md:inline">
              Switch Scheme:
            </span>
            {groups.map((g) => {
              const isActive = g.id === selectedGroup.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-forest-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scheme Summary Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-forest-200 p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-forest-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {selectedGroup.name}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    selectedGroup.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {selectedGroup.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Started on {new Date(selectedGroup.start_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
                {selectedGroup.notes && (
                  <span className="italic text-slate-400">
                    &bull; &ldquo;{selectedGroup.notes}&rdquo;
                  </span>
                )}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-forest-50/80 p-3 rounded-xl border border-forest-100">
              <div>
                <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                  Pot Value
                </span>
                <span className="text-base sm:text-lg font-black text-forest-900">
                  {formatINR(pot)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                  Monthly Base
                </span>
                <span className="text-base sm:text-lg font-bold text-forest-900">
                  {formatINR(base)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                  Duration
                </span>
                <span className="text-base sm:text-lg font-bold text-forest-900">
                  {months} Months
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                  Shares Enrolled
                </span>
                <span className="text-base sm:text-lg font-black text-forest-900">
                  {totalSharesTaken} / {maxShares}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter & Subscriber Count Controls */}
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by member name, phone, ticket #, or town..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Subscribers ({totalSubscribers})
              </button>

              <button
                onClick={() => setStatusFilter('PRIZED')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'PRIZED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Yelam Winners ({prizedCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Bidders ({activeCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Subscribers Grid / List */}
        {loadingSubscribers ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" aria-busy="true" aria-label="Loading subscribers">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-2.5 w-20 rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>

                <div className="p-2.5 bg-slate-50/70 rounded-xl space-y-2 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-24 rounded" />
                    <Skeleton className="h-3 w-12 rounded" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <Skeleton className="h-2 w-14 rounded" />
                    <Skeleton className="h-3.5 w-16 rounded" />
                  </div>
                  <div>
                    <Skeleton className="h-2 w-14 rounded" />
                    <Skeleton className="h-3.5 w-16 rounded" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                  <Skeleton className="h-8 flex-1 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              No Subscribers Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No subscribers match your search "${searchQuery}". Try a different name or ticket number.`
                : 'No members are enrolled in this chit group yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSubscribers.map((sub) => {
              const initials = sub.member_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const cleanPhone = sub.whatsapp_phone || sub.phone;
              const pendingAmt = Number(sub.total_pending || 0);
              const paidAmt = Number(sub.total_paid || 0);

              return (
                <div
                  key={sub.member_id}
                  className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 hover:border-forest-300 p-4 shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Member Avatar & Names */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-forest-50 border border-forest-200/80 text-forest-800 font-black text-sm flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {sub.member_name}
                          </h3>
                          {sub.address ? (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {sub.address}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              Phone: {sub.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prize Status Badge */}
                      {sub.is_prized_winner ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-700" />
                          <span>M{sub.prized_month_number} Won</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Tickets & Shares Held in THIS Group */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <Ticket className="w-3 h-3 text-forest-600" />
                          Tickets in {selectedGroup.name}
                        </span>
                        <span className="text-xs font-extrabold text-forest-900">
                          {sub.shares_count} {sub.shares_count === 1 ? 'Share' : 'Shares'}
                        </span>
                      </div>

                      {/* Ticket Number Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {sub.ticket_numbers?.map((num) => (
                          <span
                            key={num}
                            className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-forest-100 text-forest-900 border border-forest-200/80 shadow-2xs"
                          >
                            Ticket #{num}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Financial Snapshot */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Paid in Group
                        </span>
                        <strong className="text-emerald-700 font-bold">
                          {formatINR(paidAmt)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          Pending Due
                        </span>
                        <strong
                          className={
                            pendingAmt > 0
                              ? 'text-amber-700 font-bold'
                              : 'text-slate-500 font-medium'
                          }
                        >
                          {pendingAmt > 0 ? formatINR(pendingAmt) : '₹0 (Clear)'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Takeover Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                    <a
                      href={`tel:${sub.phone}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-all"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Call</span>
                    </a>

                    <a
                      href={
                        selectedGroup.status === 'COMPLETED'
                          ? createSettlementSmsUrl({
                              phone: sub.phone,
                              memberName: sub.member_name,
                              groupName: selectedGroup.name,
                              totalPaid: Number(sub.total_paid || 0),
                              totalDividends: Number(selectedGroup.total_pot_value) * 0.1,
                              totalPotValue: Number(selectedGroup.total_pot_value),
                            })
                          : createEnrollmentSmsUrl({
                              phone: sub.phone,
                              memberName: sub.member_name,
                              groupName: selectedGroup.name,
                              potValue: Number(selectedGroup.total_pot_value),
                              baseAmount: Number(selectedGroup.installment_base_amount),
                              startDate: new Date(selectedGroup.start_date).toLocaleDateString('en-IN'),
                            })
                      }
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-forest-700 hover:bg-forest-800 text-white font-bold text-[11px] rounded-xl transition-all shadow-xs"
                      title="Open mobile native SMS messaging app"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{selectedGroup.status === 'COMPLETED' ? 'Settlement SMS' : 'SMS'}</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setTransferSub(sub);
                        setNewBuyerName('');
                        setNewBuyerPhone('');
                      }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                      title="Transfer / Takeover chit share to new buyer"
                    >
                      <Repeat className="w-3.5 h-3.5 text-amber-700" />
                      <span>Takeover</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chit Takeover Modal (Sent only to New Buyer) */}
        {transferSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Chit Share Takeover (New Buyer)
                  </h3>
                </div>
                <button
                  onClick={() => setTransferSub(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
                <p className="text-slate-500">
                  Current Share Owner: <strong className="text-slate-800">{transferSub.member_name}</strong>
                </p>
                <p className="text-slate-500">
                  Chit Scheme: <strong className="text-forest-800">{selectedGroup.name}</strong>
                </p>
                <p className="text-slate-500">
                  Cumulative Paid Balance Credited: <strong className="text-emerald-700">{formatINR(Number(transferSub.total_paid || 0))}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Buyer Full Name
                  </label>
                  <input
                    type="text"
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    placeholder="Enter new buyer's name..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    New Buyer Mobile Phone
                  </label>
                  <input
                    type="tel"
                    value={newBuyerPhone}
                    onChange={(e) => setNewBuyerPhone(e.target.value)}
                    placeholder="e.g. 9842100000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-forest-700"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                {newBuyerName.trim() && newBuyerPhone.trim() ? (
                  <a
                    href={createTakeoverSmsUrl({
                      phone: newBuyerPhone,
                      newBuyerName: newBuyerName.trim(),
                      groupName: selectedGroup.name,
                      previousMemberName: transferSub.member_name,
                      completedMonths: 1,
                      totalPreviouslyPaid: Number(transferSub.total_paid || 0),
                      nextMonthNumber: 2,
                    })}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-forest-700 hover:bg-forest-800 active:bg-forest-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Takeover SMS to New Buyer</span>
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full py-3 px-4 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed"
                  >
                    Enter New Buyer Name &amp; Phone to Send SMS
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setTransferSub(null)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // View 2: All Chit Schemes Overview (Clickable Cards)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Chit Schemes & Groups
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any chit group card below to view its enrolled subscribers and ticket details
          </p>
        </div>

        <button
          onClick={onNewGroup}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-700 hover:bg-forest-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Chit Group</span>
        </button>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {groups.map((group) => {
          const pot = Number(group.total_pot_value);
          const months = Number(group.total_months);
          const base = Number(group.installment_base_amount);
          const enrolled = Number(group.enrolled_shares || 0);

          return (
            <div
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className="group bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 hover:border-forest-500 hover:shadow-md p-4 shadow-xs transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-forest-800 transition-colors">
                      {group.name}
                    </h3>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      Starts: {new Date(group.start_date).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      group.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {group.status}
                  </span>
                </div>

                <div className="my-3 p-3 rounded-xl bg-forest-50/60 border border-forest-100 group-hover:bg-forest-50 group-hover:border-forest-200 transition-all">
                  <span className="text-[10px] font-bold text-forest-700 uppercase tracking-wider block">
                    Total Pot Value
                  </span>
                  <span className="text-xl font-extrabold text-forest-900">
                    {formatINR(pot)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                    <strong className="text-slate-800">{months} Months</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base Monthly</span>
                    <strong className="text-slate-800">{formatINR(base)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Commission</span>
                    <strong className="text-slate-800">{group.commission_percent || 5}%</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Shares Assigned</span>
                    <strong className="text-slate-800">
                      {enrolled} / {group.total_shares}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                {group.notes && (
                  <p className="text-[11px] text-slate-500 italic pb-2.5 mb-2 border-b border-slate-100">
                    &ldquo;{group.notes}&rdquo;
                  </p>
                )}

                {/* View Subscribers Click Button */}
                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-xl bg-forest-50 group-hover:bg-forest-700 text-forest-800 group-hover:text-white text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>View Subscribers ({enrolled} Enrolled)</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
