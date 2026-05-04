import { cn } from '@lilia/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3 px-8 py-12 text-center',
      className,
    )}>
      {icon && (
        <div className="w-20 h-20 rounded-full bg-primary-500/10 flex items-center justify-center mb-2 text-4xl text-primary-500/60">
          {icon}
        </div>
      )}
      <p className="text-lg font-bold text-charcoal-700 dark:text-charcoal-50">{title}</p>
      {subtitle && (
        <p className="text-[13px] text-charcoal-400 leading-relaxed max-w-[260px]">{subtitle}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

interface ErrorStateProps extends EmptyStateProps {
  onRetry?: () => void;
}

export function ErrorState({ onRetry, action, ...props }: ErrorStateProps) {
  return (
    <EmptyState
      {...props}
      action={action ?? (onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-5 py-2 text-sm font-semibold text-primary-500 border-[1.5px] border-primary-500 rounded-pill hover:bg-primary-500/8 transition-colors"
        >
          Réessayer
        </button>
      ))}
    />
  );
}
