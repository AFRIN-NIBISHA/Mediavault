import React from 'react';

export function SkeletonLoader({ type = 'card', count = 4, className = '' }) {
  if (type === 'card') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 animate-pulse space-y-3"
          >
            <div className="w-full h-36 bg-surface-200 dark:bg-surface-800 rounded-xl" />
            <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-3/4" />
            <div className="flex justify-between">
              <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/4" />
              <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-14 px-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/50 dark:bg-surface-900/50 animate-pulse flex items-center justify-between"
          >
            <div className="flex items-center space-x-3 w-1/3">
              <div className="w-8 h-8 rounded-lg bg-surface-200 dark:bg-surface-800" />
              <div className="h-4 bg-surface-200 dark:bg-surface-800 rounded w-2/3" />
            </div>
            <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-20" />
            <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-24" />
            <div className="h-3 bg-surface-200 dark:bg-surface-800 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`h-32 rounded-2xl bg-surface-200 dark:bg-surface-800 animate-pulse ${className}`} />
  );
}

