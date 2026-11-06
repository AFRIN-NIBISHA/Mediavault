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
  Plus,
  ShieldCheck,
  Sparkles
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
        setRecentUploaded(res.data.recentUploaded || []);
        setFavoriteFiles(res.data.favoriteFiles || []);
        setRecentActivities(res.data.recentActivities || []);
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
  const storageLimit = stats?.storageLimit || 53687091200;
  const usagePercentage = stats?.usagePercentage || 0;
  const breakdown = stats?.storageBreakdown || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Luminous Launch Hero - Apple-Grade Light SaaS Aesthetic */}
      <div className="relative rounded-3xl p-7 sm:p-9 bg-gradient-to-br from-white via-sky-50/40 to-indigo-50/30 border border-slate-200/80 shadow-sm backdrop-blur-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Soft Ambient Radial Accents */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-200/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-200/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 border border-slate-200/70 shadow-xs text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Secure Hardline Enterprise DAM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900">
            Welcome to MediaVault
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            All your photos, documents, and digital media in one unified, cryptographically verified storage workspace.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Link
            to="/photo-toolkit"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-medium border border-slate-200/80 shadow-subtle transition-all flex items-center gap-2 active:scale-95"
          >
            <Image className="w-4 h-4 text-sky-600" />
            <span>Photo Toolkit</span>
          </Link>
          <Link
            to="/pdf-tools"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-medium border border-slate-200/80 shadow-subtle transition-all flex items-center gap-2 active:scale-95"
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>PDF Tools</span>
          </Link>
          <Link
            to="/duplicates"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs sm:text-sm font-medium border border-slate-200/80 shadow-subtle transition-all flex items-center gap-2 active:scale-95"
          >
            <Copy className="w-4 h-4 text-slate-600" />
            <span>Scan Duplicates</span>
          </Link>
        </div>
      </div>

      {/* Main Metric Cards - Rounded 2xl with Diffused Occlusion Shadows */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Storage Card */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/70 shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Storage Used</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/70">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {formatBytes(storageUsed)}
            </span>
            <span className="text-xs text-slate-400 ml-1">/ {formatBytes(storageLimit)}</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(storageUsed > 0 ? 2 : 0, usagePercentage))}%` }}
            />
          </div>
        </div>

        {/* Total Photos Card */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/70 shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Photos</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/70">
              <Image className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats?.totalPhotos || 0}
            </span>
            <span className="text-xs text-slate-400 ml-1">images ({formatBytes(breakdown.photos || 0)})</span>
          </div>
          <Link to="/files?category=photos" className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1">
            <span>View Photos</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Total Documents & PDFs */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/70 shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Documents & PDFs</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/70">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {(stats?.totalDocuments || 0) + (stats?.totalPdfs || 0)}
            </span>
            <span className="text-xs text-slate-400 ml-1">docs</span>
          </div>
          <Link to="/files?category=documents" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            <span>Explore Docs</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Duplicate Files Alert Card */}
        <div className="p-5 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/70 shadow-subtle hover:shadow-premium transition-all duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Duplicate Files</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/70">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              {stats?.duplicateFiles || 0}
            </span>
            <span className="text-xs text-slate-400 ml-1">redundant copies</span>
          </div>
          <Link to="/duplicates" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
            <span>Review Duplicates</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Storage Breakdown Multi-segment Bar Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/70 shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Storage Distribution by Asset Class
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time consumption calculated from PostgreSQL database
            </p>
          </div>
          <Link
            to="/analytics"
            className="text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <span>Full Analytics</span> <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 flex overflow-hidden">
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
                className="bg-indigo-500 h-full"
                title={`Videos: ${formatBytes(breakdown.videos || 0)}`}
              />
              <div
                style={{ width: `${((breakdown.archives || 0) / storageUsed) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Archives: ${formatBytes(breakdown.archives || 0)}`}
              />
            </>
          ) : (
            <div className="w-full bg-slate-200 h-full" />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Photos ({formatBytes(breakdown.photos || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Docs ({formatBytes(breakdown.documents || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>PDFs ({formatBytes(breakdown.pdfs || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Videos ({formatBytes(breakdown.videos || 0)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Archives ({formatBytes(breakdown.archives || 0)})</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Uploads & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recently Uploaded Files */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Recently Uploaded Assets</span>
            </h3>
            <Link
              to="/files"
              className="text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              View all
            </Link>
          </div>

          {recentUploaded.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-slate-200 bg-white/50 text-center text-xs text-slate-400">
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
                    className="p-3 rounded-2xl bg-white border border-slate-200/70 hover:border-sky-300 shadow-subtle hover:shadow-premium transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="h-28 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden mb-2.5 border border-slate-100">
                      {isImg ? (
                        <img
                          src={`/api/files/${file.id}/preview`}
                          alt={file.original_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        getFileIcon(file.file_category, file.extension, 'w-8 h-8')
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-slate-900 truncate group-hover:text-sky-600">
                        {file.original_name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
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
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Activity Stream</span>
            </h3>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-subtle">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent actions logged.</p>
            ) : (
              <div className="space-y-3.5">
                {recentActivities.map(act => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <p className="text-slate-800 font-medium capitalize truncate">
                        {act.action} <span className="text-slate-400 font-normal">({act.target_type})</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
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
