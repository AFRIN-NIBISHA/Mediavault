import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  HardDrive,
  Files,
  Share2,
  Activity,
  CheckCircle,
  XCircle,
  Edit,
  Lock,
  Search
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime, formatDate } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'users' | 'shares' | 'logs'
  const [adminTab, setAdminTab] = useState('users');

  // Quota Modal
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newQuotaGb, setNewQuotaGb] = useState('10');

  const { addToast } = useToast();

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, uRes, shRes, lRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/shares'),
        api.get('/admin/logs')
      ]);

      if (sRes.data.success) setStats(sRes.data.stats);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (shRes.data.success) setShares(shRes.data.shares);
      if (lRes.data.success) setLogs(lRes.data.logs);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load administrative console', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (user) => {
    try {
      const res = await api.put(`/admin/users/${user.id}/status`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        loadAdminData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to toggle status', 'error');
    }
  };

  const handleUpdateQuotaSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;

    try {
      const bytes = Math.round(parseFloat(newQuotaGb) * 1024 * 1024 * 1024);
      const res = await api.put(`/admin/users/${targetUser.id}/quota`, { storageLimitBytes: bytes });
      if (res.data.success) {
        addToast('Storage quota updated', 'success');
        setQuotaModalOpen(false);
        loadAdminData();
      }
    } catch (err) {
      addToast('Failed to update quota', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          <span>System Administration & Platform Governance</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Manage system-wide storage consumption, account authorizations, shared link audits, and platform activity logs.
        </p>
      </div>

      {/* Top 4 System Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Users</span>
            <Users className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-2">
            {stats?.totalUsers || 0}
          </p>
          <p className="text-xs text-emerald-500 mt-1">{stats?.activeUsers || 0} active accounts</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stored Files</span>
            <Files className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-2">
            {stats?.totalFiles || 0}
          </p>
          <p className="text-xs text-surface-400 mt-1">across all user vaults</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Platform Storage</span>
            <HardDrive className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-2">
            {formatBytes(stats?.totalStorageBytes || 0)}
          </p>
          <p className="text-xs text-surface-400 mt-1">PostgreSQL managed volume</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Shares</span>
            <Share2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-2">
            {stats?.activeShares || 0}
          </p>
          <p className="text-xs text-surface-400 mt-1">{stats?.totalDownloads || 0} downloads recorded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 pb-2">
        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            adminTab === 'users' ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
          }`}
        >
          User Account Governance ({users.length})
        </button>
        <button
          onClick={() => setAdminTab('shares')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            adminTab === 'shares' ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
          }`}
        >
          Shared Links Monitor ({shares.length})
        </button>
        <button
          onClick={() => setAdminTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            adminTab === 'logs' ? 'bg-brand-600 text-white shadow-sm' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'
          }`}
        >
          System Audit Logs ({logs.length})
        </button>
      </div>

      {/* Tab 1: Users Governance */}
      {adminTab === 'users' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
              Registered Accounts & Quota Administration
            </h3>
            <p className="text-xs text-surface-400 italic">
              User files remain cryptographically isolated and private.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Files</th>
                  <th className="p-3">Storage Used</th>
                  <th className="p-3">Quota Limit</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <td className="p-3">
                      <p className="font-semibold text-surface-900 dark:text-surface-100">{u.full_name || u.username}</p>
                      <p className="text-[10px] text-surface-400">{u.email}</p>
                    </td>

                    <td className="p-3 uppercase text-[10px] font-bold">
                      <span className={u.role === 'admin' ? 'text-rose-500' : 'text-brand-500'}>
                        {u.role}
                      </span>
                    </td>

                    <td className="p-3 font-semibold text-surface-700 dark:text-surface-300">
                      {u.file_count || 0}
                    </td>

                    <td className="p-3 font-mono font-medium">
                      {formatBytes(u.storage_used_bytes || 0)}
                    </td>

                    <td className="p-3 font-mono">
                      {formatBytes(u.storage_limit_bytes || 10737418240)}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.is_active ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' : 'bg-rose-100 dark:bg-rose-950 text-rose-600'
                      }`}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setTargetUser(u);
                          setNewQuotaGb(((u.storage_limit_bytes || 10737418240) / (1024 * 1024 * 1024)).toString());
                          setQuotaModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-surface-100 dark:bg-surface-800 hover:text-brand-600 font-semibold"
                      >
                        Adjust Quota
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded-xl font-semibold ${
                            u.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Shared Links Monitor */}
      {adminTab === 'shares' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
          <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
            System-Wide Shared Links
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
                <tr>
                  <th className="p-3">Shared Asset</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Access</th>
                  <th className="p-3">Views / Downloads</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {shares.map(s => (
                  <tr key={s.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <td className="p-3 font-semibold text-surface-900 dark:text-surface-100 truncate max-w-xs">
                      {s.original_name}
                    </td>
                    <td className="p-3 text-surface-500">{s.owner_username}</td>
                    <td className="p-3 uppercase text-[10px]">{s.access_type}</td>
                    <td className="p-3 font-semibold">{s.view_count || 0} / {s.download_count || 0}</td>
                    <td className="p-3 text-surface-400">{formatDateTime(s.created_at)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        s.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-surface-200 text-surface-500'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {adminTab === 'logs' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
          <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
            System Security & Action Logs
          </h3>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400 sticky top-0">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <td className="p-3 font-mono text-[10px] text-surface-400 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="p-3 font-semibold">{log.username || 'System'}</td>
                    <td className="p-3 font-bold uppercase text-[10px] text-brand-600">{log.action}</td>
                    <td className="p-3 text-surface-500 capitalize">{log.target_type}</td>
                    <td className="p-3 font-mono text-[10px] text-surface-400 max-w-sm truncate">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quota Modal */}
      <Modal
        isOpen={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        title={`Adjust Quota: ${targetUser?.username}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateQuotaSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
              Storage Allocation (Gigabytes)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="500"
              required
              value={newQuotaGb}
              onChange={(e) => setNewQuotaGb(e.target.value)}
              className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-sm focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setQuotaModalOpen(false)}
              className="px-4 py-2 rounded-xl text-surface-500 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl"
            >
              Update Quota
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

