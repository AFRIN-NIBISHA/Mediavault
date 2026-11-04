import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
        {toasts.map(toast => {
          const typeStyles = {
            success: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-500 text-emerald-900 dark:text-emerald-100',
            error: 'bg-rose-50 dark:bg-rose-950/80 border-rose-500 text-rose-900 dark:text-rose-100',
            warning: 'bg-amber-50 dark:bg-amber-950/80 border-amber-500 text-amber-900 dark:text-amber-100',
            info: 'bg-brand-50 dark:bg-brand-950/80 border-brand-500 text-brand-900 dark:text-brand-100'
          }[toast.type] || 'bg-surface-50 dark:bg-surface-900 border-surface-300 text-surface-900 dark:text-white';

          const icon = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
            error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
            warning: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
            info: <Info className="w-5 h-5 text-brand-500 flex-shrink-0" />
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-lg transition-all animate-slideIn ${typeStyles}`}
            >
              {icon}
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

