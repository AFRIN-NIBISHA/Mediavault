import React, { useState, useEffect } from 'react';
import {
  Copy,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  ShieldAlert,
  ArrowRight,
  HardDrive
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate, getFileIcon } from '../utils/formatters';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function DuplicateManagerPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedToDelete, setSelectedToDelete] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const { addToast } = useToast();

  const scan = async () => {
    setLoading(true);
    try {
      const res = await api.get('/duplicates/scan');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      addToast('Failed to scan for duplicate assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scan();
  }, []);

  // Smart selection: in each group, keep index 0 (original) and select the remaining for deletion
  const handleAutoSelectRedundant = () => {
    const ids = [];
    if (data?.exactGroups) {
      data.exactGroups.forEach(g => {
        // Keep g.files[0], select rest
        for (let i = 1; i < g.files.length; i++) {
          ids.push(g.files[i].id);
        }
      });
    }
    if (data?.similarGroups) {
      data.similarGroups.forEach(g => {
        for (let i = 1; i < g.files.length; i++) {
          ids.push(g.files[i].id);
        }
      });
    }
    setSelectedToDelete(ids);
    addToast(`Selected ${ids.length} duplicate copy(ies). Originals kept safe.`, 'info');
  };

  const handleToggleSelect = (id) => {
    setSelectedToDelete(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteConfirmed = async () => {
    if (selectedToDelete.length === 0) return;
    if (!window.confirm(`Move ${selectedToDelete.length} duplicate file(s) to Recycle Bin? Originals will be preserved.`)) return;

    setDeleting(true);
    try {
      const res = await api.post('/duplicates/delete', {
        fileIds: selectedToDelete,
        permanent: false
      });
      if (res.data.success) {
        addToast(res.data.message || 'Duplicates removed', 'success');
        setSelectedToDelete([]);
        scan();
      }
    } catch (err) {
      addToast('Failed to remove duplicates', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader type="card" count={4} />
      </div>
    );
  }

  const exactGroups = data?.exactGroups || [];
  const similarGroups = data?.similarGroups || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Copy className="w-6 h-6 text-amber-500" />
            <span>Intelligent Duplicate Manager</span>
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Dual-method detection: cryptographic byte-level SHA-256 and perceptual visual similarity (dHash).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAutoSelectRedundant}
            disabled={exactGroups.length === 0 && similarGroups.length === 0}
            className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-semibold shadow-subtle disabled:opacity-50"
          >
            Auto-Select Duplicates (Keep Originals)
          </button>

          <button
            onClick={handleDeleteConfirmed}
            disabled={deleting || selectedToDelete.length === 0}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Trash Selected ({selectedToDelete.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <p className="text-xs text-surface-400 font-bold uppercase tracking-wider">Exact Duplicate Groups</p>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-1">
            {summary.exactGroupsCount || 0}
          </p>
          <p className="text-xs text-amber-500 mt-0.5">Matching SHA-256 Checksums</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <p className="text-xs text-surface-400 font-bold uppercase tracking-wider">Visually Similar Groups</p>
          <p className="text-2xl font-extrabold text-surface-900 dark:text-surface-100 mt-1">
            {summary.similarGroupsCount || 0}
          </p>
          <p className="text-xs text-sky-500 mt-0.5">Perceptual dHash Distance ≤ 10</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium">
          <p className="text-xs text-surface-400 font-bold uppercase tracking-wider">Reclaimable Storage</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBytes(summary.totalWastedBytes || 0)}
          </p>
          <p className="text-xs text-surface-400 mt-0.5">Wasted by duplicate redundant files</p>
        </div>
      </div>

      {/* Exact Duplicate Groups */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-surface-400">
          Cryptographic Exact Duplicate Groups (SHA-256)
        </h2>

        {exactGroups.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-surface-300 dark:border-surface-800 text-center text-xs text-surface-400 bg-white/40 dark:bg-surface-900/40">
            ✓ No byte-level exact duplicates found in your storage!
          </div>
        ) : (
          <div className="space-y-4">
            {exactGroups.map((g, gIdx) => (
              <div
                key={gIdx}
                className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-surface-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-surface-900 dark:text-surface-100">
                      Group #{gIdx + 1}
                    </span>
                    <span className="font-mono text-[10px] text-surface-400 truncate max-w-xs">
                      Hash: {g.hash}
                    </span>
                  </div>
                  <span className="text-rose-500 font-semibold">
                    Wasting {formatBytes(g.wastedBytes)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {g.files.map((file, fIdx) => {
                    const isOriginal = fIdx === 0;
                    const isChecked = selectedToDelete.includes(file.id);

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleSelect(file.id)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center space-x-3 ${
                          isChecked
                            ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                            : isOriginal
                            ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'border-surface-200 dark:border-surface-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(file.id)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                              {file.original_name}
                            </span>
                            {isOriginal && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
                                ORIGINAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-surface-400 mt-0.5">
                            {formatBytes(file.file_size)} • {formatDate(file.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Perceptual Visual Duplicate Groups */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-surface-400">
          Visually Similar Photo Groups (Perceptual Hash)
        </h2>

        {similarGroups.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-surface-300 dark:border-surface-800 text-center text-xs text-surface-400 bg-white/40 dark:bg-surface-900/40">
            ✓ No visually similar duplicate photos detected.
          </div>
        ) : (
          <div className="space-y-4">
            {similarGroups.map((g, gIdx) => (
              <div
                key={gIdx}
                className="p-5 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-surface-800 text-xs">
                  <span className="font-bold text-surface-900 dark:text-surface-100">
                    Visual Similarity Group #{gIdx + 1} ({g.fileCount} photos)
                  </span>
                  <span className="text-sky-500 font-semibold">
                    ~{formatBytes(g.wastedBytes)} duplicate storage
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {g.files.map((file, fIdx) => {
                    const isOriginal = fIdx === 0;
                    const isChecked = selectedToDelete.includes(file.id);

                    return (
                      <div
                        key={file.id}
                        onClick={() => handleToggleSelect(file.id)}
                        className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                          isChecked
                            ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
                            : isOriginal
                            ? 'border-emerald-500/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'border-surface-200 dark:border-surface-800'
                        }`}
                      >
                        <div className="h-28 rounded-xl bg-surface-100 dark:bg-surface-800 overflow-hidden mb-2 relative">
                          <img
                            src={`/api/files/${file.id}/preview`}
                            alt={file.original_name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(file.id)}
                              className="rounded text-rose-600"
                            />
                          </div>
                          {isOriginal && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold shadow">
                              ORIGINAL
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                            {file.original_name}
                          </p>
                          <p className="text-[10px] text-surface-400">
                            {formatBytes(file.file_size)} • {file.width ? `${file.width}×${file.height}px` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

