'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
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
  neutral: 'border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)]',
  success: 'border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
  warning: 'border-transparent bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]',
  danger: 'border-transparent bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
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
  const [mounted, setMounted] = useState(false);

  // Defer the portal to a client-only commit: the first client render must
  // match the server's (which renders nothing, since `document` doesn't exist
  // there) or React logs a hydration mismatch.
  useEffect(() => setMounted(true), []);

  if (!mounted || !ctx) return null;

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
            className={cn('w-80 rounded-2xl border px-4 py-3 shadow-glow-sm', VARIANT_CLASSES[toast.variant])}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description && <p className="mt-1 text-xs opacity-90">{toast.description}</p>}
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
