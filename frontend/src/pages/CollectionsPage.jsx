import React, { useState, useEffect } from 'react';
import {
  FolderHeart,
  Plus,
  Trash2,
  FolderPlus,
  ArrowRight,
  Folder
} from 'lucide-react';
import api from '../services/api';
import { formatBytes, formatDate } from '../utils/formatters';
import { FileCard } from '../components/files/FileCard';
import { FilePreviewModal } from '../components/files/FilePreviewModal';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { useToast } from '../context/ToastContext';

export function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [activeCollection, setActiveCollection] = useState(null);
  const [collectionFiles, setCollectionFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [newColModalOpen, setNewColModalOpen] = useState(false);
  const [colName, setColName] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [colColor, setColColor] = useState('#7cc5fd');

  // Add files modal
  const [addFilesModalOpen, setAddFilesModalOpen] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);

  // Preview
  const [previewFile, setPreviewFile] = useState(null);

  const { addToast } = useToast();

  const loadCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get('/collections');
      if (res.data.success) {
        setCollections(res.data.collections);
        if (res.data.collections.length > 0 && !activeCollection) {
          selectCollection(res.data.collections[0]);
        }
      }
    } catch (err) {
      addToast('Failed to load collections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectCollection = async (col) => {
    setActiveCollection(col);
    try {
      const res = await api.get(`/collections/${col.id}`);
      if (res.data.success) {
        setCollectionFiles(res.data.files);
      }
    } catch (err) {
      addToast('Failed to load collection items', 'error');
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!colName.trim()) return;

    try {
      const res = await api.post('/collections', {
        name: colName.trim(),
        description: colDesc.trim(),
        color: colColor
      });
      if (res.data.success) {
        addToast('Collection created successfully!', 'success');
        setNewColModalOpen(false);
        setColName('');
        setColDesc('');
        loadCollections();
      }
    } catch (err) {
      addToast('Failed to create collection', 'error');
    }
  };

  const handleDeleteCollection = async (colId) => {
    if (!window.confirm('Delete this custom collection? (Original files will remain untouched in their folders).')) return;
    try {
      await api.delete(`/collections/${colId}`);
      addToast('Collection deleted', 'info');
      setActiveCollection(null);
      loadCollections();
    } catch (err) {
      addToast('Failed to delete collection', 'error');
    }
  };

  const handleOpenAddFiles = async () => {
    try {
      const res = await api.get('/files');
      if (res.data.success) {
        setAvailableFiles(res.data.files);
        setSelectedToAdd([]);
        setAddFilesModalOpen(true);
      }
    } catch (err) {
      addToast('Failed to load files', 'error');
    }
  };

  const handleAddFilesSubmit = async (e) => {
    e.preventDefault();
    if (!activeCollection || selectedToAdd.length === 0) return;

    try {
      const res = await api.post(`/collections/${activeCollection.id}/files`, {
        fileIds: selectedToAdd
      });
      if (res.data.success) {
        addToast(`Added ${selectedToAdd.length} file(s) to collection`, 'success');
        setAddFilesModalOpen(false);
        selectCollection(activeCollection);
        loadCollections();
      }
    } catch (err) {
      addToast('Failed to add files to collection', 'error');
    }
  };

  const handleRemoveFromCollection = async (fileId) => {
    if (!activeCollection) return;
    try {
      await api.delete(`/collections/${activeCollection.id}/files/${fileId}`);
      addToast('Removed from collection', 'info');
      selectCollection(activeCollection);
      loadCollections();
    } catch (err) {
      addToast('Failed to remove item', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <FolderHeart className="w-6 h-6 text-brand-500" />
            <span>Virtual Collections Hub</span>
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Group photos and documents across different physical folders into custom project tags without copying disk space.
          </p>
        </div>

        <button
          onClick={() => setNewColModalOpen(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Collection cards */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Your Collections ({collections.length})
          </span>

          <div className="space-y-2">
            {collections.map(col => {
              const isActive = activeCollection?.id === col.id;
              return (
                <div
                  key={col.id}
                  onClick={() => selectCollection(col)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/20 shadow-sm'
                      : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:bg-surface-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color || '#7cc5fd' }}
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate">
                        {col.name}
                      </p>
                      <p className="text-[10px] text-surface-400">
                        {col.file_count || 0} items • {formatBytes(col.total_size || 0)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCollection(col.id);
                    }}
                    className="p-1 text-surface-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Files inside active collection */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-premium space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
              <div>
                <h3 className="text-base font-bold text-surface-900 dark:text-surface-100">
                  {activeCollection ? activeCollection.name : 'Select a collection'}
                </h3>
                <p className="text-xs text-surface-400">
                  {activeCollection?.description || 'Virtual cross-folder asset group'}
                </p>
              </div>

              {activeCollection && (
                <button
                  onClick={handleOpenAddFiles}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Assets</span>
                </button>
              )}
            </div>

            {collectionFiles.length === 0 ? (
              <EmptyState
                icon={FolderHeart}
                title="Collection is empty"
                description="Add photos or documents to group them together under this collection tag."
                actionLabel="Add Assets to Collection"
                onAction={handleOpenAddFiles}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {collectionFiles.map(file => (
                  <div key={file.id} className="relative group">
                    <FileCard
                      file={file}
                      isSelected={false}
                      onSelect={() => {}}
                      onPreview={setPreviewFile}
                      onToggleFavorite={() => {}}
                    />
                    <button
                      onClick={() => handleRemoveFromCollection(file.id)}
                      className="absolute top-2 right-2 z-30 p-1 rounded-lg bg-surface-900/80 text-white hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]"
                      title="Remove from collection"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Collection Modal */}
      <Modal
        isOpen={newColModalOpen}
        onClose={() => setNewColModalOpen(false)}
        title="Create Custom Virtual Collection"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateCollection} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
              Collection Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q1 Marketing Campaign, Research Papers"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-sm focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-1">
              Description (Optional)
            </label>
            <textarea
              placeholder="Notes or context for this collection..."
              value={colDesc}
              onChange={(e) => setColDesc(e.target.value)}
              className="w-full p-2.5 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 text-xs focus:outline-none h-16"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-surface-500 mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-2">
              {['#7cc5fd', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'].map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    colColor === c ? 'scale-125 ring-2 ring-brand-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={() => setNewColModalOpen(false)}
              className="px-4 py-2 rounded-xl text-surface-500 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl"
            >
              Save Collection
            </button>
          </div>
        </form>
      </Modal>

      {/* Add files to collection modal */}
      <Modal
        isOpen={addFilesModalOpen}
        onClose={() => setAddFilesModalOpen(false)}
        title="Add Assets to Collection"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddFilesSubmit} className="space-y-4 text-xs">
          <div className="max-h-64 overflow-y-auto space-y-1.5 border border-surface-200 dark:border-surface-800 p-2 rounded-xl">
            {availableFiles.map(f => (
              <label key={f.id} className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedToAdd.includes(f.id)}
                  onChange={() => {
                    setSelectedToAdd(prev =>
                      prev.includes(f.id) ? prev.filter(x => x !== f.id) : [...prev, f.id]
                    );
                  }}
                  className="rounded text-brand-600 focus:ring-brand-500"
                />
                <span className="truncate font-semibold">{f.original_name}</span>
                <span className="text-surface-400 text-[10px]">({formatBytes(f.file_size)})</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddFilesModalOpen(false)}
              className="px-4 py-2 rounded-xl text-surface-500 hover:bg-surface-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedToAdd.length === 0}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              Add Selected ({selectedToAdd.length})
            </button>
          </div>
        </form>
      </Modal>

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}

