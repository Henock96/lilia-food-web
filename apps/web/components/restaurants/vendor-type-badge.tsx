import type { VendorType } from '@lilia/types';
import { cn } from '@lilia/utils';

/**
 * Pastille discrète pour signaler le type de vendeur (LIL-119).
 * Masquée pour RESTAURANT (= défaut, ne pollue pas l'UI historique).
 *
 * Un seul style neutre pour tous les types (plus de code couleur par type,
 * plus d'emoji) : cohérent avec le reste de la refonte (registre visuel
 * unique, cf. badges de carte) et lisible quel que soit le fond — carte
 * claire ou superposition sur photo.
 */
export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  RESTAURANT: 'Restaurant',
  HOME_COOK: 'Cuisine maison',
  BAKERY: 'Boulangerie',
  BEVERAGE_SHOP: 'Boissons',
  GROCERY: 'Épicerie',
};

interface VendorTypeBadgeProps {
  vendorType: VendorType;
  className?: string;
}

export function VendorTypeBadge({ vendorType, className }: VendorTypeBadgeProps) {
  if (vendorType === 'RESTAURANT') return null;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-cream-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700',
        className,
      )}
    >
      {VENDOR_TYPE_LABELS[vendorType]}
    </span>
  );
}
