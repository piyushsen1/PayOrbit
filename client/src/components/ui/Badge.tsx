import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'teal';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Optional leading status dot, per the design system's badge/pill pattern. */
  dot?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]',
  danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)]',
  teal: 'bg-[var(--status-teal-bg)] text-[var(--status-teal-fg)]',
};

export function Badge({ className, variant = 'neutral', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
