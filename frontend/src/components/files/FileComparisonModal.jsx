import React, { useState } from 'react';
import { Columns, ArrowLeftRight, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { formatBytes, formatDateTime, getFileIcon } from '../../utils/formatters';

export function FileComparisonModal({ isOpen, onClose, fileA, fileB }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' or 'overlay'

  if (!isOpen || !fileA || !fileB) return null;

  const isBothImages =
    (fileA.file_category === 'photos' || ['jpg', 'jpeg', 'png', 'webp'].includes(fileA.extension?.toLowerCase())) &&
    (fileB.file_category === 'photos' || ['jpg', 'jpeg', 'png', 'webp'].includes(fileB.extension?.toLowerCase()));

  const sizeDiff = fileA.file_size - fileB.file_size;
  const percentDiff = fileB.file_size > 0 ? (((fileA.file_size - fileB.file_size) / fileB.file_size) * 100).toFixed(1) : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Side-by-Side Asset Comparison" maxWidth="max-w-5xl">
      <div className="space-y-6">
        {/* Toggle Mode Toolbar */}
        {isBothImages && (
          <div className="flex items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-800">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-400">
              Inspection Mode
            </span>
            <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('sideBySide')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'sideBySide' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-surface-600 dark:text-surface-400'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setViewMode('overlay')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'overlay' ? 'bg-white dark:bg-surface-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-surface-600 dark:text-surface-400'
                }`}
              >
                Interactive Slider
              </button>
            </div>
          </div>
        )}

        {/* Visual Comparison Stage */}
        {isBothImages ? (
          viewMode === 'sideBySide' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* File A Box */}
              <div className="space-y-2">
                <div className="h-64 sm:h-80 bg-surface-100 dark:bg-surface-800/60 rounded-2xl p-2 flex items-center justify-center overflow-hidden border border-surface-200 dark:border-surface-700">
                  <img
                    src={`/api/files/${fileA.id}/preview`}
                    alt={fileA.original_name}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-200 dark:border-surface-700 text-xs space-y-1">
                  <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                    File A: {fileA.original_name}
                  </p>
                  <p className="text-surface-500">
                    Size: {formatBytes(fileA.file_size)} • {fileA.width ? `${fileA.width}×${fileA.height}px` : 'Dimensions N/A'}
                  </p>
                </div>
              </div>

              {/* File B Box */}
              <div className="space-y-2">
                <div className="h-64 sm:h-80 bg-surface-100 dark:bg-surface-800/60 rounded-2xl p-2 flex items-center justify-center overflow-hidden border border-surface-200 dark:border-surface-700">
                  <img
                    src={`/api/files/${fileB.id}/preview`}
                    alt={fileB.original_name}
                    className="max-h-full max-w-full object-contain rounded-xl"
                  />
                </div>
                <div className="p-3 bg-surface-50 dark:bg-surface-800/40 rounded-xl border border-surface-200 dark:border-surface-700 text-xs space-y-1">
                  <p className="font-semibold text-surface-900 dark:text-surface-100 truncate">
                    File B: {fileB.original_name}
                  </p>
                  <p className="text-surface-500">
                    Size: {formatBytes(fileB.file_size)} • {fileB.width ? `${fileB.width}×${fileB.height}px` : 'Dimensions N/A'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Slider Overlay mode
            <div className="space-y-3">
              <div className="relative h-80 bg-surface-900 rounded-2xl overflow-hidden flex items-center justify-center select-none border border-surface-700">
                {/* Background image (File B) */}
                <img
                  src={`/api/files/${fileB.id}/preview`}
                  alt={fileB.original_name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {/* Foreground image (File A) with clip-path */}
                <img
                  src={`/api/files/${fileA.id}/preview`}
                  alt={fileA.original_name}
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {/* Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-10"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-surface-800">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-surface-500 font-medium">
                <span>File A: {fileA.original_name}</span>
                <span>File B: {fileB.original_name}</span>
              </div>
            </div>
          )
        ) : (
          // Generic document/file comparison
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 space-y-3">
              <div className="flex items-center gap-2">
                {getFileIcon(fileA.file_category, fileA.extension)}
                <h4 className="font-semibold text-sm truncate">{fileA.original_name}</h4>
              </div>
              <div className="text-xs space-y-1.5 text-surface-600 dark:text-surface-400">
                <p>Size: {formatBytes(fileA.file_size)}</p>
                <p>Type: {fileA.file_category} ({fileA.extension})</p>
                <p>Uploaded: {formatDateTime(fileA.created_at)}</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/40 space-y-3">
              <div className="flex items-center gap-2">
                {getFileIcon(fileB.file_category, fileB.extension)}
                <h4 className="font-semibold text-sm truncate">{fileB.original_name}</h4>
              </div>
              <div className="text-xs space-y-1.5 text-surface-600 dark:text-surface-400">
                <p>Size: {formatBytes(fileB.file_size)}</p>
                <p>Type: {fileB.file_category} ({fileB.extension})</p>
                <p>Uploaded: {formatDateTime(fileB.created_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Metrics Delta Table */}
        <div className="rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden text-xs">
          <div className="bg-surface-100 dark:bg-surface-800 px-4 py-2.5 font-semibold text-surface-700 dark:text-surface-300">
            Comparative Metric Analysis
          </div>
          <div className="divide-y divide-surface-200 dark:divide-surface-800 bg-white dark:bg-surface-900">
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-surface-400 font-medium">Metric</span>
              <span className="font-semibold truncate">File A: {fileA.original_name}</span>
              <span className="font-semibold truncate">File B: {fileB.original_name}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-surface-500">File Size</span>
              <span>{formatBytes(fileA.file_size)}</span>
              <span>
                {formatBytes(fileB.file_size)}{' '}
                <span className={sizeDiff > 0 ? 'text-amber-500 font-medium' : 'text-emerald-500 font-medium'}>
                  ({sizeDiff > 0 ? `+${percentDiff}% larger` : `${percentDiff}% smaller`})
                </span>
              </span>
            </div>
            {fileA.width && fileB.width && (
              <div className="grid grid-cols-3 px-4 py-2.5">
                <span className="text-surface-500">Dimensions</span>
                <span>{fileA.width} × {fileA.height} px</span>
                <span>{fileB.width} × {fileB.height} px</span>
              </div>
            )}
            <div className="grid grid-cols-3 px-4 py-2.5">
              <span className="text-surface-500">SHA-256 Checksum</span>
              <span className="font-mono text-[10px] truncate">{fileA.file_hash || '—'}</span>
              <span className="font-mono text-[10px] truncate">
                {fileB.file_hash === fileA.file_hash ? (
                  <span className="text-rose-500 font-bold">Identical Hash (Exact Duplicate)</span>
                ) : (
                  fileB.file_hash || '—'
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-surface-200 dark:bg-surface-800 hover:bg-surface-300 dark:hover:bg-surface-700 text-surface-800 dark:text-surface-200 rounded-xl text-xs sm:text-sm font-semibold"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </Modal>
  );
}

