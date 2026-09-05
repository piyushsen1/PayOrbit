import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: AvatarSize;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 'md', className, ...props }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] font-semibold text-[var(--primary)]',
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {getInitials(name)}
    </div>
  );
}
