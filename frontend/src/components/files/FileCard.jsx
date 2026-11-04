import React, { useState } from 'react';
import {
  Star,
  MoreVertical,
  Eye,
  Download,
  Share2,
  Wand2,
  Edit2,
  FolderInput,
  Copy,
  Clock,
  Trash2,
  Columns
} from 'lucide-react';
import { formatBytes, formatDate, getFileIcon, getFileCategoryColor } from '../../utils/formatters';

export function FileCard({
  file,
  isSelected,
  onSelect,
  onPreview,
  onToggleFavorite,
  onShare,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onOpenVersions,
  onCompare
}) {
  const [showMenu, setShowMenu] = useState(false);

  const isImage = file.file_category === 'photos' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(file.extension?.toLowerCase());

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 bg-white dark:bg-surface-900 flex flex-col ${
        showMenu ? 'z-40' : 'z-0 hover:z-20'
      } ${
        isSelected
          ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-md'
          : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-premium'
      }`}
    >
      {/* Selection checkbox */}
      <div className="absolute top-3 left-3 z-20">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(file.id);
          }}
          className={`w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 cursor-pointer transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      </div>

      {/* Quick Delete Trash Button */}
      {onDelete && (
        <button
          type="button"
          title="Move to Trash"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file);
          }}
          className="absolute top-3 right-18 z-20 p-1.5 rounded-lg text-surface-400 hover:text-rose-500 bg-white/80 dark:bg-surface-800/80 shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Favorite Star Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(file.id);
        }}
        className={`absolute top-3 right-10 z-20 p-1.5 rounded-lg transition-all ${
          file.is_favorite
            ? 'text-amber-400 bg-white/80 dark:bg-surface-800/80 shadow-sm opacity-100'
            : 'text-surface-400 hover:text-amber-400 bg-white/80 dark:bg-surface-800/80 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Star className={`w-3.5 h-3.5 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
      </button>

      {/* Options Menu Button */}
      <div className="absolute top-3 right-3 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 rounded-lg bg-white/80 dark:bg-surface-800/80 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 shadow-sm transition-all"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 mt-1 w-48 max-h-72 overflow-y-auto py-1.5 bg-white dark:bg-surface-900 rounded-2xl shadow-elevated border border-surface-200 dark:border-surface-800 z-50 text-xs text-surface-700 dark:text-surface-300 animate-scaleUp">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onPreview(file);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>

              <button
                onClick={() => {
                  setShowMenu(false);
                  window.location.href = `/api/files/${file.id}/download`;
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>

              {onShare && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onShare(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share Link
                </button>
              )}

              {onCompare && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onCompare(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <Columns className="w-3.5 h-3.5" /> Compare with...
                </button>
              )}

              {onOpenVersions && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenVersions(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <Clock className="w-3.5 h-3.5" /> Version History
                </button>
              )}

              {onRename && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRename(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Rename
                </button>
              )}

              {onMove && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onMove(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <FolderInput className="w-3.5 h-3.5" /> Move
                </button>
              )}

              {onCopy && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onCopy(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800 text-left"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate Copy
                </button>
              )}

              <div className="my-1 border-t border-surface-100 dark:border-surface-800" />

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(file);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-left font-bold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Move to Trash (Delete)
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Visual Thumbnail Stage */}
      <div
        onClick={() => onPreview(file)}
        className="h-36 rounded-t-2xl bg-surface-50 dark:bg-surface-800/50 flex items-center justify-center overflow-hidden cursor-pointer relative group-hover:opacity-95 transition-opacity"
      >
        {isImage ? (
          <img
            src={`/api/files/${file.id}/preview`}
            alt={file.original_name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-surface-900 flex items-center justify-center shadow-subtle mb-2">
              {getFileIcon(file.file_category, file.extension, 'w-7 h-7')}
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getFileCategoryColor(file.file_category)}`}>
              {file.extension || file.file_category}
            </span>
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h4
            onClick={() => onPreview(file)}
            title={file.original_name}
            className="text-xs font-semibold text-surface-900 dark:text-surface-100 truncate cursor-pointer hover:text-brand-600 dark:hover:text-brand-400"
          >
            {file.original_name}
          </h4>
          <p className="text-[11px] text-surface-400 mt-0.5">
            {formatBytes(file.file_size)} • {formatDate(file.created_at)}
          </p>
        </div>

        {file.folder_name && (
          <div className="mt-2 text-[10px] text-surface-500 dark:text-surface-400 flex items-center gap-1 truncate">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: file.folder_color || '#0c87eb' }}
            />
            <span className="truncate">{file.folder_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

