import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  LayoutDashboard,
  FolderLock,
  Files,
  Image,
  Wand2,
  Sparkles,
  Palette,
  FileText,
  Copy,
  Layers,
  History,
  HardDrive,
  Share2,
  Star,
  Clock,
  Trash2,
  FolderHeart,
  ShieldAlert,
  Moon,
  Sun,
  LogOut,
  RefreshCw,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatBytes } from '../../utils/formatters';

export function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const initialUsed = user?.storage?.total || 0;
  const initialLimit = user?.profile?.storageLimit || user?.storageLimit || 53687091200;
  const initialRawPct = (initialUsed / initialLimit) * 100;

  const [storageData, setStorageData] = useState({
    totalUsed: initialUsed,
    storageLimit: initialLimit,
    percentage: initialUsed > 0 && initialRawPct < 1 ? '<1' : Math.round(initialRawPct)
  });

  const fetchStorage = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data?.success && res.data?.stats) {
        const used = res.data.stats.storageUsed || 0;
        const limit = res.data.stats.storageLimit || 53687091200;
        const rawPct = (used / limit) * 100;
        const pct = used > 0 && rawPct < 1 ? '<1' : Math.round(rawPct);
        setStorageData({
          totalUsed: used,
          storageLimit: limit,
          percentage: pct
        });
      }
    } catch (err) {
      if (user?.storage?.total !== undefined) {
        const used = user.storage.total || 0;
        const limit = user.profile?.storageLimit || user.storageLimit || 53687091200;
        const rawPct = (used / limit) * 100;
        setStorageData({
          totalUsed: used,
          storageLimit: limit,
          percentage: used > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)
        });
      }
    }
  };

  useEffect(() => {
    if (user?.storage?.total !== undefined) {
      const used = user.storage.total || 0;
      const limit = user.profile?.storageLimit || user.storageLimit || 53687091200;
      const rawPct = (used / limit) * 100;
      setStorageData({
        totalUsed: used,
        storageLimit: limit,
        percentage: used > 0 && rawPct < 1 ? '<1' : Math.round(rawPct)
      });
    }
  }, [user]);

  useEffect(() => {
    fetchStorage();
    const handleUpdate = () => {
      fetchStorage();
      if (refreshUser) refreshUser();
    };
    window.addEventListener('files-uploaded', handleUpdate);
    window.addEventListener('file-deleted', handleUpdate);
    window.addEventListener('storage-updated', handleUpdate);
    return () => {
      window.removeEventListener('files-uploaded', handleUpdate);
      window.removeEventListener('file-deleted', handleUpdate);
      window.removeEventListener('storage-updated', handleUpdate);
    };
  }, [user?.id]);

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'All Files', icon: Files, path: '/files' },
    {
      label: 'Universal Converter',
      icon: RefreshCw,
      path: '/converter',
      badge: '11 Studios'
    },
    {
      label: 'AI Copilot Assistant',
      icon: Bot,
      path: '/assistant',
      badge: 'NEW'
    },
    {
      label: 'Photo Toolkit',
      icon: Image,
      path: '/photo-toolkit'
    },
    {
      label: 'AI Photo Studio',
      icon: Sparkles,
      path: '/ai-studio',
      badge: 'AI'
    },
    {
      label: 'Design Studio',
      icon: Palette,
      path: '/design-studio',
      badge: 'PRO'
    },
    {
      label: 'Image Editor Studio',
      icon: Wand2,
      path: '/image-editor'
    },
    {
      label: 'File Toolkit',
      icon: FileText,
      path: '/file-toolkit'
    },
    {
      label: 'PDF Tools',
      icon: Layers,
      path: '/pdf-tools'
    },
    {
      label: 'Bulk Processing',
      icon: Layers,
      path: '/bulk-processing'
    },
    {
      label: 'Duplicates',
      icon: Copy,
      path: '/duplicates'
    },
    {
      label: 'Collections',
      icon: FolderHeart,
      path: '/collections'
    },
    {
      label: 'Storage Analytics',
      icon: HardDrive,
      path: '/analytics'
    },
    {
      label: 'Shared Links',
      icon: Share2,
      path: '/shared'
    },
    {
      label: 'Favorites',
      icon: Star,
      path: '/favorites'
    },
    {
      label: 'Recent Assets',
      icon: Clock,
      path: '/recent'
    },
    {
      label: 'Version History',
      icon: History,
      path: '/version-history'
    },
    {
      label: 'Recycle Bin',
      icon: Trash2,
      path: '/trash'
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#F1F3F7]/95 backdrop-blur-2xl border-r border-slate-200/70 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Branding - MediaVault by Secure Hardline */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200/60">
          <NavLink to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30 group-hover:scale-105 transition-transform duration-200">
              <FolderLock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] tracking-tight text-slate-900 flex items-center gap-1.5 leading-tight">
                MediaVault
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-700 border border-sky-200/60">
                  v1.0
                </span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-normal leading-tight">
                by Secure Hardline
              </span>
            </div>
          </NavLink>
        </div>

        {/* Navigation items scrollable list */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <div className="px-3 pb-1 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-medium border border-sky-100/90 shadow-subtle'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`
                }
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-900" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200/60 shrink-0">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-3 space-y-1">
              <div className="px-3 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">
                  Administration
                </p>
              </div>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/60 shadow-subtle'
                      : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Admin Console</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Storage Usage Widget - Clean Apple Glass Card */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-subtle">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-sky-600" /> Storage
            </span>
            <span className="font-bold text-slate-800 text-[11px]">{storageData.percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                storageData.percentage > 90
                  ? 'bg-rose-500'
                  : storageData.percentage > 75
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
              style={{ width: `${storageData.totalUsed > 0 ? Math.max(2, storageData.percentage) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            {formatBytes(storageData.totalUsed)} of {formatBytes(storageData.storageLimit)} used
          </p>
        </div>

        {/* Footer User Info & Controls */}
        <div className="p-3 border-t border-slate-200/70 flex items-center justify-between bg-white/40">
          <NavLink
            to="/profile"
            className="flex items-center space-x-2.5 overflow-hidden group flex-1 hover:opacity-90"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
              {user?.username?.[0] || 'U'}
            </div>
            <div className="truncate text-left min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.profile?.fullName || user?.username}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
          </NavLink>

          <div className="flex items-center space-x-0.5 shrink-0">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
