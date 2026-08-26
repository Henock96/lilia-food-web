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
          <label className="text-xs font-semibold text-ink-700">
            {label}
          </label>
        )}

        <div className={cn(
          'flex items-center gap-2.5 bg-white',
          'border-[1.5px] rounded-md px-3.5 py-3 transition-all duration-200',
          focused
            ? 'border-tomato-500 ring-2 ring-tomato-100'
            : error
              ? 'border-danger'
              : success
                ? 'border-success'
                : 'border-cream-300',
        )}>
          {leftIcon && (
            <span className={cn(
              'flex-shrink-0 transition-colors',
              focused ? 'text-tomato-600' : 'text-ink-500',
            )}>
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            className={cn(
              'flex-1 bg-transparent border-none outline-none',
              'text-sm text-ink-900 placeholder:text-ink-500',
              'font-sans',
              className,
            )}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onBlur={(e)  => { setFocused(false); onBlur?.(e); }}
            {...props}
          />

          {rightElement && (
            <span className="flex-shrink-0 text-ink-500">{rightElement}</span>
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
