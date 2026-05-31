'use client';

import type { VendorType } from '@lilia/types';
import { cn } from '@lilia/utils';
import { VENDOR_TYPE_EMOJI, VENDOR_TYPE_LABELS } from './vendor-type-badge';

/**
 * Chips horizontaux pour filtrer le marketplace par type de vendeur
 * (LIL-119). `selected: null` = filtre "Tous". GROCERY est exclu de la liste
 * tant que le catalogue épicerie n'est pas activé côté backend.
 */
const FILTERABLE_TYPES: VendorType[] = [
  'RESTAURANT',
  'HOME_COOK',
  'BAKERY',
  'BEVERAGE_SHOP',
];

interface VendorTypeChipsProps {
  selected: VendorType | null;
  onChange: (vendorType: VendorType | null) => void;
}

export function VendorTypeChips({ selected, onChange }: VendorTypeChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Chip
        label="Tous"
        emoji="✨"
        active={selected === null}
        onClick={() => onChange(null)}
      />
      {FILTERABLE_TYPES.map((type) => (
        <Chip
          key={type}
          label={VENDOR_TYPE_LABELS[type]}
          emoji={VENDOR_TYPE_EMOJI[type]}
          active={selected === type}
          onClick={() => onChange(type)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-medium transition-all',
        active
          ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
          : 'bg-white dark:bg-dark-surface border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600',
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
