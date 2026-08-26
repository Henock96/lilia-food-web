'use client';

import type { VendorType } from '@lilia/types';
import { cn } from '@lilia/utils';
import { VENDOR_TYPE_LABELS } from './vendor-type-badge';

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
      <Chip label="Tous" active={selected === null} onClick={() => onChange(null)} />
      {FILTERABLE_TYPES.map((type) => (
        <Chip
          key={type}
          label={VENDOR_TYPE_LABELS[type]}
          active={selected === type}
          onClick={() => onChange(type)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill border-[1.5px] px-3.5 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-tomato-600 bg-tomato-600 text-white'
          : 'border-cream-300 bg-cream-100 text-ink-700 hover:border-tomato-600 hover:text-tomato-600',
      )}
    >
      {label}
    </button>
  );
}
