import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  Search,
  FolderPlus,
  Download,
  Trash2,
  FolderInput,
  Edit,
  Folder,
  ChevronRight,
  Sparkles,
  Columns
} from 'lucide-react';
import api from '../services/api';
import { FileCard } from '../components/files/FileCard';
import { FileRow } from '../components/files/FileRow';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { ShareModal } from '../components/files/ShareModal';
import { MoveFileModal } from '../components/files/MoveFileModal';
import { VersionHistoryModal } from '../components/files/VersionHistoryModal';
import { FileComparisonModal } from '../components/files/FileComparisonModal';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function AllFilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Selected folder & category filters
  const currentFolderId = searchParams.get('folderId') || '';
  const currentCategory = searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  // Multi-selection state
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // Modals
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [versionFile, setVersionFile] = useState(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  // Comparison modal
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [compareFileA, setCompareFileA] = useState(null);
  const [compareFileB, setCompareFileB] = useState(null);

  const { addToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load folders
      const fRes = await api.get('/folders');
      if (fRes.data.success) {
        setFolders(fRes.data.folders);
      }

      // 2. Load files with query parameters
      const params = {
        folderId: currentFolderId || undefined,
        category: currentCategory !== 'all' ? currentCategory : undefined,
        search: searchQuery || undefined,
        sortBy,
        order
      };
      const filesRes = await api.get('/files', { params });
      if (filesRes.data.success) {
        setFiles(filesRes.data.files);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      addToast('Failed to load assets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('files-uploaded', handleRefresh);
    window.addEventListener('folder-created', handleRefresh);
    return () => {
      window.removeEventListener('files-uploaded', handleRefresh);
      window.removeEventListener('folder-created', handleRefresh);
    };
  }, [currentFolderId, currentCategory, searchQuery, sortBy, order]);

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(files.map(f => f.id));
    }
  };

  // Favorite toggle
  const handleToggleFavorite = async (fileId) => {
    try {
      const res = await api.put(`/files/${fileId}/favorite`);
      if (res.data.success) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, is_favorite: res.data.isFavorite } : f));
      }
    } catch (err) {
      addToast('Failed to update favorite', 'error');
    }
  };

  // Bulk actions
  const handleBulkDownload = async () => {
    if (selectedFileIds.length === 0) return;
    try {
      addToast('Preparing ZIP archive download...', 'info');
      const response = await api.post('/files/bulk-download', { fileIds: selectedFileIds }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `MediaVault_Batch_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      addToast('Failed to generate archive', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFileIds.length === 0) return;
    if (!window.confirm(`Move ${selectedFileIds.length} item(s) to Recycle Bin?`)) return;

    try {
      const res = await api.post('/files/delete', { fileIds: selectedFileIds, permanent: false });
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSelectedFileIds([]);
        loadData();
        window.dispatchEvent(new CustomEvent('files-uploaded'));
      }
    } catch (err) {
      addToast('Failed to delete files', 'error');
    }
  };

  const handleDeleteSingle = async (file) => {
    try {
      await api.post('/files/delete', { fileIds: [file.id], permanent: false });
      addToast('Moved to Recycle Bin', 'success');
      loadData();
      window.dispatchEvent(new CustomEvent('files-uploaded'));
    } catch (err) {
      addToast('Failed to delete file', 'error');
    }
  };

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!fileToRename || !newFileName.trim()) return;

    try {
      const res = await api.put(`/files/${fileToRename.id}/rename`, { newName: newFileName.trim() });
      if (res.data.success) {
        addToast('File renamed', 'success');
        setRenameModalOpen(false);
        loadData();
      }
    } catch (err) {
      addToast('Failed to rename file', 'error');
    }
  };

  const handleOpenComparison = (file) => {
    if (!compareFileA) {
      setCompareFileA(file);
      addToast(`Selected "${file.original_name}" as File A. Now select second file to compare.`, 'info');
    } else {
      setCompareFileB(file);
      setComparisonModalOpen(true);
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'photos', label: 'Photos' },
    { id: 'documents', label: 'Documents' },
    { id: 'pdfs', label: 'PDFs' },
    { id: 'videos', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
    { id: 'archives', label: 'Archives' }
  ];

  return (
    <div className="space-y-6">
      {/* Category Tabs & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-200 dark:border-surface-800">
        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('category', cat.id);
                setSearchParams(next);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                currentCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sorting and Grid/List switcher */}
        <div className="flex items-center gap-2">
          {/* Compare File Indicator */}
          {compareFileA && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 text-amber-800 dark:text-amber-200 text-xs rounded-xl">
              <span>Compare A: {compareFileA.original_name.substring(0, 12)}...</span>
              <button onClick={() => setCompareFileA(null)} className="font-bold ml-1 hover:text-rose-500">×</button>
            </div>
          )}

          <select
            value={`${sortBy}-${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split('-');
              const next = new URLSearchParams(searchParams);
              next.set('sortBy', s);
              next.set('order', o);
              setSearchParams(next);
            }}
            className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-xs font-medium text-surface-700 dark:text-surface-300 focus:outline-none"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="name-asc">Name (A - Z)</option>
            <option value="name-desc">Name (Z - A)</option>
            <option value="size-desc">Size (Largest)</option>
            <option value="size-asc">Size (Smallest)</option>
          </select>

          <div className="flex items-center bg-white dark:bg-surface-900 p-0.5 rounded-xl border border-surface-200 dark:border-surface-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-400'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Row (if any) */}
      {folders.length > 0 && !currentFolderId && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Folders ({folders.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('folderId', String(folder.id));
                  setSearchParams(next);
                }}
                className="p-3 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-500 hover:shadow-premium transition-all cursor-pointer flex items-center space-x-3 group"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${folder.color || '#0c87eb'}20`, color: folder.color || '#0c87eb' }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate group-hover:text-brand-600">
                    {folder.name}
                  </p>
                  <p className="text-[10px] text-surface-400">
                    {folder.file_count || 0} files
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder Breadcrumb if inside folder */}
      {currentFolderId && (
        <div className="flex items-center gap-2 text-xs font-medium text-surface-500 bg-white dark:bg-surface-900 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 shadow-subtle">
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('folderId');
              setSearchParams(next);
            }}
            className="text-brand-600 hover:underline"
          >
            All Files (Root)
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
          <span className="text-surface-800 dark:text-surface-200 font-semibold">
            {folders.find(f => String(f.id) === currentFolderId)?.name || 'Folder'}
          </span>
        </div>
      )}

      {/* Main Files Display */}
      {loading ? (
        <SkeletonLoader type={viewMode === 'grid' ? 'card' : 'row'} count={8} />
      ) : files.length === 0 ? (
        <EmptyState
          title="No files found"
          description={searchQuery ? `No files matching "${searchQuery}".` : "This folder or category is currently empty."}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              isSelected={selectedFileIds.includes(file.id)}
              onSelect={handleToggleSelect}
              onPreview={setPreviewFile}
              onToggleFavorite={handleToggleFavorite}
              onShare={setShareFile}
              onRename={(f) => {
                setFileToRename(f);
                setNewFileName(f.original_name);
                setRenameModalOpen(true);
              }}
              onMove={(f) => {
                setSelectedFileIds([f.id]);
                setMoveModalOpen(true);
              }}
              onCopy={async (f) => {
                await api.post('/files/copy', { fileIds: [f.id] });
                addToast('File duplicated', 'success');
                loadData();
              }}
              onDelete={handleDeleteSingle}
              onOpenVersions={setVersionFile}
              onCompare={handleOpenComparison}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden shadow-subtle">
          <table className="w-full text-left">
            <thead className="bg-surface-50 dark:bg-surface-800/60 border-b border-surface-200 dark:border-surface-800 text-[11px] font-bold uppercase tracking-wider text-surface-400">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.length === files.length && files.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3 hidden md:table-cell">Category</th>
                <th className="px-3 py-3">Size</th>
                <th className="px-3 py-3 hidden lg:table-cell">Folder</th>
                <th className="px-3 py-3 hidden sm:table-cell">Date</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  isSelected={selectedFileIds.includes(file.id)}
                  onSelect={handleToggleSelect}
                  onPreview={setPreviewFile}
                  onToggleFavorite={handleToggleFavorite}
                  onShare={setShareFile}
                  onRename={(f) => {
                    setFileToRename(f);
                    setNewFileName(f.original_name);
                    setRenameModalOpen(true);
                  }}
                  onMove={(f) => {
                    setSelectedFileIds([f.id]);
                    setMoveModalOpen(true);
                  }}
                  onCopy={async (f) => {
                    await api.post('/files/copy', { fileIds: [f.id] });
                    addToast('File duplicated', 'success');
                    loadData();
                  }}
                  onDelete={handleDeleteSingle}
                  onOpenVersions={setVersionFile}
                  onCompare={handleOpenComparison}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Multi-Selection Action Toolbar */}
      {selectedFileIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-900 text-white dark:bg-white dark:text-surface-900 px-6 py-3 rounded-2xl shadow-elevated flex items-center gap-4 animate-slideIn">
          <span className="text-xs font-semibold">
            {selectedFileIds.length} item(s) selected
          </span>

          <div className="h-4 w-[1px] bg-surface-700 dark:bg-surface-300" />

          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-1.5 text-xs font-medium hover:text-brand-400 dark:hover:text-brand-600 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </button>

          <button
            onClick={() => setMoveModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium hover:text-brand-400 dark:hover:text-brand-600 transition-colors"
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Move</span>
          </button>

          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-400 dark:text-rose-600 hover:opacity-80 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </button>

          <button
            onClick={() => setSelectedFileIds([])}
            className="text-xs text-surface-400 hover:text-white dark:hover:text-black ml-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Modals */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        onShare={(f) => {
          setPreviewFile(null);
          setShareFile(f);
        }}
        onDelete={handleDeleteSingle}
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

      <MoveFileModal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        fileIds={selectedFileIds}
        onSuccess={() => {
          setSelectedFileIds([]);
          loadData();
        }}
      />

      <VersionHistoryModal
        isOpen={!!versionFile}
        onClose={() => setVersionFile(null)}
        file={versionFile}
        onVersionRestored={loadData}
      />

      <FileComparisonModal
        isOpen={comparisonModalOpen}
        onClose={() => {
          setComparisonModalOpen(false);
          setCompareFileA(null);
          setCompareFileB(null);
        }}
        fileA={compareFileA}
        fileB={compareFileB}
      />

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename File"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider mb-1.5">
              New File Name
            </label>
            <input
              type="text"
              required
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:border-brand-500"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white"
            >
              Save Rename
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

