import type { DeliveryProof } from '@lilia/types';

/**
 * Comment la remise d'une commande est prouvée (F3-07), dit à l'admin et au
 * vendeur. « Livrée » ne suffit plus : une remise déclarée par le vendeur
 * seul, ou une course conclue sans code, n'ouvrent pas le paiement
 * automatique — l'écran doit dire pourquoi il attend.
 */
export const DELIVERY_PROOF_LABELS: Record<DeliveryProof, string> = {
  DELIVERY_CODE: 'Livrée — code du client saisi par le livreur',
  DELIVERY_ADMIN_OVERRIDE: 'Livraison clôturée par Lilia Food',
  DELIVERY_UNVERIFIED: 'Livrée sans code du client',
  PICKUP_CODE: 'Retrait — code du client saisi au comptoir',
  PICKUP_CUSTOMER_CONFIRMED: 'Retrait confirmé par le client',
  PICKUP_ADMIN_OVERRIDE: 'Retrait clôturé par Lilia Food',
  PICKUP_VENDOR_DECLARED: 'Remise déclarée par le restaurant',
};

const BRAZZAVILLE_TZ = 'Africa/Brazzaville';

function at(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: BRAZZAVILLE_TZ,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** `null` : pas de preuve à montrer (pas encore remise, ou historique). */
export function deliveryProofSummary(order: {
  status: string;
  deliveryProof?: DeliveryProof | null;
  customerConfirmedAt?: string | null;
  payoutDueAt?: string | null;
}): { label: string; payout: string; waiting: boolean } | null {
  if (order.status !== 'LIVRER' || !order.deliveryProof) return null;
  const label =
    order.deliveryProof === 'PICKUP_CUSTOMER_CONFIRMED' && order.customerConfirmedAt
      ? `${DELIVERY_PROOF_LABELS.PICKUP_CUSTOMER_CONFIRMED} le ${at(order.customerConfirmedAt)}`
      : DELIVERY_PROOF_LABELS[order.deliveryProof];

  if (order.payoutDueAt) {
    return {
      label,
      payout: `Paiement du restaurant possible à partir du ${at(order.payoutDueAt)}.`,
      waiting: false,
    };
  }
  return {
    label,
    payout:
      order.deliveryProof === 'PICKUP_VENDOR_DECLARED'
        ? 'Paiement en attente de la confirmation du client.'
        : 'Pas de paiement automatique : à valider par Lilia Food.',
    waiting: true,
  };
}
