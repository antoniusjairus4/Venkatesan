import React from 'react';
import { LogOut } from 'lucide-react';
import { clearSession } from '@/lib/auth';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 transition-all shadow-xs flex items-center">
      <div className="w-full flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/logo-transparent.png"
            alt="Rajamanickam Chit Fund"
            className="h-10 sm:h-11 w-auto object-contain"
          />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-forest-900 tracking-tight leading-tight">
              RAJAMANICKAM CHIT FUND
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-gold-600 font-semibold">
              Admin Portal &bull; Salem
            </p>
          </div>
        </div>

        {/* Only Sign Out Button */}
        <div className="flex items-center">
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 active:bg-red-100 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
