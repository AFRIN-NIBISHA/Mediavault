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
  Wifi,
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
    <header className="h-16 px-4 sm:px-6 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800 sticky top-0 z-30 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-xl text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Smart Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative w-64 sm:w-80 md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search files, photos, PDFs, docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-100 dark:bg-surface-800/70 border border-transparent focus:border-brand-500 rounded-xl text-xs sm:text-sm text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* New Folder Button */}
        {onOpenNewFolder && (
          <button
            onClick={onOpenNewFolder}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-xs sm:text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-subtle"
          >
            <FolderPlus className="w-4 h-4 text-brand-500" />
            <span>New Folder</span>
          </button>
        )}

        {/* Quick Upload Action */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium transition-all shadow-sm active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload</span>
        </button>

        {/* PWA Install Button */}
        {isInstallable && (
          <button
            onClick={installApp}
            title="Install MediaVault as native Desktop/Mobile app"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span className="hidden md:inline">Install App</span>
          </button>
        )}

        {/* Offline indicator only shown when network is offline */}
        {!isOnline && (
          <div
            title="Offline Mode Active - in-browser offline tools operational"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold"
          >
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-subtle"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-purple-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-violet-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user?.username?.[0] || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-surface-400 hidden sm:block" />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-48 py-1.5 bg-white dark:bg-surface-900 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-800 z-30 animate-scaleUp">
                <div className="px-4 py-2 border-b border-surface-100 dark:border-surface-800">
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                    {user?.profile?.fullName || user?.username}
                  </p>
                  <p className="text-[11px] text-surface-400 truncate">{user?.email}</p>
                </div>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 text-left transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-surface-500" />
                  <span>Profile Overview</span>
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 text-left transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-surface-500" />
                  <span>Preferences & Settings</span>
                </button>

                <div className="my-1 border-t border-surface-100 dark:border-surface-800" />

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

