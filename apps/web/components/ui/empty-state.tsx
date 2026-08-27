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
  /** Réessai en cours (ex. `useTransition`) : bouton désactivé et libellé
   * différent, pour éviter les clics multiples pendant un cold start backend.
   * Couleurs pleines (pas d'opacité réduite sur le texte). */
  retrying?: boolean;
}

export function ErrorState({ onRetry, retrying, action, ...props }: ErrorStateProps) {
  return (
    <EmptyState
      {...props}
      action={action ?? (onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          aria-busy={retrying}
          className="mt-2 px-5 py-2 text-sm font-semibold rounded-pill border-[1.5px] transition-colors border-tomato-600 text-tomato-700 hover:bg-tomato-100 disabled:cursor-not-allowed disabled:border-cream-300 disabled:bg-cream-100 disabled:text-ink-500 disabled:hover:bg-cream-100"
        >
          {retrying ? 'Nouvel essai…' : 'Réessayer'}
        </button>
      ))}
    />
  );
}
