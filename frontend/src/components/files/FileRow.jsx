import React, { useState } from 'react';
import {
  Star,
  MoreVertical,
  Eye,
  Download,
  Share2,
  Edit2,
  FolderInput,
  Copy,
  Clock,
  Trash2,
  Columns
} from 'lucide-react';
import { formatBytes, formatDate, getFileIcon, getFileCategoryColor } from '../../utils/formatters';

export function FileRow({
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

  return (
    <tr
      className={`border-b border-slate-200/60 transition-colors text-xs ${
        isSelected
          ? 'bg-sky-50/70 text-sky-950 font-medium'
          : 'hover:bg-slate-50/80'
      }`}
    >
      {/* Checkbox */}
      <td className="w-10 px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(file.id)}
          className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
        />
      </td>

      {/* Favorite Star */}
      <td className="w-8 px-2 py-3 text-center">
        <button
          type="button"
          onClick={() => onToggleFavorite(file.id)}
          className={`p-1 rounded transition-colors ${
            file.is_favorite ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${file.is_favorite ? 'fill-amber-400' : ''}`} />
        </button>
      </td>

      {/* Name and Icon */}
      <td className="px-3 py-3 font-medium text-slate-900 max-w-xs sm:max-w-md">
        <div
          onClick={() => onPreview(file)}
          className="flex items-center space-x-2.5 cursor-pointer group truncate"
        >
          {getFileIcon(file.file_category, file.extension, 'w-5 h-5 flex-shrink-0')}
          <span className="truncate group-hover:text-sky-600 transition-colors">
            {file.original_name}
          </span>
        </div>
      </td>

      {/* Category */}
      <td className="px-3 py-3 hidden md:table-cell">
        <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${getFileCategoryColor(file.file_category)}`}>
          {file.extension || file.file_category}
        </span>
      </td>

      {/* File Size */}
      <td className="px-3 py-3 text-surface-500 whitespace-nowrap">
        {formatBytes(file.file_size)}
      </td>

      {/* Folder */}
      <td className="px-3 py-3 text-surface-500 hidden lg:table-cell truncate max-w-[120px]">
        {file.folder_name ? (
          <span className="flex items-center gap-1.5 truncate">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: file.folder_color || '#0c87eb' }}
            />
            <span className="truncate">{file.folder_name}</span>
          </span>
        ) : (
          'Root'
        )}
      </td>

      {/* Date */}
      <td className="px-3 py-3 text-surface-400 whitespace-nowrap hidden sm:table-cell">
        {formatDate(file.created_at)}
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-right relative whitespace-nowrap">
        {onDelete && (
          <button
            type="button"
            title="Move to Trash"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(file);
            }}
            className="p-1 mr-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-surface-400 hover:text-rose-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-800"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
            <div className="absolute right-4 mt-1 w-48 max-h-72 overflow-y-auto py-1.5 bg-white rounded-2xl shadow-apple border border-slate-200/80 z-50 text-xs text-left animate-in fade-in duration-150">
              <button
                onClick={() => { setShowMenu(false); onPreview(file); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" /> Preview
              </button>
              <button
                onClick={() => { setShowMenu(false); window.location.href = `/api/files/${file.id}/download`; }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Download
              </button>
              {onShare && (
                <button
                  onClick={() => { setShowMenu(false); onShare(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share Link
                </button>
              )}
              {onCompare && (
                <button
                  onClick={() => { setShowMenu(false); onCompare(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800"
                >
                  <Columns className="w-3.5 h-3.5" /> Compare with...
                </button>
              )}
              {onOpenVersions && (
                <button
                  onClick={() => { setShowMenu(false); onOpenVersions(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800"
                >
                  <Clock className="w-3.5 h-3.5" /> Versions
                </button>
              )}
              {onRename && (
                <button
                  onClick={() => { setShowMenu(false); onRename(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Rename
                </button>
              )}
              {onMove && (
                <button
                  onClick={() => { setShowMenu(false); onMove(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800"
                >
                  <FolderInput className="w-3.5 h-3.5" /> Move
                </button>
              )}
              {onCopy && (
                <button
                  onClick={() => { setShowMenu(false); onCopy(file); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-50 dark:hover:bg-surface-800"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
              )}
              <div className="my-1 border-t border-surface-100 dark:border-surface-800" />
              {onDelete && (
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); onDelete(file); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Move to Trash (Delete)
                </button>
              )}
            </div>
          </>
        )}
      </td>
    </tr>
  );
}

