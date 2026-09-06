'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface NavDropdownItem {
  href: string;
  label: string;
}

export interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
  className?: string;
}

export function NavDropdown({ label, items, className }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-link)]',
          open && 'bg-[var(--surface-sunken)] text-[var(--text-link)]'
        )}
      >
        {label}
        <span aria-hidden="true" className={cn('text-xs transition-transform', open && 'rotate-180')}>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[190px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 shadow-glow-sm">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-link)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
