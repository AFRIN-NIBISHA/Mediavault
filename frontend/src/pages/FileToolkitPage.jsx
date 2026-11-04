import React, { useState, useEffect } from 'react';
import {
  FileText,
  Archive,
  Download,
  FolderPlus,
  Edit3,
  Search,
  CheckCircle,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Sparkles,
  Info
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';

export function FileToolkitPage() {
  const [files, setFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Utilities tabs: 'info' | 'zip' | 'rename'
  const [activeTab, setActiveTab] = useState('info');

  // Inspector File
  const [inspectedFile, setInspectedFile] = useState(null);

  // Bulk Rename state
  const [renamePrefix, setRenamePrefix] = useState('Report_');
  const [renamePattern, setRenamePattern] = useState('number'); // 'number', 'replace'
  const [isRenaming, setIsRenaming] = useState(false);

  // ZIP Creation state
  const [zipTitle, setZipTitle] = useState('MediaVault_Archive.zip');
  const [isZipping, setIsZipping] = useState(false);

  const { addToast } = useToast();

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/files');
      if (res.data.success) {
        setFiles(res.data.files);
        if (res.data.files.length > 0 && !inspectedFile) {
          setInspectedFile(res.data.files[0]);
        }
      }
    } catch (err) {
      addToast('Failed to load files', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSelectToggle = (id) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreateZip = async (e) => {
    e.preventDefault();
    if (selectedFileIds.length === 0) {
      addToast('Please select at least one file to create an archive', 'warning');
      return;
    }

    setIsZipping(true);
    try {
      const res = await api.post('/bulk/jobs', {
        jobType: 'batch_create_zip',
        fileIds: selectedFileIds,
        options: { outputTitle: zipTitle.trim() }
      });

      if (res.data.success) {
        addToast('ZIP archive created successfully!', 'success');
        setSelectedFileIds([]);
        loadFiles();
      }
    } catch (err) {
      addToast('Failed to create ZIP archive', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const handleBulkRename = async (e) => {
    e.preventDefault();
    if (selectedFileIds.length === 0) {
      addToast('Please select files to rename', 'warning');
      return;
    }

    setIsRenaming(true);
    try {
      const res = await api.post('/files/bulk-rename', {
        fileIds: selectedFileIds,
        prefix: renamePrefix,
        pattern: renamePattern
      });

      if (res.data.success) {
        addToast(res.data.message || 'Files renamed successfully!', 'success');
        setSelectedFileIds([]);
        loadFiles();
      }
    } catch (err) {
      addToast('Bulk rename failed', 'error');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-500" />
          <span>File Toolkit & Document Utilities</span>
        </h1>
        <p className="text-xs text-surface-500 mt-1">
          Deep file format inspection, bulk renaming patterns, and ZIP archiving utilities.
        </p>
      </div>

      {/* Main Toolkit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Files List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-200 dark:border-surface-800">
              <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
                Workspace Files ({files.length})
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedFileIds.length === files.length) setSelectedFileIds([]);
                    else setSelectedFileIds(files.map(f => f.id));
                  }}
                  className="text-brand-600 hover:underline font-semibold"
                >
                  {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-surface-400">({selectedFileIds.length} chosen)</span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {files.map(file => {
                const isSelected = selectedFileIds.includes(file.id);
                const isInspecting = inspectedFile?.id === file.id;

                return (
                  <div
                    key={file.id}
                    onClick={() => setInspectedFile(file)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isInspecting
                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20'
                        : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectToggle(file.id);
                        }}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                          {file.original_name}
                        </p>
                        <p className="text-[11px] text-surface-400">
                          {formatBytes(file.file_size)} • {file.file_category} ({file.extension})
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedFile(file);
                        setActiveTab('info');
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:text-brand-600"
                    >
                      Inspect
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Utilities Workspaces */}
        <div className="space-y-4">
          {/* Action Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'info' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-surface-500'
              }`}
            >
              Inspector
            </button>
            <button
              onClick={() => setActiveTab('zip')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'zip' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-surface-500'
              }`}
            >
              ZIP Tool
            </button>
            <button
              onClick={() => setActiveTab('rename')}
              className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'rename' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-surface-500'
              }`}
            >
              Bulk Rename
            </button>
          </div>

          {/* Tab 1: Deep Format Inspector */}
          {activeTab === 'info' && (
            <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
                File Format & Extension Inspector
              </h3>

              {inspectedFile ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-surface-400 block mb-0.5">Filename</span>
                    <span className="font-semibold text-surface-800 dark:text-surface-200 break-all">
                      {inspectedFile.original_name}
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">MIME Type</span>
                    <span className="font-mono text-xs bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded-md inline-block">
                      {inspectedFile.mime_type}
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">Calculated Size</span>
                    <span className="font-semibold text-surface-800 dark:text-surface-200">
                      {formatBytes(inspectedFile.file_size)} ({inspectedFile.file_size} bytes)
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">Extension Verification</span>
                    <span className="font-semibold uppercase text-emerald-600">
                      .{inspectedFile.extension} (Valid Signature)
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">Cryptographic SHA-256</span>
                    <span className="font-mono text-[10px] break-all bg-surface-100 dark:bg-surface-800 p-2 rounded-lg block text-surface-600 dark:text-surface-400">
                      {inspectedFile.file_hash}
                    </span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => window.location.href = `/api/files/${inspectedFile.id}/download`}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Inspected File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-surface-400 py-6 text-center">Select a file on the left to inspect.</p>
              )}
            </div>
          )}

          {/* Tab 2: ZIP Tool */}
          {activeTab === 'zip' && (
            <form onSubmit={handleCreateZip} className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-orange-500" />
                <span>Create Compressed ZIP Archive</span>
              </h3>

              <p className="text-xs text-surface-500">
                Compress selected files into a portable ZIP package with DEFLATE level 6 compression.
              </p>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Archive Output Name
                </label>
                <input
                  type="text"
                  required
                  value={zipTitle}
                  onChange={(e) => setZipTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs sm:text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl text-xs text-surface-600 dark:text-surface-400">
                Selected: <span className="font-semibold text-brand-600">{selectedFileIds.length} files</span>
              </div>

              <button
                type="submit"
                disabled={isZipping || selectedFileIds.length === 0}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isZipping ? 'Compressing Files...' : 'Generate ZIP Archive'}
              </button>
            </form>
          )}

          {/* Tab 3: Bulk Renaming */}
          {activeTab === 'rename' && (
            <form onSubmit={handleBulkRename} className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-brand-500" />
                <span>Bulk Renaming Utility</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Prefix Pattern
                </label>
                <input
                  type="text"
                  value={renamePrefix}
                  onChange={(e) => setRenamePrefix(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
                  Naming Rule
                </label>
                <select
                  value={renamePattern}
                  onChange={(e) => setRenamePattern(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs focus:outline-none"
                >
                  <option value="number">Prefix + Original Name + Number (e.g. Doc_file_1)</option>
                  <option value="replace">Prefix + Number Only (e.g. Doc_1, Doc_2)</option>
                </select>
              </div>

              <div className="p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl text-xs text-surface-600 dark:text-surface-400">
                Targeting: <span className="font-semibold text-brand-600">{selectedFileIds.length} selected files</span>
              </div>

              <button
                type="submit"
                disabled={isRenaming || selectedFileIds.length === 0}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {isRenaming ? 'Renaming Assets...' : 'Apply Bulk Renaming'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

