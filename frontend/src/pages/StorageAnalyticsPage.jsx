import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  PieChart,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  FileText,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate, getFileIcon, getFileCategoryColor } from '../utils/formatters';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function StorageAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/analytics/storage');
        if (res.data.success) {
          setAnalytics(res.data.analytics);
        }
      } catch (err) {
        addToast('Failed to fetch storage analytics', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  const totalUsed = analytics?.totalUsed || 0;
  const storageLimit = analytics?.storageLimit || 10737418240;
  const usagePercentage = analytics?.usagePercentage || 0;
  const categories = analytics?.categories || [];
  const largestFiles = analytics?.largestFiles || [];
  const uploadTimeline = analytics?.uploadTimeline || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <HardDrive className="w-6 h-6 text-brand-500" />
          <span>Storage Consumption Analytics</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Detailed quota breakdown, largest asset inspection, and duplicate space reclamation metrics.
        </p>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Total Consumption</p>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100">
            {formatBytes(totalUsed)}
          </p>
          <p className="text-xs text-surface-400">
            {usagePercentage}% of {formatBytes(storageLimit)} quota used
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Available Headroom</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatBytes(analytics?.available || 0)}
          </p>
          <p className="text-xs text-surface-400">Safe storage remaining</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">Redundant Duplicate Space</p>
          <p className="text-2xl font-extrabold text-amber-500">
            {formatBytes(analytics?.duplicateWastedBytes || 0)}
          </p>
          <p className="text-xs text-surface-400">Reclaimable via Duplicate Manager</p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
        <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
          Consumption by Asset Category
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, idx) => {
            const size = parseInt(cat.total_size, 10) || 0;
            const pct = totalUsed > 0 ? ((size / totalUsed) * 100).toFixed(1) : 0;

            return (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200/60 dark:border-surface-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getFileCategoryColor(cat.file_category)}`}>
                    {cat.file_category}
                  </span>
                  <span className="text-xs font-bold text-surface-700 dark:text-surface-300">
                    {pct}%
                  </span>
                </div>
                <div>
                  <p className="text-lg font-extrabold text-surface-900 dark:text-surface-100">
                    {formatBytes(size)}
                  </p>
                  <p className="text-[11px] text-surface-400">
                    {cat.count} total file(s)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 10 Largest Files */}
      <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
        <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
          Top 10 Largest Assets
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Size</th>
                <th className="p-3">Uploaded Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
              {largestFiles.map((file, idx) => (
                <tr key={file.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                  <td className="p-3 font-mono font-bold text-surface-400">#{idx + 1}</td>
                  <td className="p-3 font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2 max-w-xs truncate">
                    {getFileIcon(file.file_category, file.extension, 'w-4 h-4')}
                    <span className="truncate">{file.original_name}</span>
                  </td>
                  <td className="p-3 uppercase text-[10px] text-surface-500">{file.file_category}</td>
                  <td className="p-3 font-bold text-surface-800 dark:text-surface-200">{formatBytes(file.file_size)}</td>
                  <td className="p-3 text-surface-400">{formatDate(file.created_at)}</td>
                  <td className="p-3 text-right">
                    <a
                      href={`/api/files/${file.id}/download`}
                      className="text-brand-600 hover:underline font-semibold"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

