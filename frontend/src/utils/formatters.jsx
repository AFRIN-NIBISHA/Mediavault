import React from 'react';
import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  Code,
  FileSpreadsheet
} from 'lucide-react';

export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getFileCategoryColor(category) {
  switch (category) {
    case 'photos':
      return 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800';
    case 'documents':
      return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800';
    case 'pdfs':
      return 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
    case 'videos':
      return 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800';
    case 'audio':
      return 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    case 'archives':
      return 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-200 dark:border-fuchsia-800';
    default:
      return 'text-surface-500 bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700';
  }
}

export function getFileIcon(category, extension = '', className = 'w-5 h-5') {
  const ext = (extension || '').toLowerCase();

  if (category === 'photos' || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return <Image className={`${className} text-purple-600`} />;
  }
  if (category === 'pdfs' || ext === 'pdf') {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (category === 'videos' || ['mp4', 'mov', 'webm', 'mkv'].includes(ext)) {
    return <Film className={`${className} text-purple-500`} />;
  }
  if (category === 'audio' || ['mp3', 'wav', 'ogg'].includes(ext)) {
    return <Music className={`${className} text-amber-500`} />;
  }
  if (category === 'archives' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className={`${className} text-orange-500`} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-emerald-600`} />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'md'].includes(ext)) {
    return <Code className={`${className} text-indigo-500`} />;
  }

  return <File className={`${className} text-surface-500`} />;
}

