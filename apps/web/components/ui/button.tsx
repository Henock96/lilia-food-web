'use client';

import { forwardRef } from 'react';
import { cn } from '@lilia/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'muted';
type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-primary-500 text-white hover:bg-primary-600 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0',
  secondary: 'border-[1.5px] border-primary-500 text-primary-500 hover:bg-primary-500/8',
  ghost:     'bg-cream-200 text-charcoal-500 hover:bg-charcoal-100 dark:bg-dark-muted dark:text-charcoal-300 dark:hover:bg-dark-border',
  danger:    'bg-danger text-white hover:opacity-90',
  muted:     'bg-cream-200 text-charcoal-400 hover:bg-charcoal-100 dark:bg-dark-muted dark:text-charcoal-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] rounded-md',
  sm: 'px-3.5 py-1.5 text-xs rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-pill',
  lg: 'px-7 py-3.5 text-[15px] rounded-pill',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, leftIcon, rightIcon, disabled, className, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
          'tracking-[-0.01em] whitespace-nowrap select-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-45 cursor-not-allowed pointer-events-none',
          'active:scale-[0.97]',
          className,
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
