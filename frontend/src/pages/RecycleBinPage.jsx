import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime, getFileIcon } from '../utils/formatters';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function RecycleBinPage() {
  const [trashFiles, setTrashFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const { addToast } = useToast();

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recycle-bin');
      if (res.data.success) {
        setTrashFiles(res.data.files);
      }
    } catch (err) {
      addToast('Failed to load recycle bin', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestore = async (fileId) => {
    try {
      const res = await api.post(`/recycle-bin/${fileId}/restore`);
      if (res.data.success) {
        addToast('File restored to original location', 'success');
        loadTrash();
      }
    } catch (err) {
      addToast('Failed to restore file', 'error');
    }
  };

  const handleRestoreAll = async () => {
    if (!window.confirm('Restore all items from the Recycle Bin?')) return;
    try {
      const res = await api.post('/recycle-bin/restore-all');
      if (res.data.success) {
        addToast(res.data.message || 'All files restored', 'success');
        loadTrash();
      }
    } catch (err) {
      addToast('Failed to restore all files', 'error');
    }
  };

  const handlePermanentDelete = async (fileId) => {
    if (!window.confirm('Permanently delete this file? This action is irreversible.')) return;
    try {
      const res = await api.delete(`/recycle-bin/${fileId}/permanent`);
      if (res.data.success) {
        addToast('File permanently deleted', 'info');
        loadTrash();
      }
    } catch (err) {
      addToast('Failed to delete file', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('Empty entire Recycle Bin? All files will be permanently erased.')) return;
    try {
      const res = await api.delete('/recycle-bin/empty');
      if (res.data.success) {
        addToast(res.data.message || 'Recycle Bin emptied', 'info');
        loadTrash();
      }
    } catch (err) {
      addToast('Failed to empty recycle bin', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span>Recycle Bin & Safe Recovery</span>
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Items in the trash are retained for 30 days before permanent automatic cleanup.
          </p>
        </div>

        {trashFiles.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRestoreAll}
              className="px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-50 flex items-center gap-1.5 shadow-subtle"
            >
              <RotateCcw className="w-4 h-4 text-emerald-500" />
              <span>Restore All</span>
            </button>
            <button
              onClick={handleEmptyTrash}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Recycle Bin</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonLoader type="row" count={4} />
      ) : trashFiles.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Recycle bin is clean"
          description="Deleted assets will be held here safely where you can restore them anytime."
        />
      ) : (
        <div className="rounded-3xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-premium">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
              <tr>
                <th className="p-4">Asset Name</th>
                <th className="p-4">Original Folder</th>
                <th className="p-4">Size</th>
                <th className="p-4">Trashed Date</th>
                <th className="p-4">Auto-Delete In</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
              {trashFiles.map(file => (
                <tr key={file.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/40">
                  <td className="p-4 font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2.5 max-w-xs truncate">
                    {getFileIcon(file.file_category, file.extension, 'w-4 h-4 flex-shrink-0')}
                    <span className="truncate">{file.original_name}</span>
                  </td>

                  <td className="p-4 text-surface-500">
                    {file.original_folder_name || 'Root'}
                  </td>

                  <td className="p-4 text-surface-700 dark:text-surface-300 font-medium">
                    {formatBytes(file.file_size)}
                  </td>

                  <td className="p-4 text-surface-400">
                    {formatDateTime(file.trashed_at || file.deleted_at)}
                  </td>

                  <td className="p-4 text-amber-500 font-medium">
                    30 days
                  </td>

                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleRestore(file.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(file.id)}
                      className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Purge</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

