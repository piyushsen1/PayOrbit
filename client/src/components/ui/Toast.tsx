'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ToastVariant = 'neutral' | 'success' | 'warning' | 'danger';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type ToastInput = Omit<Toast, 'id'> & { id?: string; durationMs?: number };

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION_MS = 4000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  neutral: 'border-border bg-surface text-text',
  success: 'border-success/30 bg-surface text-success',
  warning: 'border-warning/30 bg-surface text-warning',
  danger: 'border-danger/30 bg-surface text-danger',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ id, durationMs = DEFAULT_DURATION_MS, ...toast }: ToastInput) => {
      const toastId = id ?? crypto.randomUUID();
      setToasts((prev) => [...prev, { id: toastId, ...toast }]);
      if (durationMs > 0) {
        setTimeout(() => dismissToast(toastId), durationMs);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (typeof document === 'undefined' || !ctx) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {ctx.toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            role="status"
            className={cn(
              'w-80 rounded-md border px-4 py-3 shadow-lg',
              VARIANT_CLASSES[toast.variant]
            )}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description && <p className="mt-1 text-sm opacity-90">{toast.description}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
