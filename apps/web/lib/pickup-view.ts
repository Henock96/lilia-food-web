import type { Order, OrderStatus } from '@lilia/types';

/**
 * Ce que le client voit d'un retrait au comptoir (F3-07).
 *
 * Fonctions pures, testées (`pickup-view.test.ts`) : la page et le panneau ne
 * font que les afficher. Même règle que l'app mobile (`PickupCard`) : le
 * bouton suit `allowedActions`, jamais le statut seul — c'est le serveur qui
 * sait si la remise est déjà prouvée.
 */

type PickupOrder = Pick<
  Order,
  'isDelivery' | 'status' | 'allowedActions' | 'deliveryProof' | 'pickupCode'
>;

export interface PickupView {
  /** Code à montrer au comptoir, tant que la commande attend. */
  code: string | null;
  /** « J'ai récupéré ma commande » est proposé par le serveur. */
  canConfirm: boolean;
  /** Le restaurant dit avoir remis la commande ; le client n'a pas confirmé. */
  vendorDeclared: boolean;
  /** Remise prouvée (code, confirmation, arbitrage). */
  proved: boolean;
}

/** `null` : rien à afficher (livraison, ou retrait sans objet). */
export function pickupView(order: PickupOrder): PickupView | null {
  if (order.isDelivery) return null;
  const code = order.status === 'PRET' ? (order.pickupCode ?? null) : null;
  const canConfirm = order.allowedActions?.includes('CONFIRM_PICKUP') ?? false;
  const vendorDeclared = order.deliveryProof === 'PICKUP_VENDOR_DECLARED';
  const proved =
    order.status === 'LIVRER' && !!order.deliveryProof && !vendorDeclared;
  if (!code && !canConfirm && !proved) return null;
  return { code, canConfirm, vendorDeclared, proved };
}

/** Libellé du badge de statut d'un retrait ; `null` : le libellé général convient. */
export function pickupStatusLabel(
  order: Pick<Order, 'isDelivery' | 'status' | 'deliveryProof'>,
): string | null {
  if (order.isDelivery) return null;
  if (order.status === 'PRET') return 'À retirer';
  if (order.status !== 'LIVRER') return null;
  return order.deliveryProof === 'PICKUP_VENDOR_DECLARED' ? 'Remise' : 'Récupérée';
}

/**
 * Étapes de la chronologie. Un retrait ne passe jamais « en route » : l'étape
 * est retirée, et la dernière se dit « Récupérée ».
 */
export function timelineSteps(isDelivery: boolean): {
  status: OrderStatus;
  label: string;
}[] {
  const steps: { status: OrderStatus; label: string }[] = [
    { status: 'EN_ATTENTE', label: 'En attente' },
    { status: 'PAYER', label: 'Paiement confirmé' },
    { status: 'ACCEPTEE', label: 'Acceptée par le vendeur' },
    { status: 'EN_PREPARATION', label: 'En préparation' },
    { status: 'PRET', label: isDelivery ? 'Prêt' : 'Prête au restaurant' },
    { status: 'EN_ROUTE', label: 'En route' },
    { status: 'LIVRER', label: isDelivery ? 'Livré' : 'Récupérée' },
  ];
  return isDelivery ? steps : steps.filter((s) => s.status !== 'EN_ROUTE');
}
