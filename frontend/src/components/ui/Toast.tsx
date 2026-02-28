'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border shadow-card dark:border-slate-700"
      dir="rtl"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          type === 'success'
            ? 'border-brand-orange/30 bg-brand-orange/10 text-brand-orange-dark dark:bg-brand-orange/20 dark:text-brand-orange'
            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
        }`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-lg">
          {type === 'success' ? '✓' : '!'}
        </span>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1 hover:bg-black/5"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  );
}
