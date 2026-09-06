import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

/** Link back to a parent list view — drop above the `<h1>` on any detail/create page. */
export function BackButton({ href, label = 'Back', className }: BackButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[var(--text-tertiary)] transition hover:text-[var(--text-link)]',
        className
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
        <path d="M12 5l-6 5 6 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
