import { cn } from '@lilia/utils';

const STEPS = [
  { key: 'CONFIRMED',  label: 'Confirmée' },
  { key: 'PREPARING',  label: 'Préparation' },
  { key: 'READY',      label: 'Prête' },
  { key: 'EN_ROUTE',   label: 'En route' },
  { key: 'DELIVERED',  label: 'Livrée' },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PENDING_PAYMENT: -1,
  CONFIRMED:       0,
  PREPARING:       1,
  READY:           2,
  ASSIGNED:        2,
  EN_ROUTE:        3,
  DELIVERED:       4,
  CANCELLED:       -2,
};

interface OrderStatusStepperProps {
  status: string;
  className?: string;
}

export function OrderStatusStepper({ status, className }: OrderStatusStepperProps) {
  if (status === 'CANCELLED' || status === 'PENDING_PAYMENT') return null;

  const currentStep = STATUS_ORDER[status] ?? -1;

  return (
    <div className={cn('w-full', className)}>
      {/* Dots + lines */}
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const done    = i <= currentStep;
          const current = i === currentStep;
          return (
            <div key={step.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? '1' : 'none' }}>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-300',
                done
                  ? 'bg-primary-500 text-white'
                  : 'bg-cream-200 text-charcoal-400 border-2 border-charcoal-100 dark:bg-dark-muted dark:border-dark-border',
                current && 'shadow-[0_0_0_4px_rgba(232,84,31,.2)]',
              )}>
                {done && i < currentStep ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'flex-1 h-0.5 mx-1 transition-all duration-300',
                  i < currentStep ? 'bg-primary-500' : 'bg-charcoal-100 dark:bg-dark-border',
                )} />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex mt-2">
        {STEPS.map((step, i) => (
          <div
            key={step.key}
            className={cn(
              'text-[9px] font-medium flex-1 transition-colors',
              i === 0 ? 'text-left' : i === STEPS.length - 1 ? 'text-right' : 'text-center',
              i <= currentStep ? 'text-primary-500 font-semibold' : 'text-charcoal-400',
            )}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}
