import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Lock,
  Calendar,
  Eye,
  Download,
  Ban,
  Trash2,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime, getFileIcon } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function SharedFilesPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const { addToast } = useToast();

  const loadShares = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shares');
      if (res.data.success) {
        setShares(res.data.shares);
      }
    } catch (err) {
      addToast('Failed to load shared links', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  const handleCopyLink = (share) => {
    const url = `${window.location.origin}/share/${share.share_token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(share.id);
    addToast('Share link copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm('Deactivate this shared link immediately? Recipients will no longer have access.')) return;
    try {
      const res = await api.delete(`/shares/${shareId}`);
      if (res.data.success) {
        addToast('Share link revoked successfully', 'success');
        loadShares();
      }
    } catch (err) {
      addToast('Failed to revoke link', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-purple-500" />
          <span>Shared Links & Access Tokens</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Monitor view counts, download counters, active expiration timers, and password protection status.
        </p>
      </div>

      {loading ? (
        <SkeletonLoader type="row" count={4} />
      ) : shares.length === 0 ? (
        <EmptyState
          icon={Share2}
          title="No shared links created"
          description="Click 'Share Link' on any file to generate a time-limited or password-protected access link."
        />
      ) : (
        <div className="rounded-3xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-premium">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
              <tr>
                <th className="p-4">File Name</th>
                <th className="p-4">Access Type</th>
                <th className="p-4">Protection</th>
                <th className="p-4">Analytics</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
              {shares.map(share => {
                const isExpired = share.expires_at && new Date(share.expires_at) < new Date();
                const isActive = share.is_active && !isExpired;

                return (
                  <tr key={share.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                    <td className="p-4 font-semibold text-surface-900 dark:text-surface-100 max-w-xs truncate">
                      <div className="flex items-center space-x-2.5 truncate">
                        {getFileIcon(share.file_category, share.extension, 'w-4 h-4 flex-shrink-0')}
                        <span className="truncate">{share.original_name}</span>
                      </div>
                    </td>

                    <td className="p-4 capitalize">
                      <span className="px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 font-medium">
                        {share.access_type}
                      </span>
                    </td>

                    <td className="p-4">
                      {share.has_password ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                          <Lock className="w-3.5 h-3.5" /> Password
                        </span>
                      ) : (
                        <span className="text-surface-400">Public Link</span>
                      )}
                    </td>

                    <td className="p-4 text-surface-600 dark:text-surface-400">
                      <span className="font-semibold text-surface-800 dark:text-surface-200">{share.view_count || 0}</span> views •{' '}
                      <span className="font-semibold text-surface-800 dark:text-surface-200">{share.download_count || 0}</span> downloads
                    </td>

                    <td className="p-4 text-surface-500 whitespace-nowrap">
                      {share.expires_at ? formatDateTime(share.expires_at) : 'Never'}
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                          : 'bg-surface-200 dark:bg-surface-800 text-surface-400'
                      }`}>
                        {isActive ? 'Active' : isExpired ? 'Expired' : 'Revoked'}
                      </span>
                    </td>

                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopyLink(share)}
                        className="px-2.5 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold inline-flex items-center gap-1"
                      >
                        {copiedId === share.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === share.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      {isActive && (
                        <button
                          onClick={() => handleRevoke(share.id)}
                          className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

