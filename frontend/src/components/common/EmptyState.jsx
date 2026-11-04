import React from 'react';
import { FolderOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'Get started by uploading files or creating a new item.',
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-surface-300 dark:border-surface-800 bg-white/30 dark:bg-surface-900/30 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-subtle">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      <p className="mt-1 text-sm text-surface-500 dark:text-surface-400 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all transform active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

