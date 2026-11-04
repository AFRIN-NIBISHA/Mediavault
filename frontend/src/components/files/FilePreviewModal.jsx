import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Download,
  Share2,
  Wand2,
  Clock,
  Trash2,
  ExternalLink,
  Eye,
  Info,
  Maximize2
} from 'lucide-react';
import api from '../../services/api';
import { formatBytes, formatDateTime, getFileIcon, getFileCategoryColor } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';

export function FilePreviewModal({
  isOpen,
  onClose,
  file,
  onShare,
  onDelete,
  onOpenVersions
}) {
  const [textContent, setTextContent] = useState('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showMetadata, setShowMetadata] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && file) {
      const textCategories = ['txt', 'md', 'json', 'csv', 'xml', 'html', 'js', 'css', 'py', 'ts'];
      if (textCategories.includes(file.extension?.toLowerCase())) {
        setLoadingContent(true);
        api.get(`/files/${file.id}/preview?content=true`)
          .then(res => {
            if (res.data.success) {
              setTextContent(res.data.content);
            }
          })
          .catch(() => setTextContent('Unable to load file preview.'))
          .finally(() => setLoadingContent(false));
      }
    } else {
      setTextContent('');
    }
  }, [isOpen, file]);

  if (!isOpen || !file) return null;

  const isImage = file.file_category === 'photos' || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(file.extension?.toLowerCase());
  const isPdf = file.file_category === 'pdfs' || file.extension?.toLowerCase() === 'pdf';
  const isVideo = file.file_category === 'videos' || ['mp4', 'webm', 'mov'].includes(file.extension?.toLowerCase());
  const isAudio = file.file_category === 'audio' || ['mp3', 'wav', 'ogg'].includes(file.extension?.toLowerCase());

  const handleDownload = () => {
    window.location.href = `/api/files/${file.id}/download`;
  };

  const handleOpenEditor = () => {
    onClose();
    navigate(`/image-editor?fileId=${file.id}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-fadeIn">
      {/* Light-theme soft Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 z-10 flex flex-col overflow-hidden animate-scaleUp">
        {/* Top Header Toolbar */}
        <div className="h-16 px-6 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 truncate">
            {getFileIcon(file.file_category, file.extension, 'w-6 h-6')}
            <div className="truncate">
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                {file.original_name}
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                {formatBytes(file.file_size)} • Version {file.current_version || 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && (
              <button
                onClick={handleOpenEditor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-semibold transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                <span className="hidden sm:inline">Open in Photo Editor</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>

            {onShare && (
              <button
                onClick={() => onShare(file)}
                className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                title="Create Share Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {onOpenVersions && (
              <button
                onClick={() => onOpenVersions(file)}
                className="p-2 rounded-xl text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                title="Version History"
              >
                <Clock className="w-4 h-4" />
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(file);
                }}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Move to Trash (Delete)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-xl transition-colors ${
                showMetadata ? 'bg-surface-100 dark:bg-surface-800 text-brand-500' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
              title="Toggle Info"
            >
              <Info className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Viewing Pane + Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Visual Workspace */}
          <div className="flex-1 bg-surface-100/70 dark:bg-surface-950/70 flex items-center justify-center p-4 sm:p-6 overflow-auto">
            {isImage && (
              <img
                src={`/api/files/${file.id}/preview`}
                alt={file.original_name}
                className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
              />
            )}

            {isPdf && (
              <iframe
                src={`/api/files/${file.id}/preview`}
                title={file.original_name}
                className="w-full h-full rounded-xl border border-surface-200 dark:border-surface-800 bg-white"
              />
            )}

            {isVideo && (
              <video
                controls
                src={`/api/files/${file.id}/preview`}
                className="max-h-full max-w-full rounded-xl shadow-lg"
              />
            )}

            {isAudio && (
              <div className="text-center p-8 bg-white dark:bg-surface-900 rounded-2xl shadow-premium border border-surface-200 dark:border-surface-800 max-w-md w-full">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                  {getFileIcon('audio', 'mp3', 'w-8 h-8')}
                </div>
                <h4 className="font-semibold text-base mb-2">{file.original_name}</h4>
                <audio controls src={`/api/files/${file.id}/preview`} className="w-full mt-4" />
              </div>
            )}

            {!isImage && !isPdf && !isVideo && !isAudio && textContent && (
              <div className="w-full h-full bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 overflow-auto font-mono text-xs sm:text-sm text-surface-800 dark:text-surface-200 leading-relaxed whitespace-pre-wrap">
                {textContent}
              </div>
            )}

            {!isImage && !isPdf && !isVideo && !isAudio && !textContent && (
              <div className="text-center p-8 bg-white dark:bg-surface-900 rounded-2xl shadow-subtle border border-surface-200 dark:border-surface-800 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-3">
                  {getFileIcon(file.file_category, file.extension, 'w-8 h-8')}
                </div>
                <h4 className="font-semibold text-sm mb-1">{file.original_name}</h4>
                <p className="text-xs text-surface-500 mb-4">Preview not available for this file type.</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                >
                  Download File
                </button>
              </div>
            )}
          </div>

          {/* Right Metadata Inspector Sidebar */}
          {showMetadata && (
            <div className="w-80 border-l border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6 overflow-y-auto space-y-6 flex-shrink-0">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">
                  Asset Details
                </h4>
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-surface-400 block mb-0.5">Category</span>
                    <span className={`inline-block px-2 py-0.5 rounded-lg border font-medium uppercase text-[10px] ${getFileCategoryColor(file.file_category)}`}>
                      {file.file_category}
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">File Size</span>
                    <span className="font-semibold text-surface-800 dark:text-surface-200">
                      {formatBytes(file.file_size)}
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">Format / Extension</span>
                    <span className="font-semibold uppercase text-surface-800 dark:text-surface-200">
                      {file.extension || 'Unknown'}
                    </span>
                  </div>

                  {file.width && file.height && (
                    <div>
                      <span className="text-surface-400 block mb-0.5">Dimensions</span>
                      <span className="font-semibold text-surface-800 dark:text-surface-200">
                        {file.width} × {file.height} px
                      </span>
                    </div>
                  )}

                  {file.page_count && (
                    <div>
                      <span className="text-surface-400 block mb-0.5">Page Count</span>
                      <span className="font-semibold text-surface-800 dark:text-surface-200">
                        {file.page_count} pages
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-surface-400 block mb-0.5">Folder</span>
                    <span className="font-semibold text-surface-800 dark:text-surface-200">
                      {file.folder_name || 'Root Workspace'}
                    </span>
                  </div>

                  <div>
                    <span className="text-surface-400 block mb-0.5">Uploaded On</span>
                    <span className="font-medium text-surface-800 dark:text-surface-200">
                      {formatDateTime(file.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Verification */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3">
                  Integrity & Hash
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-surface-400 block mb-0.5">SHA-256 Checksum</span>
                    <span className="font-mono text-[10px] text-surface-600 dark:text-surface-400 break-all bg-surface-100 dark:bg-surface-800 p-1.5 rounded-lg block">
                      {file.file_hash || 'Calculating...'}
                    </span>
                  </div>
                  {file.perceptual_hash && (
                    <div>
                      <span className="text-surface-400 block mb-0.5">Perceptual dHash</span>
                      <span className="font-mono text-[10px] text-surface-600 dark:text-surface-400 break-all bg-surface-100 dark:bg-surface-800 p-1.5 rounded-lg block">
                        {file.perceptual_hash}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              {onDelete && (
                <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
                  <button
                    onClick={() => {
                      onClose();
                      onDelete(file);
                    }}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Recycle Bin</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

