import React, { useState } from 'react';
import { usePwa } from '../../context/PwaContext';
import { WifiOff, Download, Sparkles, X, RefreshCw, Smartphone, Laptop, Check } from 'lucide-react';

export function PwaStatusBanner() {
  const { isOnline, isInstallable, isInstalled, installApp, hasUpdate, updateApp } = usePwa();
  const [installDismissed, setInstallDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('pwa_install_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await installApp();
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setInstallDismissed(true);
    try {
      sessionStorage.setItem('pwa_install_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  return (
    <>
      {/* 1. Offline Mode Alert Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-4 py-2.5 text-xs font-semibold shadow-md flex items-center justify-between sticky top-0 z-50 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 max-w-5xl mx-auto flex-1">
            <span className="p-1 rounded-lg bg-black/20 flex items-center justify-center">
              <WifiOff className="w-4 h-4 animate-pulse text-amber-200" />
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold tracking-wide uppercase bg-black/20 px-2 py-0.5 rounded-full text-[10px]">
                Offline Mode Active
              </span>
              <span>
                You are currently offline without internet. In-browser Offline Studio, Image Filters, Transparent Sticker Maker & Local Tools remain fully functional!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Update Available Banner */}
      {hasUpdate && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 text-xs font-semibold shadow-md flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-5xl mx-auto flex-1">
            <Sparkles className="w-4 h-4 text-purple-200 animate-spin" />
            <span>A new offline update of MediaVault is available!</span>
            <button
              onClick={updateApp}
              className="ml-auto px-3 py-1 bg-white text-purple-700 hover:bg-purple-50 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Update & Reload</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Install PWA Floating Prompt */}
      {isInstallable && !isInstalled && !installDismissed && (
        <div className="fixed bottom-6 left-4 sm:left-6 lg:left-72 z-30 max-w-sm w-auto bg-white dark:bg-surface-900 border border-purple-200 dark:border-purple-800/50 rounded-3xl p-4 shadow-2xl shadow-purple-950/20 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30 shrink-0">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-surface-900 dark:text-surface-100 truncate">
                  Install MediaVault App
                </h4>
                <p className="text-[11px] text-surface-500 line-clamp-2">
                  Runs natively on Desktop & Mobile with 100% offline access
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? 'Installing...' : 'Install App (PWA)'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-2 px-3 text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}

