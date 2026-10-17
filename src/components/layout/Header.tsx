import React from 'react';
import { LogOut, Database, UserCheck, RefreshCw } from 'lucide-react';
import { clearSession } from '@/lib/auth';

interface HeaderProps {
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  dbStatus: 'connected' | 'checking' | 'error';
}

export const Header: React.FC<HeaderProps> = ({
  onLogout,
  onRefresh,
  isRefreshing,
  dbStatus,
}) => {
  const handleLogout = () => {
    clearSession();
    onLogout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/logo-transparent.png"
            alt="Rajamanickam Chit Fund"
            className="h-10 sm:h-12 w-auto object-contain"
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

        {/* Action Controls & Admin Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Neon Database Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700">
            <Database className="w-3.5 h-3.5 text-forest-700" />
            <span className="hidden sm:inline">Neon DB:</span>
            {dbStatus === 'connected' && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            )}
            {dbStatus === 'checking' && <span className="text-slate-500">Checking...</span>}
            {dbStatus === 'error' && <span className="text-red-600 font-semibold">Offline</span>}
          </div>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Sync Database"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-forest-700' : ''}`} />
          </button>

          {/* Admin Profile Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-xs font-semibold text-forest-800">
            <UserCheck className="w-3.5 h-3.5 text-forest-700" />
            <span>Venkatesan</span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

