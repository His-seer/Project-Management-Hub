'use client';

import { createContext, useCallback, useContext, useState, useRef } from 'react';
import { X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  undoFn?: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface ToastContextValue {
  showToast: (message: string, undoFn?: () => void) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const t = prev.find((t) => t.id === id);
      if (t) clearTimeout(t.timeoutId);
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const showToast = useCallback(
    (message: string, undoFn?: () => void) => {
      const id = String(++counter.current);
      const timeoutId = setTimeout(() => dismiss(id), 5000);
      setToasts((prev) => [...prev, { id, message, undoFn, timeoutId }]);
    },
    [dismiss],
  );

  const handleUndo = useCallback(
    (toast: ToastItem) => {
      toast.undoFn?.();
      dismiss(toast.id);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white text-sm rounded-lg shadow-lg border border-slate-700 animate-in slide-in-from-bottom-2 min-w-[260px]"
            >
              <span className="flex-1">{t.message}</span>
              {t.undoFn && (
                <button
                  onClick={() => handleUndo(t)}
                  className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Undo
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
