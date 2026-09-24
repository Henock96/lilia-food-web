import type { DeliveryPricingMode } from '@lilia/types';

/**
 * Ce que les cartes et la fiche vendeur disent du prix de la livraison.
 *
 * En `VENDOR_LEGACY`, le prix du vendeur (`fixedDeliveryFee`) est un vrai prix.
 * En `PLATFORM` (F3-02), il ne veut plus rien dire : le prix dépend de la
 * distance jusqu'au quartier du client, que la carte ne connaît pas. On annonce
 * alors le plancher de la grille publiée (« dès X »), jamais un prix inventé.
 *
 * Réglages serveur absents (requête en cours ou échouée) : on retombe sur le
 * prix du vendeur, qui est le comportement d'avant la bascule.
 */
export type DeliveryFeeLabel =
  | { kind: 'free' }
  | { kind: 'amount'; amount: number }
  | { kind: 'from'; amount: number }
  | { kind: 'byDistance' };

export function deliveryFeeLabel(
  fixedDeliveryFee: number,
  settings:
    | { deliveryPricingMode: DeliveryPricingMode; deliveryFeeFromXaf: number | null }
    | undefined,
): DeliveryFeeLabel {
  if (settings?.deliveryPricingMode === 'PLATFORM') {
    if (settings.deliveryFeeFromXaf == null) return { kind: 'byDistance' };
    if (settings.deliveryFeeFromXaf === 0) return { kind: 'free' };
    return { kind: 'from', amount: settings.deliveryFeeFromXaf };
  }
  return fixedDeliveryFee === 0
    ? { kind: 'free' }
    : { kind: 'amount', amount: fixedDeliveryFee };
}
