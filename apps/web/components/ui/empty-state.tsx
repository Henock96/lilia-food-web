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
        <div className="w-20 h-20 rounded-full bg-cream-200 flex items-center justify-center mb-2 text-4xl text-ink-300">
          {icon}
        </div>
      )}
      <p className="text-lg font-bold text-ink-900">{title}</p>
      {subtitle && (
        <p className="text-[13px] text-ink-500 leading-relaxed max-w-[260px]">{subtitle}</p>
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
          className="mt-2 px-5 py-2 text-sm font-semibold text-tomato-700 border-[1.5px] border-tomato-600 rounded-pill hover:bg-tomato-100 transition-colors"
        >
          Réessayer
        </button>
      ))}
    />
  );
}
