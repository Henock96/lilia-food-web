'use client';

import { useEffect } from 'react';
import type { VendorType } from '@lilia/types';
import { analytics } from '@/lib/analytics';

/**
 * Un filtre sans résultat est une demande non satisfaite : la mesurer chiffre
 * ce qui manque au catalogue. Même événement qu'avant (`empty_filter_view`),
 * émis désormais quand la page **serveur** est vide.
 */
export function TrackEmptyFilter({
  vendorType,
  hasSearch,
}: {
  vendorType: VendorType | null;
  hasSearch: boolean;
}) {
  useEffect(() => {
    analytics.track('empty_filter_view', { vendor_type: vendorType ?? 'ALL', has_search: hasSearch });
  }, [vendorType, hasSearch]);
  return null;
}
