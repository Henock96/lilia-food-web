'use client';

import { cn } from '@lilia/utils';

interface QuantityStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function QuantityStepper({ value, onChange, min = 1, max = 99, className }: QuantityStepperProps) {
  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className={cn(
          'w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-150',
          'text-lg font-bold border-none',
          value <= min
            ? 'bg-cream-200 text-charcoal-400 cursor-not-allowed dark:bg-dark-muted'
            : 'bg-primary-500/15 text-primary-500 hover:bg-primary-500/25 cursor-pointer',
        )}
        aria-label="Diminuer"
      >
        −
      </button>

      <span className="text-[17px] font-bold text-charcoal-700 dark:text-charcoal-50 min-w-[24px] text-center tabular-nums">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className={cn(
          'w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-150',
          'text-lg font-bold border-none text-white',
          value >= max
            ? 'bg-charcoal-200 cursor-not-allowed dark:bg-dark-border'
            : 'bg-primary-500 hover:bg-primary-600 cursor-pointer',
        )}
        aria-label="Augmenter"
      >
        +
      </button>
    </div>
  );
}
