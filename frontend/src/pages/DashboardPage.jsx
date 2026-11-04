import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HardDrive,
  Image,
  FileText,
  Film,
  Archive,
  Layers,
  Star,
  Copy,
  Clock,
  ArrowUpRight,
  UploadCloud,
  Wand2,
  Activity,
  Plus
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate, formatDateTime, getFileIcon } from '../utils/formatters';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { ShareModal } from '../components/files/ShareModal';
import { VersionHistoryModal } from '../components/files/VersionHistoryModal';
import { useToast } from '../context/ToastContext';

export function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentUploaded, setRecentUploaded] = useState([]);
  const [favoriteFiles, setFavoriteFiles] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [versionFile, setVersionFile] = useState(null);

  const { addToast } = useToast();

  const loadDashboard = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setRecentUploaded(res.data.recentUploaded);
        setFavoriteFiles(res.data.favoriteFiles);
        setRecentActivities(res.data.recentActivities);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const handleFilesUploaded = () => loadDashboard();
    window.addEventListener('files-uploaded', handleFilesUploaded);
    return () => window.removeEventListener('files-uploaded', handleFilesUploaded);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" count={4} />
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  const storageUsed = stats?.storageUsed || 0;
  const storageLimit = stats?.storageLimit || 10737418240;
  const usagePercentage = stats?.usagePercentage || 0;
  const breakdown = stats?.storageBreakdown || {};

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Tool Launcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-700 via-purple-800 to-violet-900 rounded-3xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm">
            Digital Asset Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome to MediaVault
          </h1>
          <p className="text-xs sm:text-sm text-purple-100 leading-relaxed">
            All your photos, documents, and digital media in one unified, cryptographically verified storage workspace.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Link
            to="/photo-toolkit"
            className="px-4 py-2.5 bg-white hover:bg-purple-50 text-purple-950 rounded-xl text-xs sm:text-sm font-semibold shadow-subtle transition-all flex items-center gap-2"
          >
            <Image className="w-4 h-4 text-purple-600" />
            <span>Photo Toolkit</span>
          </Link>
          <Link
            to="/pdf-tools"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            <span>PDF Tools</span>
          </Link>
          <Link
            to="/duplicates"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs sm:text-sm font-semibold backdrop-blur-sm transition-all flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            <span>Scan Duplicates</span>
          </Link>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Storage */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Storage Used</span>
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold text-surface-900 dark:text-surface-100">
              {formatBytes(storageUsed)}
            </span>
            <span className="text-xs text-surface-400 ml-1">/ {formatBytes(storageLimit)}</span>
          </div>
          <div className="w-full bg-surface-100 dark:bg-surface-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-brand-500'
              }`}
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>
        </div>

        {/* Total Photos */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Photos</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold text-surface-900 dark:text-surface-100">
              {stats?.totalPhotos || 0}
            </span>
            <span className="text-xs text-surface-400 ml-1">images ({formatBytes(breakdown.photos || 0)})</span>
          </div>
          <Link to="/files?category=photos" className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 hover:underline">
            <span>View Photos</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total Documents & PDFs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Documents & PDFs</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold text-surface-900 dark:text-surface-100">
              {(stats?.totalDocuments || 0) + (stats?.totalPdfs || 0)}
            </span>
            <span className="text-xs text-surface-400 ml-1">docs</span>
          </div>
          <Link to="/files?category=documents" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline">
            <span>Explore Docs</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Duplicates Alert */}
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium flex flex-col justify-between">
          <div className="flex items-center justify-between text-surface-400">
            <span className="text-xs font-bold uppercase tracking-wider">Duplicate Files</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-extrabold text-surface-900 dark:text-surface-100">
              {stats?.duplicateFiles || 0}
            </span>
            <span className="text-xs text-surface-400 ml-1">redundant copies</span>
          </div>
          <Link to="/duplicates" className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline">
            <span>Review Duplicates</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Storage Breakdown Visual Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-surface-100">
              Storage Distribution by Asset Class
            </h3>
            <p className="text-xs text-surface-400">
              Real-time consumption calculated from PostgreSQL database
            </p>
          </div>
          <Link
            to="/analytics"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Full Analytics</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-3 rounded-full bg-surface-100 dark:bg-surface-800 flex overflow-hidden">
          {storageUsed > 0 ? (
            <>
              <div
                style={{ width: `${((breakdown.photos || 0) / storageUsed) * 100}%` }}
                className="bg-sky-500 h-full"
                title={`Photos: ${formatBytes(breakdown.photos || 0)}`}
              />
              <div
                style={{ width: `${((breakdown.documents || 0) / storageUsed) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Documents: ${formatBytes(breakdown.documents || 0)}`}
              />
              <div
                style={{ width: `${((breakdown.pdfs || 0) / storageUsed) * 100}%` }}
                className="bg-rose-500 h-full"
                title={`PDFs: ${formatBytes(breakdown.pdfs || 0)}`}
              />
              <div
                style={{ width: `${((breakdown.videos || 0) / storageUsed) * 100}%` }}
                className="bg-purple-500 h-full"
                title={`Videos: ${formatBytes(breakdown.videos || 0)}`}
              />
              <div
                style={{ width: `${((breakdown.archives || 0) / storageUsed) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Archives: ${formatBytes(breakdown.archives || 0)}`}
              />
            </>
          ) : (
            <div className="w-full bg-surface-200 dark:bg-surface-800 h-full" />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-surface-600 dark:text-surface-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Photos ({formatBytes(breakdown.photos || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Docs ({formatBytes(breakdown.documents || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>PDFs ({formatBytes(breakdown.pdfs || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Videos ({formatBytes(breakdown.videos || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Archives ({formatBytes(breakdown.archives || 0)})</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Uploads & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recently Uploaded Files */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Recently Uploaded Assets</span>
            </h3>
            <Link
              to="/files"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all
            </Link>
          </div>

          {recentUploaded.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-surface-300 dark:border-surface-800 text-center text-xs text-surface-400">
              No files uploaded yet. Use the upload button above to add assets.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentUploaded.map(file => {
                const isImg = file.file_category === 'photos';
                return (
                  <div
                    key={file.id}
                    onClick={() => setPreviewFile(file)}
                    className="p-3 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-500/50 shadow-subtle hover:shadow-premium transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="h-28 rounded-xl bg-surface-50 dark:bg-surface-800 flex items-center justify-center overflow-hidden mb-2.5">
                      {isImg ? (
                        <img
                          src={`/api/files/${file.id}/preview`}
                          alt={file.original_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        getFileIcon(file.file_category, file.extension, 'w-8 h-8')
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate group-hover:text-brand-600">
                        {file.original_name}
                      </h4>
                      <p className="text-[11px] text-surface-400 mt-0.5">
                        {formatBytes(file.file_size)} • {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Recent Activity Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Activity Stream</span>
            </h3>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-surface-400 text-center py-6">No recent actions logged.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map(act => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <p className="text-surface-800 dark:text-surface-200 font-medium capitalize">
                        {act.action} <span className="text-surface-500 font-normal">({act.target_type})</span>
                      </p>
                      <p className="text-[10px] text-surface-400">
                        {formatDateTime(act.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onShare={(f) => {
          setPreviewFile(null);
          setShareFile(f);
        }}
        onOpenVersions={(f) => {
          setPreviewFile(null);
          setVersionFile(f);
        }}
      />

      <ShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        file={shareFile}
      />

      <VersionHistoryModal
        isOpen={!!versionFile}
        onClose={() => setVersionFile(null)}
        file={versionFile}
        onVersionRestored={loadDashboard}
      />
    </div>
  );
}

