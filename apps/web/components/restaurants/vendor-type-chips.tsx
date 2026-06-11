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
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition-all',
        active
          ? 'border-[var(--ember-500)] bg-[var(--ember-500)] text-white shadow-lg shadow-[var(--ember-500)]/25'
          : 'border-white/10 bg-white/5 text-white/65 hover:border-[var(--ember-400)]/40 hover:text-white',
      )}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}
