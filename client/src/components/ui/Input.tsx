import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            'w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition',
            'placeholder:text-[var(--text-tertiary)]',
            'disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none',
            error && 'border-[var(--status-danger-fg)]',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-[var(--status-danger-fg)]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--text-tertiary)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
