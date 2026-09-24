import type {
  OrderAction,
  OrderStatus,
  VendorRejectionReason,
} from '@lilia/types';

/**
 * Ce que le client voit de sa commande (Phase 3, F3-01).
 *
 * Fonctions pures, testées (`order-status-view.test.ts`) : la page ne fait
 * que les afficher.
 */

/** Étapes de la chronologie, dans l'ordre du cycle de vie. */
export const TIMELINE_STATUSES: OrderStatus[] = [
  'EN_ATTENTE',
  'PAYER',
  'ACCEPTEE',
  'EN_PREPARATION',
  'PRET',
  'EN_ROUTE',
  'LIVRER',
];

/**
 * Position d'un statut dans la chronologie, -1 s'il n'y figure pas.
 *
 * Une commande préparée sans passer par `ACCEPTEE` (acceptation implicite,
 * avant la mise en service) a une position supérieure : l'étape se coche.
 */
export function timelinePosition(status: OrderStatus): number {
  return TIMELINE_STATUSES.indexOf(status);
}

const BRAZZAVILLE_TZ = 'Africa/Brazzaville';

/** « Prête vers 12:40 » — heure annoncée par le vendeur à l'acceptation. */
export function readyAtLabel(estimatedReadyAt: string | null | undefined): string | null {
  if (!estimatedReadyAt) return null;
  const at = new Date(estimatedReadyAt);
  if (Number.isNaN(at.getTime())) return null;
  const hhmm = at.toLocaleTimeString('fr-FR', {
    timeZone: BRAZZAVILLE_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Prête vers ${hhmm}`;
}

const REJECTION_TEXT: Record<VendorRejectionReason, string> = {
  OUT_OF_STOCK: 'rupture de stock',
  TOO_BUSY: 'trop de commandes en cours',
  CLOSING: 'fermeture imminente',
  OUT_OF_ZONE: 'adresse hors de sa zone de livraison',
  OTHER: 'indisponibilité',
};

/**
 * Message d'une commande annulée.
 *
 * Payée ⇒ elle a été refusée ou laissée sans réponse par le vendeur (le client
 * ne peut plus annuler après paiement) : le remboursement part
 * automatiquement, et il faut le DIRE.
 */
export function cancellationNotice(order: {
  paidAt: string | null;
  vendorRejectionReason?: VendorRejectionReason | null;
  restaurant?: { nom: string } | null;
}): { title: string; detail: string } {
  if (!order.paidAt) {
    return {
      title: 'Commande annulée',
      detail: 'Cette commande a été annulée. Aucun montant n’a été débité.',
    };
  }
  const vendor = order.restaurant?.nom ?? 'Le vendeur';
  const motive = order.vendorRejectionReason
    ? ` (${REJECTION_TEXT[order.vendorRejectionReason]})`
    : '';
  return {
    title: `${vendor} n’a pas pu prendre votre commande`,
    detail:
      `Votre commande a été annulée${motive}. ` +
      'Votre remboursement est en cours sur le numéro qui a payé.',
  };
}

/**
 * Le client peut-il annuler ? Le serveur fait foi quand il publie ses gestes ;
 * face à un serveur antérieur, seulement avant paiement (règle H5).
 */
export function canClientCancel(order: {
  status: OrderStatus;
  allowedActions?: OrderAction[];
}): boolean {
  if (order.allowedActions) return order.allowedActions.includes('CANCEL');
  return order.status === 'EN_ATTENTE';
}
