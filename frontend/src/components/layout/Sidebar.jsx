import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ChevronRight,
  RefreshCw,
  Bot
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatBytes } from '../../utils/formatters';

export function Sidebar({ isOpen, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const totalUsed = user?.storage?.total || 0;
  const storageLimit = user?.profile?.storageLimit || 10737418240;
  const percentage = Math.min(100, Math.round((totalUsed / storageLimit) * 100));

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
      label: 'Favourites',
      icon: Star,
      path: '/favourites'
    },
    {
      label: 'Recent Files',
      icon: Clock,
      path: '/recent'
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
          className="fixed inset-0 z-40 bg-surface-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo Branding */}
        <div className="h-16 flex items-center px-6 border-b border-surface-200 dark:border-surface-800">
          <NavLink to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 group-hover:scale-105 transition-transform">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-surface-900 dark:text-white flex items-center gap-1.5">
                MediaVault
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                  v1.0
                </span>
              </span>
            </div>
          </NavLink>
        </div>

        {/* Navigation items scrollable list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
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
                  `flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-sm'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800/60 hover:text-surface-900 dark:hover:text-surface-100'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-4 space-y-1">
              <div className="px-3 pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">
                  Administration
                </p>
              </div>
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800/60 hover:text-surface-900 dark:hover:text-surface-100'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Admin Console</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Storage Usage Widget */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/80 dark:border-surface-700/60">
          <div className="flex items-center justify-between text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-brand-500" /> Storage
            </span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage > 90 ? 'bg-rose-500' : percentage > 75 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-[11px] text-surface-500 dark:text-surface-400">
            {formatBytes(totalUsed)} of {formatBytes(storageLimit)} used
          </p>
        </div>

        {/* Footer User Info & Controls */}
        <div className="p-3 border-t border-surface-200 dark:border-surface-800 flex items-center justify-between">
          <NavLink
            to="/profile"
            className="flex items-center space-x-2.5 overflow-hidden group flex-1 hover:opacity-90"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
              {user?.username?.[0] || 'U'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                {user?.profile?.fullName || user?.username}
              </p>
              <p className="text-[11px] text-surface-500 dark:text-surface-400 truncate">
                {user?.email}
              </p>
            </div>
          </NavLink>

          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

