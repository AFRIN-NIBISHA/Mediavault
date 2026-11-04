import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  HardDrive,
  Calendar,
  Settings,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBytes, formatDate } from '../utils/formatters';

export function UserProfilePage() {
  const { user } = useAuth();

  const totalUsed = user?.storage?.total || 0;
  const storageLimit = user?.profile?.storageLimit || 10737418240;
  const percentage = Math.min(100, Math.round((totalUsed / storageLimit) * 100));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <User className="w-6 h-6 text-brand-500" />
            <span>User Account Overview</span>
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Personal credentials, role access tier, and assigned storage quota.
          </p>
        </div>

        <Link
          to="/settings"
          className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 hover:text-brand-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Edit Profile & Preferences</span>
        </Link>
      </div>

      {/* Main Profile Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-6 border-b border-surface-200 dark:border-surface-800">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold uppercase shadow-lg shadow-brand-500/20">
            {user?.username?.[0] || 'U'}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                {user?.profile?.fullName || user?.username}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                user?.role === 'admin'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 border border-rose-200'
                  : 'bg-brand-100 dark:bg-brand-950 text-brand-700 border border-brand-200'
              }`}>
                {user?.role}
              </span>
            </div>
            <p className="text-xs text-surface-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user?.email}</span>
            </p>
            <p className="text-xs text-surface-400 mt-1">
              {user?.profile?.bio || 'Standard platform member'}
            </p>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-surface-700 dark:text-surface-300">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-brand-500" />
              <span>Storage Quota Consumption</span>
            </span>
            <span className="font-mono">{percentage}% Allocated</span>
          </div>

          <div className="w-full bg-surface-100 dark:bg-surface-800 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage > 90 ? 'bg-rose-500' : percentage > 75 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="text-xs text-surface-400">
            {formatBytes(totalUsed)} utilized of {formatBytes(storageLimit)} authorized quota.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-surface-200 dark:border-surface-800 text-xs">
          <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700/60 space-y-1">
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Security Profile</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> JWT Session Token Active
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200/60 dark:border-surface-700/60 space-y-1">
            <span className="text-surface-400 block uppercase font-semibold text-[10px]">Member Since</span>
            <span className="font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-surface-400" />
              {formatDate(user?.createdAt || new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

