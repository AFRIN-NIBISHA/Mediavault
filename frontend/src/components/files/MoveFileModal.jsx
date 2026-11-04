import React, { useState, useEffect } from 'react';
import { Folder, FolderCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export function MoveFileModal({ isOpen, onClose, fileIds = [], onSuccess }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      api.get('/folders').then(res => {
        if (res.data.success) {
          setFolders(res.data.folders);
        }
      }).catch(() => {});
      setSelectedFolderId('');
    }
  }, [isOpen]);

  const handleMove = async (e) => {
    e.preventDefault();
    if (fileIds.length === 0) return;

    setLoading(true);
    try {
      const res = await api.post('/files/move', {
        fileIds,
        targetFolderId: selectedFolderId || null
      });

      if (res.data.success) {
        addToast(res.data.message || 'Files moved successfully', 'success');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to move files', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Move ${fileIds.length} File(s)`} maxWidth="max-w-md">
      <form onSubmit={handleMove} className="space-y-4">
        <p className="text-xs text-surface-500">
          Select target destination folder:
        </p>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Root option */}
          <label
            className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selectedFolderId === '' ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'
            }`}
          >
            <input
              type="radio"
              name="targetFolder"
              value=""
              checked={selectedFolderId === ''}
              onChange={() => setSelectedFolderId('')}
              className="hidden"
            />
            <FolderCheck className="w-5 h-5 text-brand-500" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                Root Workspace (No folder)
              </span>
            </div>
          </label>

          {/* User folders */}
          {folders.map(f => (
            <label
              key={f.id}
              className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                selectedFolderId === String(f.id) ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30' : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800'
              }`}
            >
              <input
                type="radio"
                name="targetFolder"
                value={f.id}
                checked={selectedFolderId === String(f.id)}
                onChange={() => setSelectedFolderId(String(f.id))}
                className="hidden"
              />
              <Folder className="w-5 h-5" style={{ color: f.color || '#0c87eb' }} />
              <div className="flex-1">
                <span className="text-xs font-semibold text-surface-900 dark:text-surface-100">
                  {f.name}
                </span>
                <span className="text-[10px] text-surface-400 block">
                  {f.file_count || 0} files inside
                </span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
          >
            {loading ? 'Moving...' : 'Move Files'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

