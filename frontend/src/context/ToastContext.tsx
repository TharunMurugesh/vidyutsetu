import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const value: ToastContextType = {
    toast: addToast,
    success: (title, message) => addToast('success', title, message),
    error: (title, message) => addToast('error', title, message),
    info: (title, message) => addToast('info', title, message),
    warning: (title, message) => addToast('warning', title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:right-5 sm:translate-x-0 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
              t.type === 'success'
                ? 'bg-white dark:bg-slate-900/95 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-emerald-950/20'
                : t.type === 'error'
                ? 'bg-white dark:bg-slate-900/95 border-rose-500/40 text-rose-800 dark:text-rose-300 shadow-rose-950/20'
                : t.type === 'warning'
                ? 'bg-white dark:bg-slate-900/95 border-amber-500/40 text-amber-800 dark:text-amber-300 shadow-amber-950/20'
                : 'bg-white dark:bg-slate-900/95 border-blue-500/40 text-blue-800 dark:text-blue-300 shadow-blue-950/20'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
            </div>
            <div className="flex-1 text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
              {t.message && <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

