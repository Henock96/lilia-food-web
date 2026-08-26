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
          ? 'bg-tomato-600/10 border-tomato-600 text-tomato-600 font-semibold'
          : 'bg-white border-cream-300 text-ink-700 hover:border-tomato-600 hover:text-tomato-600',
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
          ? 'bg-tomato-600 shadow-[0_4px_12px_rgba(210,55,26,.4)]'
          : 'bg-tomato-600/10 hover:bg-tomato-600/20',
      )}>
        <span className={cn('text-xl', active ? 'text-white' : 'text-tomato-600')}>
          {icon}
        </span>
      </div>
      <span className={cn(
        'text-[11px] text-center leading-tight max-w-[60px]',
        active ? 'font-semibold text-tomato-600' : 'font-normal text-ink-700',
      )}>
        {label}
      </span>
    </button>
  );
}
