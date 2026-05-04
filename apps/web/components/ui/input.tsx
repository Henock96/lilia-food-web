'use client';

import { forwardRef, useState } from 'react';
import { cn } from '@lilia/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, success, leftIcon, rightElement, wrapperClassName, className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label className="text-xs font-semibold text-charcoal-500 dark:text-charcoal-300">
            {label}
          </label>
        )}

        <div className={cn(
          'flex items-center gap-2.5 bg-white dark:bg-dark-card',
          'border-[1.5px] rounded-md px-3.5 py-3 transition-all duration-200',
          focused
            ? 'border-primary-500 shadow-[0_0_0_3px_rgba(232,84,31,.12)]'
            : error
              ? 'border-danger'
              : success
                ? 'border-success'
                : 'border-charcoal-100 dark:border-dark-border',
        )}>
          {leftIcon && (
            <span className={cn(
              'flex-shrink-0 transition-colors',
              focused ? 'text-primary-500' : 'text-charcoal-400',
            )}>
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            className={cn(
              'flex-1 bg-transparent border-none outline-none',
              'text-sm text-charcoal-700 dark:text-charcoal-50 placeholder:text-charcoal-400',
              'font-sans',
              className,
            )}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e)  => { setFocused(false); onBlur?.(e); }}
            {...props}
          />

          {rightElement && (
            <span className="flex-shrink-0 text-charcoal-400">{rightElement}</span>
          )}
        </div>

        {error && (
          <p className="text-[11px] font-medium text-danger">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
