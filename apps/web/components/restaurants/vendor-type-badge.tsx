import type { VendorType } from '@lilia/types';
import { cn } from '@lilia/utils';

/**
 * Pastille discrète pour signaler le type de vendeur (LIL-119).
 * Masquée pour RESTAURANT (= défaut, ne pollue pas l'UI historique).
 * Palette et libellés alignés avec admin web (Sprint F) et mobile (Sprint G).
 */
export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  RESTAURANT: 'Restaurant',
  HOME_COOK: 'Cuisine maison',
  BAKERY: 'Boulangerie',
  BEVERAGE_SHOP: 'Boissons',
  GROCERY: 'Épicerie',
};

export const VENDOR_TYPE_EMOJI: Record<VendorType, string> = {
  RESTAURANT: '🍽️',
  HOME_COOK: '🥧',
  BAKERY: '🥐',
  BEVERAGE_SHOP: '🥤',
  GROCERY: '🛒',
};

const VENDOR_TYPE_CLASS: Record<VendorType, string> = {
  RESTAURANT: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
  HOME_COOK: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30',
  BAKERY: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  BEVERAGE_SHOP: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30',
  GROCERY: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
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
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border',
        VENDOR_TYPE_CLASS[vendorType],
        className,
      )}
    >
      <span aria-hidden>{VENDOR_TYPE_EMOJI[vendorType]}</span>
      {VENDOR_TYPE_LABELS[vendorType]}
    </span>
  );
}
