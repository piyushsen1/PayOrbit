'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  label?: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export function RadioGroup({ label, name, options, value, onChange, error, className, disabled }: RadioGroupProps) {
  const generatedId = useId();

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      )}
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const optionId = `${generatedId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'flex items-center gap-2 text-sm text-[var(--text-secondary)]',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={disabled}
                onChange={() => onChange?.(option.value)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-[var(--status-danger-fg)]">{error}</p>}
    </div>
  );
}
