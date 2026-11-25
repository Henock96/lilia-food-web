import type {
  SubscriptionOffer,
  SubscriptionPayment,
} from '@lilia/types';

/**
 * Premium S1 — présentation de l'offre et des paiements d'abonnement.
 *
 * Rien n'est décidé ici : prix, montants, droit de payer et issue d'un
 * paiement viennent du serveur. Ces fonctions ne font que les nommer.
 */

export const OPERATORS = [
  { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
] as const;

export type Operator = (typeof OPERATORS)[number]['value'];

export const PREMIUM_BENEFITS = [
  'Réservations de tables sur place, payées à l’avance par vos clients',
  'Statistiques avancées : produits phares et heures de pointe',
] as const;

export function durationLabel(months: number): string {
  if (months === 12) return '12 mois (1 an)';
  return months === 1 ? '1 mois' : `${months} mois`;
}

/** Pourquoi le vendeur ne peut pas payer, d'après le verdict serveur. */
export function blockedReasonLabel(
  reason: SubscriptionOffer['blockedReason'],
): string | null {
  switch (reason) {
    case 'VENDOR_NOT_APPROVED':
      return 'Votre boutique doit être validée par Lilia avant de souscrire à Premium.';
    case 'ONLINE_PAYMENT_UNAVAILABLE':
      return 'Le paiement en ligne est momentanément indisponible. Réessayez plus tard.';
    default:
      return null;
  }
}

export type PaymentTone = 'pending' | 'success' | 'failed';

export function paymentTone(p: Pick<SubscriptionPayment, 'status'>): PaymentTone {
  if (p.status === 'SUCCESS') return 'success';
  if (p.status === 'FAILED') return 'failed';
  return 'pending';
}

export function paymentStatusLabel(
  p: Pick<SubscriptionPayment, 'status' | 'grantedAt'>,
): string {
  if (p.status === 'SUCCESS') {
    return p.grantedAt ? 'Payé — Premium activé' : 'Payé';
  }
  if (p.status === 'FAILED') return 'Échec';
  return 'En attente de validation sur le téléphone';
}

/**
 * Motif d'échec lisible. Les codes viennent du prestataire (pawaPay) ou de
 * la réconciliation ; un code inconnu reste affiché tel quel plutôt que
 * masqué.
 */
export function failureLabel(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'INSUFFICIENT_BALANCE':
      return 'Solde insuffisant.';
    case 'PAYER_NOT_FOUND':
    case 'INVALID_PHONE_NUMBER':
    case 'PAYER_LIMIT_REACHED':
      return 'Numéro refusé par l’opérateur. Vérifiez le numéro et l’opérateur.';
    case 'TRANSACTION_TIMEOUT':
    case 'RECONCILIATION_TIMEOUT':
      return 'Paiement non validé à temps.';
    case 'REJECTED':
    case 'PAYMENT_NOT_APPROVED':
      return 'Paiement refusé ou annulé sur le téléphone.';
    default:
      return `Refusé par l’opérateur (${code}).`;
  }
}

/**
 * Un paiement `PENDING` dont le suivi s'est arrêté (au-delà de 3 min) n'est
 * pas un échec : le serveur tranchera. On le dit, plutôt que d'inviter à
 * payer deux fois.
 */
export function isStalePending(
  p: Pick<SubscriptionPayment, 'status' | 'createdAt'>,
  now: number = Date.now(),
): boolean {
  if (p.status !== 'PENDING') return false;
  const created = Date.parse(p.createdAt);
  return Number.isFinite(created) && now - created >= 180_000;
}
