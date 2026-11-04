import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  X,
  File,
  CheckCircle2,
  AlertCircle,
  Folder
} from 'lucide-react';
import { Modal } from '../common/Modal';
import api from '../../services/api';
import { formatBytes } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export function FileUploadModal({ isOpen, onClose, onUploadComplete, defaultFolderId = null }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(defaultFolderId || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (isOpen) {
      // Fetch user folders for dropdown
      api.get('/folders').then(res => {
        if (res.data.success) {
          setFolders(res.data.folders);
        }
      }).catch(() => {});
      setSelectedFolderId(defaultFolderId || '');
    } else {
      setFiles([]);
      setUploadProgress(0);
      setUploading(false);
    }
  }, [isOpen, defaultFolderId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    setFiles(prev => {
      // Deduplicate by name and size
      const existingKeys = new Set(prev.map(f => `${f.name}-${f.size}`));
      const filtered = newFiles.filter(f => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...filtered];
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    if (selectedFolderId) {
      formData.append('folderId', selectedFolderId);
    }

    try {
      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (res.data.success) {
        addToast(`Uploaded ${files.length} file(s) successfully!`, 'success');
        await refreshUser();
        window.dispatchEvent(new CustomEvent('files-uploaded'));
        if (onUploadComplete) onUploadComplete();
        onClose();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Assets & Files" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Folder destination selector */}
        <div className="flex items-center gap-3 bg-surface-50 dark:bg-surface-800/60 p-3 rounded-xl border border-surface-200 dark:border-surface-700">
          <Folder className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-surface-500 mb-0.5">
              Upload Destination Folder
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-surface-900 dark:text-surface-100 focus:outline-none cursor-pointer"
            >
              <option value="">Root (No folder)</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag and Drop Box */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 scale-[0.99]'
              : 'border-surface-300 dark:border-surface-700 hover:border-brand-400 bg-surface-50/50 dark:bg-surface-800/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3 shadow-subtle">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Photos, PDFs, Documents, Archives, Audio, Video (Up to 100MB per file)
          </p>
        </div>

        {/* Staged files list */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-surface-600 dark:text-surface-400 px-1">
              <span>Selected Files ({files.length})</span>
              <span>Total: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))}</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 bg-surface-100 dark:bg-surface-800 rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-2.5 truncate max-w-sm">
                    <File className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="truncate font-medium text-surface-800 dark:text-surface-200">
                      {file.name}
                    </span>
                    <span className="text-surface-400 flex-shrink-0">
                      ({formatBytes(file.size)})
                    </span>
                  </div>
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1 hover:text-rose-500 text-surface-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium text-surface-600 dark:text-surface-300">
              <span>Uploading files...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-surface-200 dark:bg-surface-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-brand-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-surface-200 dark:border-surface-800">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="px-5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <span>Upload {files.length > 0 ? `(${files.length})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

