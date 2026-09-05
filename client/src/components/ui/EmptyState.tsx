import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-12 text-center',
        className
      )}
    >
      {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        {description && <p className="text-xs text-[var(--text-tertiary)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
