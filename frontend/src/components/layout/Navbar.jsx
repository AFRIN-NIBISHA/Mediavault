import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  UploadCloud,
  FolderPlus,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Download,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { usePwa } from '../../context/PwaContext';

export function Navbar({ onOpenSidebar, onOpenUpload, onOpenNewFolder }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isOnline, isInstallable, installApp } = usePwa();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/files?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white/75 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 flex items-center justify-between gap-4 transition-all">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100/80 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Apple-Grade Smart Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 sm:w-80 md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search files, photos, PDFs, docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-200/60 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition-all duration-200"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* New Folder Button - Secondary Clean White Card */}
        {onOpenNewFolder && (
          <button
            onClick={onOpenNewFolder}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/70 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 transition-all shadow-subtle active:scale-95 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-sky-600" />
            <span>New Folder</span>
          </button>
        )}

        {/* Primary Upload CTA - Soft Electric Cerulean to Iris Gradient */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium transition-all shadow-sm shadow-sky-600/20 active:scale-95 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload</span>
        </button>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            title="Install MediaVault as native Desktop/Mobile app"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-700 hover:opacity-95 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span className="hidden md:inline">Install App</span>
          </button>
        )}

        {/* Offline indicator only shown when network is offline */}
        {!isOnline && (
          <div
            title="Offline Mode Active - in-browser offline tools operational"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 text-xs font-bold"
          >
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200/70 bg-white shadow-subtle cursor-pointer"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user?.username?.[0] || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-52 py-1.5 bg-white/95 backdrop-blur-xl rounded-2xl shadow-apple border border-slate-200/80 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user?.profile?.fullName || user?.username}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profile Overview</span>
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Preferences & Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
