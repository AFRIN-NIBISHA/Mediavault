import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Check, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import api from '../../services/api';
import { formatBytes, formatDateTime } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export function VersionHistoryModal({ isOpen, onClose, file, onVersionRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && file) {
      loadVersions();
    }
  }, [isOpen, file]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/versions/${file.id}`);
      if (res.data.success) {
        setVersions(res.data.versions);
      }
    } catch (err) {
      addToast('Failed to load version history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber) => {
    setRestoringVersion(versionNumber);
    try {
      const res = await api.post(`/versions/${file.id}/restore/${versionNumber}`);
      if (res.data.success) {
        addToast(res.data.message || `Restored version ${versionNumber}`, 'success');
        await loadVersions();
        if (onVersionRestored) onVersionRestored();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Restore failed', 'error');
    } finally {
      setRestoringVersion(null);
    }
  };

  if (!file) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Version History: ${file.original_name}`} maxWidth="max-w-xl">
      <div className="space-y-4">
        <p className="text-xs text-surface-500">
          MediaVault automatically tracks revisions when files are edited, overwritten, or modified.
        </p>

        {loading ? (
          <div className="py-8 text-center text-xs text-surface-400">Loading versions...</div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-xs text-surface-400">No previous versions available.</div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-surface-800">
            {versions.map((v, index) => {
              const isCurrent = index === 0;
              return (
                <div key={v.id} className="relative group">
                  {/* Timeline point */}
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-surface-900 transition-colors ${
                      isCurrent ? 'bg-brand-500 ring-4 ring-brand-100 dark:ring-brand-950' : 'bg-surface-300 dark:bg-surface-700'
                    }`}
                  />

                  <div className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'border-brand-500/40 bg-brand-50/30 dark:bg-brand-950/20'
                      : 'border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-surface-900 dark:text-surface-100">
                          Version {v.version_number}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 text-[10px] font-bold">
                            Current Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-surface-400">
                        {formatDateTime(v.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-surface-600 dark:text-surface-300 mb-2">
                      {v.change_summary || 'Asset revision'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-surface-200/60 dark:border-surface-700/60">
                      <span className="text-[11px] text-surface-400 font-medium">
                        Size: {formatBytes(v.file_size)}
                      </span>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRestore(v.version_number)}
                          disabled={restoringVersion !== null}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-200 dark:bg-surface-700 hover:bg-brand-500 hover:text-white text-surface-700 dark:text-surface-300 text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{restoringVersion === v.version_number ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-surface-200 dark:border-surface-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

