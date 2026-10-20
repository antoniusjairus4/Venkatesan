import React, { useState, useEffect } from 'react';
import { Header } from './layout/Header';
import { BottomNav, NavTab } from './layout/BottomNav';
import { Sidebar } from './layout/Sidebar';
import { StatCards } from './dashboard/StatCards';
import { QuickActions } from './dashboard/QuickActions';
import { ChitFilterSelector } from './dashboard/ChitFilterSelector';
import { CollectionDonutChart } from './dashboard/CollectionDonutChart';
import { CashflowBarChart } from './dashboard/CashflowBarChart';
import { DefaulterAgingBuckets } from './dashboard/DefaulterAgingBuckets';
import { PendingCollectionsList } from './dashboard/PendingCollectionsList';
import { ActiveChitsOverview } from './dashboard/ActiveChitsOverview';
import { ChitGroupsView } from './views/ChitGroupsView';
import { MembersView } from './views/MembersView';
import { PaymentsView } from './views/PaymentsView';

import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { NewGroupModal } from './modals/NewGroupModal';
import { NewMemberModal } from './modals/NewMemberModal';
import {
  StatCardsSkeleton,
  CollectionDonutChartSkeleton,
  CashflowBarChartSkeleton,
  DefaulterAgingBucketsSkeleton,
  ActiveChitsOverviewSkeleton,
  PendingCollectionsListSkeleton,
  ChitGroupsOverviewSkeleton,
  MembersViewSkeleton,
  PaymentsViewSkeleton,
} from './common/Skeleton';

import {
  fetchDashboardSummary,
  fetchChitGroups,
  fetchMembers,
  fetchInstallments,
  fetchHealth,
  fetchAnalytics,
  DashboardSummary,
  AnalyticsData,
  ChitGroup,
  Member,
  Installment,
} from '@/lib/api';

interface AuthenticatedViewProps {
  onLogout: () => void;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedChitFilter, setSelectedChitFilter] = useState<string>('ALL');

  // Core Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  // Modals State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [targetMember, setTargetMember] = useState<Member | null>(null);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);

  const loadAllData = async () => {
    try {
      setLoadingData(true);
      const [sumData, grpData, memData, instData] = await Promise.all([
        fetchDashboardSummary().catch(() => null),
        fetchChitGroups().catch(() => []),
        fetchMembers().catch(() => []),
        fetchInstallments().catch(() => []),
      ]);

      if (sumData) setSummary(sumData);
      const sortedGroups = [...(grpData || [])].sort(
        (a, b) => Number(a.total_pot_value) - Number(b.total_pot_value)
      );
      setGroups(sortedGroups);
      setMembers(memData);
      setInstallments(instData);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAnalytics = async (filterId: string) => {
    try {
      setLoadingAnalytics(true);
      const data = await fetchAnalytics(filterId);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadAnalytics(selectedChitFilter);
  }, [selectedChitFilter]);

  const handleOpenPayment = (inst?: Installment, member?: Member) => {
    setSelectedInstallment(inst || null);
    setTargetMember(member || null);
    setIsPaymentModalOpen(true);
  };

  const pendingCount = installments.filter((i) => i.status !== 'PAID').length;

  const displayedInstallments =
    selectedChitFilter === 'ALL'
      ? installments
      : installments.filter((i) => i.chit_group_id === selectedChitFilter);

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      {/* Top Header */}
      <Header onLogout={onLogout} />

      <div className="flex-1 flex items-start w-full">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCount}
          onOpenRecordPayment={() => handleOpenPayment()}
        />

        {/* Main Content View Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* Dashboard Home View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Chit Filter Selector (All Chits or Any Single Chit) */}
              <ChitFilterSelector
                groups={groups}
                selectedGroupId={selectedChitFilter}
                onSelectGroup={(id) => setSelectedChitFilter(id)}
              />

              {/* Stat Cards */}
              {loadingData || !summary ? (
                <StatCardsSkeleton />
              ) : (
                <StatCards
                  summary={summary}
                  onFilterPending={() => setActiveTab('payments')}
                />
              )}

              {/* Mobile Quick Actions */}
              <QuickActions
                onOpenRecordPayment={() => handleOpenPayment()}
                onOpenNewMember={() => setIsNewMemberModalOpen(true)}
                onOpenNewGroup={() => setIsNewGroupModalOpen(true)}
              />

              {/* Visualizations Section: Charts 1 and 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Chart 1: Monthly Collection Health (Donut / Ring Chart) */}
                <div className="lg:col-span-5">
                  {loadingAnalytics || !analyticsData ? (
                    <CollectionDonutChartSkeleton />
                  ) : (
                    <CollectionDonutChart
                      collected={analyticsData.collection.collected}
                      pending={analyticsData.collection.pending}
                      percentage={analyticsData.collection.percentage}
                      title={
                        selectedChitFilter === 'ALL'
                          ? 'Monthly Collection Health (Consolidated)'
                          : 'Scheme Collection Health'
                      }
                    />
                  )}
                </div>

                {/* Chart 2: Cash Inflow vs. Winner Payouts (Dual Bar Chart) */}
                <div className="lg:col-span-7">
                  {loadingAnalytics || !analyticsData ? (
                    <CashflowBarChartSkeleton />
                  ) : (
                    <CashflowBarChart data={analyticsData.cashflow || []} />
                  )}
                </div>
              </div>

              {/* Chart 6: Defaulters Aging & Risk Buckets */}
              {loadingAnalytics || !analyticsData ? (
                <DefaulterAgingBucketsSkeleton />
              ) : (
                <DefaulterAgingBuckets
                  bucket1={analyticsData.defaulters.bucket1 || { count: 0, amount: 0 }}
                  bucket2={analyticsData.defaulters.bucket2 || { count: 0, amount: 0 }}
                  bucket3={analyticsData.defaulters.bucket3 || { count: 0, amount: 0 }}
                  defaultersList={analyticsData.defaulters.list || []}
                />
              )}

              {/* Schemes Overview & Urgent Collections */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Active Chits Overview */}
                <div className="lg:col-span-6 space-y-6">
                  {loadingData ? (
                    <ActiveChitsOverviewSkeleton />
                  ) : (
                    <ActiveChitsOverview
                      groups={groups}
                      onNewGroup={() => setIsNewGroupModalOpen(true)}
                      onSelectGroup={() => setActiveTab('chits')}
                    />
                  )}
                </div>

                {/* Right Column: Pending Collections with 1-Tap Actions */}
                <div className="lg:col-span-6 space-y-6">
                  {loadingData ? (
                    <PendingCollectionsListSkeleton />
                  ) : (
                    <PendingCollectionsList
                      installments={displayedInstallments}
                      onCollect={(inst) => handleOpenPayment(inst)}
                      onViewAll={() => setActiveTab('payments')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chit Groups View */}
          {activeTab === 'chits' && (
            loadingData ? (
              <ChitGroupsOverviewSkeleton />
            ) : (
              <ChitGroupsView
                groups={groups}
                onNewGroup={() => setIsNewGroupModalOpen(true)}
              />
            )
          )}

          {/* Members View */}
          {activeTab === 'members' && (
            loadingData ? (
              <MembersViewSkeleton />
            ) : (
              <MembersView
                members={members}
                installments={installments}
                onNewMember={() => setIsNewMemberModalOpen(true)}
                onRecordPayment={(member) => handleOpenPayment(undefined, member)}
              />
            )
          )}

          {/* Payments View */}
          {activeTab === 'payments' && (
            loadingData ? (
              <PaymentsViewSkeleton />
            ) : (
              <PaymentsView
                installments={installments}
                onRecordPayment={(inst) => handleOpenPayment(inst)}
              />
            )
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingCount={pendingCount}
      />

      {/* Modals */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedInstallment(null);
          setTargetMember(null);
        }}
        onSuccess={() => {
          loadAllData();
          loadAnalytics(selectedChitFilter);
        }}
        installments={installments}
        selectedInstallment={selectedInstallment}
        targetMember={targetMember}
      />

      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        onSuccess={() => {
          loadAllData();
          loadAnalytics(selectedChitFilter);
        }}
      />

      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={() => setIsNewMemberModalOpen(false)}
        onSuccess={() => {
          loadAllData();
          loadAnalytics(selectedChitFilter);
        }}
        groups={groups}
      />
    </div>
  );
};
