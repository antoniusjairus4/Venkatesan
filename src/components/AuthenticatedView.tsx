import React, { useState, useEffect } from 'react';
import { Header } from './layout/Header';
import { BottomNav, NavTab } from './layout/BottomNav';
import { Sidebar } from './layout/Sidebar';
import { StatCards } from './dashboard/StatCards';
import { QuickActions } from './dashboard/QuickActions';
import { PendingCollectionsList } from './dashboard/PendingCollectionsList';
import { ActiveChitsOverview } from './dashboard/ActiveChitsOverview';
import { ChitGroupsView } from './views/ChitGroupsView';
import { MembersView } from './views/MembersView';
import { PaymentsView } from './views/PaymentsView';
import { AuctionsView } from './views/AuctionsView';

import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { RecordAuctionModal } from './modals/RecordAuctionModal';
import { NewGroupModal } from './modals/NewGroupModal';
import { NewMemberModal } from './modals/NewMemberModal';

import {
  fetchDashboardSummary,
  fetchChitGroups,
  fetchMembers,
  fetchInstallments,
  fetchHealth,
  DashboardSummary,
  ChitGroup,
  Member,
  Installment,
} from '@/lib/api';

interface AuthenticatedViewProps {
  onLogout: () => void;
}

export const AuthenticatedView: React.FC<AuthenticatedViewProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  // Modals State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [isAuctionModalOpen, setIsAuctionModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);

  const loadAllData = async () => {
    setIsRefreshing(true);
    try {
      const health = await fetchHealth();
      if (health.status === 'ok') setDbStatus('connected');

      const [sumData, grpData, memData, instData] = await Promise.all([
        fetchDashboardSummary().catch(() => null),
        fetchChitGroups().catch(() => []),
        fetchMembers().catch(() => []),
        fetchInstallments().catch(() => []),
      ]);

      if (sumData) setSummary(sumData);
      setGroups(grpData);
      setMembers(memData);
      setInstallments(instData);
    } catch (err) {
      console.error('Failed to load portal data:', err);
      setDbStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenPayment = (inst?: Installment) => {
    setSelectedInstallment(inst || null);
    setIsPaymentModalOpen(true);
  };

  const pendingCount = installments.filter((i) => i.status !== 'PAID').length;

  return (
    <div className="min-h-screen flex flex-col pb-16 md:pb-0">
      {/* Top Header */}
      <Header onLogout={onLogout} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCount}
          onOpenRecordPayment={() => handleOpenPayment()}
          onOpenAuction={() => setIsAuctionModalOpen(true)}
        />

        {/* Main Content View Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
          {/* Dashboard Home View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <StatCards
                summary={summary}
                onFilterPending={() => setActiveTab('payments')}
              />

              {/* Mobile Quick Actions */}
              <QuickActions
                onOpenRecordPayment={() => handleOpenPayment()}
                onOpenNewMember={() => setIsNewMemberModalOpen(true)}
                onOpenNewGroup={() => setIsNewGroupModalOpen(true)}
              />

              {/* Multi-column Layout for Desktop / Stacked for Mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Active Chits Overview */}
                <div className="lg:col-span-6 space-y-6">
                  <ActiveChitsOverview
                    groups={groups}
                    onNewGroup={() => setIsNewGroupModalOpen(true)}
                    onSelectGroup={() => setActiveTab('chits')}
                  />
                </div>

                {/* Right Column: Pending Collections with 1-Tap WhatsApp */}
                <div className="lg:col-span-6 space-y-6">
                  <PendingCollectionsList
                    installments={installments}
                    onCollect={(inst) => handleOpenPayment(inst)}
                    onViewAll={() => setActiveTab('payments')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chit Groups View */}
          {activeTab === 'chits' && (
            <ChitGroupsView
              groups={groups}
              onNewGroup={() => setIsNewGroupModalOpen(true)}
            />
          )}

          {/* Members View */}
          {activeTab === 'members' && (
            <MembersView
              members={members}
              onNewMember={() => setIsNewMemberModalOpen(true)}
            />
          )}

          {/* Payments View */}
          {activeTab === 'payments' && (
            <PaymentsView
              installments={installments}
              onRecordPayment={(inst) => handleOpenPayment(inst)}
            />
          )}

          {/* Auctions View */}
          {activeTab === 'auctions' && (
            <AuctionsView
              onConductAuction={() => setIsAuctionModalOpen(true)}
            />
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
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={loadAllData}
        installments={installments}
        selectedInstallment={selectedInstallment}
      />

      <RecordAuctionModal
        isOpen={isAuctionModalOpen}
        onClose={() => setIsAuctionModalOpen(false)}
        onSuccess={loadAllData}
        groups={groups}
        members={members}
      />

      <NewGroupModal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        onSuccess={loadAllData}
      />

      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={() => setIsNewMemberModalOpen(false)}
        onSuccess={loadAllData}
      />
    </div>
  );
};
