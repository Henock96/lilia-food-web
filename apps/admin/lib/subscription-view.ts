import type {
  SubscriptionPaymentMethod,
  SubscriptionVerdict,
  VendorSubscription,
} from '@lilia/types';

/**
 * Premium (Lot 2) — présentation des abonnements dans le back-office.
 *
 * Rien n'est décidé ici : « Premium ou non » vient du verdict serveur
 * (`verdict.active`), et le serveur refuse toute révocation qu'il n'accepte
 * pas (409). Ces fonctions ne font que nommer et dater ce qu'il a rendu.
 */

export const PAYMENT_METHOD_LABELS: Record<SubscriptionPaymentMethod, string> = {
  MOBILE_MONEY: 'Mobile Money',
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  OTHER: 'Autre',
};

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Africa/Brazzaville',
});

export function formatSubscriptionDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/**
 * Ligne d'état du vendeur, d'après le seul verdict serveur.
 *
 * `paidUntil` est la FIN de la dernière période payée. Les périodes actives
 * forment une suite continue (la révocation part du dernier mois, côté
 * serveur) : un vendeur Standard n'a donc jamais de mois à venir, et un
 * vendeur Premium l'est sans interruption jusqu'à `paidUntil`.
 */
export function verdictLabel(verdict: SubscriptionVerdict): string {
  if (!verdict.active) return 'Standard';
  const until = verdict.paidUntil ?? verdict.currentPeriodEndsAt;
  return until
    ? `Premium jusqu’au ${formatSubscriptionDate(until)}`
    : 'Premium';
}

export type PeriodState = 'en cours' | 'à venir' | 'terminée' | 'révoquée';

/** État affiché d'une période (sa place dans le temps, pas un droit). */
export function periodState(
  period: Pick<VendorSubscription, 'status' | 'startsAt' | 'endsAt'>,
  now: Date = new Date(),
): PeriodState {
  if (period.status === 'REVOKED') return 'révoquée';
  if (new Date(period.endsAt).getTime() <= now.getTime()) return 'terminée';
  if (new Date(period.startsAt).getTime() > now.getTime()) return 'à venir';
  return 'en cours';
}

/**
 * Le bouton « Révoquer » n'est proposé que là où il a un effet : une période
 * en cours ou à venir. Le serveur reste juge (409 sinon).
 */
export function canOfferRevoke(state: PeriodState): boolean {
  return state === 'en cours' || state === 'à venir';
}
