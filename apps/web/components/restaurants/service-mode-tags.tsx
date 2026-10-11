import { Bike, Store } from 'lucide-react';
import { cn } from '@lilia/utils';
import type { ServiceModes } from '@/lib/service-modes';

/**
 * Modes de service du vendeur, tels que le client pourra les choisir :
 * « Livraison », « Retrait sur place ». Seuls les modes proposés sont
 * affichés ; rien si aucun.
 */
export function ServiceModeTags({
  modes,
  className,
}: {
  modes: ServiceModes;
  className?: string;
}) {
  if (!modes.delivery && !modes.pickup) return null;
  return (
    <span className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {modes.delivery && (
        <span className="flex items-center gap-1">
          <Bike className="h-3.5 w-3.5" aria-hidden />
          Livraison
        </span>
      )}
      {modes.pickup && (
        <span className="flex items-center gap-1">
          <Store className="h-3.5 w-3.5" aria-hidden />
          Retrait sur place
        </span>
      )}
    </span>
  );
}
