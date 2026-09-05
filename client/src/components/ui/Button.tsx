import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--primary)] text-[var(--text-on-primary)] hover:bg-[var(--primary-hover)]',
  secondary:
    'border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
  outline:
    'border border-[var(--border-default)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]',
  danger: 'bg-[var(--status-danger-fg)] text-white hover:opacity-90',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-2.5 py-1.5 text-xs gap-1.5',
  md: 'rounded-xl px-4 py-2.5 text-sm gap-2',
  lg: 'rounded-2xl px-4 py-3 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition',
          'disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
