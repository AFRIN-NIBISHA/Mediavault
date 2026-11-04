import React, { useState } from 'react';
import {
  Settings,
  User,
  Lock,
  Moon,
  Sun,
  Trash2,
  Save,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  // Profile Form
  const [fullName, setFullName] = useState(user?.profile?.fullName || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Trash Retention
  const [trashDays, setTrashDays] = useState(user?.profile?.autoEmptyTrashDays || 30);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        bio: bio.trim(),
        autoEmptyTrashDays: parseInt(trashDays, 10)
      });
      addToast('Profile preferences updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        addToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-500" />
          <span>Platform Settings & Preferences</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Manage your personal details, credentials, and interface customization.
        </p>
      </div>

      {/* 1. Profile Information */}
      <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <User className="w-4 h-4 text-brand-500" />
          <span>Profile Information</span>
        </h2>

        <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              Bio / Designation
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your work..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none focus:border-brand-500 h-20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              Recycle Bin Auto-Purge Schedule
            </label>
            <select
              value={trashDays}
              onChange={(e) => setTrashDays(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs"
            >
              <option value="7">Auto purge after 7 Days</option>
              <option value="14">Auto purge after 14 Days</option>
              <option value="30">Auto purge after 30 Days (Recommended)</option>
              <option value="60">Auto purge after 60 Days</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>

      {/* 2. Appearance & Theme */}
      <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
          {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
          <span>Interface Appearance</span>
        </h2>
        <p className="text-xs text-surface-500">
          Switch between clean SaaS light aesthetic and high-contrast dark workspace theme.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold flex items-center gap-2 hover:border-brand-500 shadow-subtle transition-all"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>Current: {theme === 'light' ? 'Light Theme' : 'Dark Theme'} (Click to toggle)</span>
          </button>
        </div>
      </div>

      {/* 3. Security & Password */}
      <div className="p-8 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
        <h2 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-500" />
          <span>Security & Password</span>
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{savingPassword ? 'Updating Password...' : 'Change Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

