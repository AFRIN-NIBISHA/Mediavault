import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  Clock,
  FileText,
  Search,
  CheckCircle,
  HardDrive
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDateTime, getFileIcon } from '../utils/formatters';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function VersionHistoryPage() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringVer, setRestoringVer] = useState(null);
  const { addToast } = useToast();

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files');
      if (res.data.success) {
        setFiles(res.data.files);
        if (res.data.files.length > 0 && !selectedFile) {
          selectFile(res.data.files[0]);
        }
      }
    } catch (err) {
      addToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectFile = async (file) => {
    setSelectedFile(file);
    try {
      const res = await api.get(`/versions/${file.id}`);
      if (res.data.success) {
        setVersions(res.data.versions);
      }
    } catch (err) {
      addToast('Failed to fetch version records', 'error');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleRestore = async (versionNumber) => {
    if (!selectedFile) return;
    setRestoringVer(versionNumber);
    try {
      const res = await api.post(`/versions/${selectedFile.id}/restore/${versionNumber}`);
      if (res.data.success) {
        addToast(res.data.message || 'Version restored successfully', 'success');
        selectFile(selectedFile);
        loadFiles();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Restore failed', 'error');
    } finally {
      setRestoringVer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <History className="w-6 h-6 text-indigo-500" />
          <span>Asset Version Control Hub</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Immutable historical snapshots recorded on every transformation, edit, or overwrite.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Asset Selection List */}
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Select Asset to Inspect
            </span>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {files.map(file => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => selectFile(file)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all flex items-center space-x-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
                        : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}
                  >
                    {getFileIcon(file.file_category, file.extension, 'w-5 h-5 flex-shrink-0')}
                    <div className="truncate flex-1">
                      <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                        {file.original_name}
                      </p>
                      <p className="text-[10px] text-surface-400">
                        Version {file.current_version || 1} • {formatBytes(file.file_size)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Version Timeline & Restore Actions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
                  {selectedFile ? selectedFile.original_name : 'No file selected'}
                </h3>
                <p className="text-xs text-surface-400">
                  {versions.length} revision checkpoint(s) recorded in database
                </p>
              </div>

              {selectedFile && (
                <a
                  href={`/api/files/${selectedFile.id}/download`}
                  className="px-3 py-1.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-300 hover:text-brand-600"
                >
                  Download Active File
                </a>
              )}
            </div>

            {/* Version timeline list */}
            {versions.length === 0 ? (
              <p className="text-xs text-surface-400 py-12 text-center">No version records found.</p>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-surface-800">
                {versions.map((v, index) => {
                  const isCurrent = index === 0;

                  return (
                    <div key={v.id} className="relative group">
                      <div
                        className={`absolute -left-[27px] top-2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-surface-900 ${
                          isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950' : 'bg-surface-300 dark:bg-surface-700'
                        }`}
                      />

                      <div className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-indigo-500/40 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : 'border-surface-200 dark:border-surface-800 bg-surface-50/40 dark:bg-surface-800/30'
                      }`}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-surface-900 dark:text-surface-100">
                              Revision Version {v.version_number}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-surface-400">
                            {formatDateTime(v.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-surface-600 dark:text-surface-300 mb-2">
                          {v.change_summary || 'Asset creation or edit'}
                        </p>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-surface-200/60 dark:border-surface-700/60">
                          <span className="text-surface-400">
                            Filesize: {formatBytes(v.file_size)}
                          </span>

                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleRestore(v.version_number)}
                              disabled={restoringVer !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{restoringVer === v.version_number ? 'Restoring...' : 'Rollback to this state'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

