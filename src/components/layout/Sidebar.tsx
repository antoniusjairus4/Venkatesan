import React from 'react';
import {
  Home,
  Layers,
  Users,
  CreditCard,
  Hammer,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import { NavTab } from './BottomNav';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingCount?: number;
  onOpenRecordPayment: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
  onOpenRecordPayment,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard Overview', icon: Home },
    { id: 'chits' as NavTab, label: 'Chit Groups', icon: Layers },
    { id: 'members' as NavTab, label: 'Member Directory', icon: Users },
    {
      id: 'payments' as NavTab,
      label: 'Monthly Payments',
      icon: CreditCard,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'auctions' as NavTab, label: 'Auction Records', icon: Hammer },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/95 backdrop-blur-md border-r border-slate-200/80 p-4 shrink-0 shadow-xs min-h-[calc(100vh-61px)]">
      {/* Quick Action Shortcuts */}
      <div className="mb-6">
        <button
          onClick={onOpenRecordPayment}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-forest-700 hover:bg-forest-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1.5 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-forest-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? 'bg-white text-forest-700'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security Status Box */}
      <div className="pt-4 border-t border-slate-100 mt-auto">
        <div className="p-3 rounded-xl bg-forest-50/70 border border-forest-100">
          <div className="flex items-center gap-2 text-forest-800 text-xs font-bold mb-1">
            <ShieldCheck className="w-4 h-4 text-forest-700" />
            <span>Admin Active</span>
          </div>
          <p className="text-[11px] text-forest-700/80 leading-snug">
            Single Admin Mode: Venkatesan. Cryptographically signed session.
          </p>
        </div>
      </div>
    </aside>
  );
};
