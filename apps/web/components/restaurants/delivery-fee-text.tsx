'use client';

import { usePublicPlatformSettings } from '@lilia/api-client';
import { formatCurrency } from '@lilia/utils';
import { deliveryFeeLabel } from '@/lib/delivery-fee-label';

/**
 * Prix de livraison d'une carte ou d'une fiche vendeur (F3-02).
 *
 * `usePublicPlatformSettings` est dédupliqué par TanStack Query : une grille
 * de 20 cartes ne fait qu'une requête. La règle vit dans `deliveryFeeLabel`.
 */
export function DeliveryFeeText({
  fixedDeliveryFee,
  freeLabel = 'Livraison gratuite',
  prefix = '',
}: {
  fixedDeliveryFee: number;
  /** « Gratuit » sur les cartes compactes. */
  freeLabel?: string;
  /** « Livraison » sur la fiche vendeur. */
  prefix?: string;
}) {
  const { data: settings } = usePublicPlatformSettings();
  const label = deliveryFeeLabel(fixedDeliveryFee, settings);
  const lead = prefix ? `${prefix} ` : '';
  switch (label.kind) {
    case 'free':
      return <>{freeLabel}</>;
    case 'amount':
      return <>{`${lead}${formatCurrency(label.amount)}`}</>;
    case 'from':
      return <>{`${lead}dès ${formatCurrency(label.amount)}`}</>;
    case 'byDistance':
      return <>{`${lead}selon la distance`.trim()}</>;
  }
}
