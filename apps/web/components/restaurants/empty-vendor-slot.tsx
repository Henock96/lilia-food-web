import { cn } from '@lilia/utils';

interface EmptyVendorSlotProps {
  /** Texte optionnel affiché dans l'emplacement — un seul par grille, sur le
   * premier emplacement vide en général. */
  label?: string;
  className?: string;
}

/**
 * Emplacement vide en pointillés pour compléter une grille de vendeurs trop
 * clairsemée (« Prochain vendeur ici »). Le catalogue de production ne
 * compte qu'un seul vendeur : une grille avec une seule carte réelle et de
 * grands vides à côté lirait comme un site cassé, alors qu'une case en
 * pointillés se lit comme « un service qui démarre ».
 *
 * Partagé entre `FeaturedRestaurants` (home, `components/home/`) et
 * `VendorGrid` (/restaurants) pour ne pas dupliquer ce motif à deux endroits
 * — un relecteur a explicitement signalé ce risque de duplication.
 */
export function EmptyVendorSlot({ label, className }: EmptyVendorSlotProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid min-h-[10.5rem] place-items-center rounded-xl border-[1.5px] border-dashed border-cream-300 bg-cream-200 text-[11.5px] text-ink-500',
        className,
      )}
    >
      {label ?? ''}
    </div>
  );
}
