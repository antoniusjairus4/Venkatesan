import React from 'react';
import { Home, Layers, Users, CreditCard, Hammer } from 'lucide-react';

export type NavTab = 'dashboard' | 'chits' | 'members' | 'payments' | 'auctions';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Home', icon: Home },
    { id: 'chits' as NavTab, label: 'Chits', icon: Layers },
    { id: 'members' as NavTab, label: 'Members', icon: Users },
    {
      id: 'payments' as NavTab,
      label: 'Payments',
      icon: CreditCard,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { id: 'auctions' as NavTab, label: 'Yelam', icon: Hammer },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-lg px-2 py-1.5 safe-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'text-forest-700 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[9px] font-bold text-white bg-amber-600 rounded-full animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

