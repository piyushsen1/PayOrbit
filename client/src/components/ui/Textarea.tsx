import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
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
          <p id={`${textareaId}-error`} className="text-xs text-[var(--status-danger-fg)]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${textareaId}-hint`} className="text-xs text-[var(--text-tertiary)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
