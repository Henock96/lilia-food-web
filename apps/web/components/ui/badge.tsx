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
  primary:   'bg-tomato-600/12 text-tomato-700',
  success:   'bg-[#27A660]/12 text-[#27A660]',
  warning:   'bg-[#D4970A]/12 text-[#D4970A]',
  danger:    'bg-[#D63F28]/12 text-[#D63F28]',
  info:      'bg-[#2B4A6B]/12 text-[#2B4A6B]',
  neutral:   'bg-cream-200 text-ink-700',
  open:      'bg-success text-white',
  closed:    'bg-ink-500 text-white',
  pending:   'bg-[#D4970A]/12 text-[#D4970A]',
  confirmed: 'bg-[#2B4A6B]/12 text-[#2B4A6B]',
  preparing: 'bg-tomato-600/12 text-tomato-700',
  ready:     'bg-[#27A660]/12 text-[#1A8A4A]',
  'en-route':'bg-tomato-600/12 text-tomato-700',
  delivered: 'bg-[#27A660]/15 text-[#1A8A4A]',
  cancelled: 'bg-[#D63F28]/12 text-[#D63F28]',
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
