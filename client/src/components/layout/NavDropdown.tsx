'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export interface NavDropdownItem {
  href: string;
  label: string;
}

export interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
}

export function NavDropdown({ label, items }: NavDropdownProps) {
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
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-link)]"
      >
        {label}
        <span aria-hidden="true">▾</span>
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
