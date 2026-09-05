import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Prev/Next pager for any list endpoint's `meta` block. Renders nothing for a single page. */
export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm text-[var(--text-tertiary)]', className)}>
      <span>
        Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
