import { cn } from '@lilia/utils';

type BadgeVariant =
  | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  | 'neutral' | 'open' | 'closed'
  | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'en-route' | 'delivered' | 'cancelled';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary:   'bg-primary-500/12 text-primary-500',
  success:   'bg-[#27A660]/12 text-[#27A660] dark:text-[#4DC280] dark:bg-[#4DC280]/12',
  warning:   'bg-[#D4970A]/12 text-[#D4970A] dark:text-[#F5C44A] dark:bg-[#F5C44A]/12',
  danger:    'bg-[#D63F28]/12 text-[#D63F28] dark:text-[#F4826E] dark:bg-[#F4826E]/12',
  info:      'bg-[#2B4A6B]/12 text-[#2B4A6B] dark:text-[#6A9ABF] dark:bg-[#6A9ABF]/12',
  neutral:   'bg-cream-200 text-charcoal-500 dark:bg-dark-muted dark:text-charcoal-300',
  open:      'bg-[#27A660]/15 text-[#1A8A4A] dark:text-[#4DC280] dark:bg-[#4DC280]/15',
  closed:    'bg-[#D63F28]/12 text-[#D63F28] dark:text-[#F4826E] dark:bg-[#F4826E]/12',
  pending:   'bg-[#D4970A]/12 text-[#D4970A] dark:text-[#F5C44A] dark:bg-[#F5C44A]/12',
  confirmed: 'bg-[#2B4A6B]/12 text-[#2B4A6B] dark:text-[#6A9ABF] dark:bg-[#6A9ABF]/12',
  preparing: 'bg-primary-500/12 text-primary-500',
  ready:     'bg-[#27A660]/12 text-[#1A8A4A] dark:text-[#4DC280]',
  'en-route':'bg-primary-500/12 text-primary-500',
  delivered: 'bg-[#27A660]/15 text-[#1A8A4A] dark:text-[#4DC280]',
  cancelled: 'bg-[#D63F28]/12 text-[#D63F28] dark:text-[#F4826E]',
};

export function Badge({ label, variant = 'neutral', dot, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
      variantClasses[variant],
      className,
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

/** Mappe un OrderStatus backend vers le variant Badge correspondant */
export function orderStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    PENDING_PAYMENT: 'pending',
    CONFIRMED:       'confirmed',
    PREPARING:       'preparing',
    READY:           'ready',
    ASSIGNED:        'confirmed',
    EN_ROUTE:        'en-route',
    DELIVERED:       'delivered',
    CANCELLED:       'cancelled',
  };
  return map[status] ?? 'neutral';
}

export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'En attente',
    CONFIRMED:       'Confirmée',
    PREPARING:       'En préparation',
    READY:           'Prête',
    ASSIGNED:        'Livreur assigné',
    EN_ROUTE:        'En route',
    DELIVERED:       'Livrée',
    CANCELLED:       'Annulée',
  };
  return map[status] ?? status;
}
