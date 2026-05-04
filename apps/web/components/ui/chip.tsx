'use client';

import { cn } from '@lilia/utils';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export function Chip({ label, selected, onClick, icon, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-pill text-[13px] font-medium',
        'border-[1.5px] transition-all duration-150 whitespace-nowrap',
        selected
          ? 'bg-primary-500/10 border-primary-500 text-primary-500 font-semibold'
          : 'bg-white dark:bg-dark-card border-charcoal-100 dark:border-dark-border text-charcoal-500 dark:text-charcoal-300 hover:border-primary-500 hover:text-primary-500',
        className,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface CategoryChipProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ icon, label, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 border-none bg-transparent cursor-pointer min-w-[60px]"
    >
      <div className={cn(
        'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
        active
          ? 'bg-primary-500 shadow-[0_4px_12px_rgba(232,84,31,.4)]'
          : 'bg-primary-500/10 hover:bg-primary-500/20',
      )}>
        <span className={cn('text-xl', active ? 'text-white' : 'text-primary-500')}>
          {icon}
        </span>
      </div>
      <span className={cn(
        'text-[11px] text-center leading-tight max-w-[60px]',
        active ? 'font-semibold text-primary-500' : 'font-normal text-charcoal-500 dark:text-charcoal-300',
      )}>
        {label}
      </span>
    </button>
  );
}
