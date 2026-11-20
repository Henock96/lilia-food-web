import type {
  AdminNoShowSettlement,
  NoShowPayoutState,
  ReservationStatus,
} from '@lilia/types';

/**
 * D-6 — lecture des réservations et des absences par le support. Fonctions
 * pures, testées : les pages ne font que les afficher. Aucune règle métier
 * ici — les gestes possibles viennent du serveur (`allowedActions`,
 * `payoutState`).
 */

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'En attente du restaurant',
  AWAITING_PAYMENT: 'À payer',
  CONFIRMED: 'Confirmée',
  DECLINED: 'Refusée',
  EXPIRED: 'Expirée',
  CANCELLED_BY_CLIENT: 'Annulée par le client',
  CANCELLED_BY_VENDOR: 'Annulée (restaurant ou support)',
  HONORED: 'Honorée',
  NO_SHOW: 'Client absent',
};

export const RESERVATION_STATUS_FILTERS: { value: ReservationStatus | ''; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'AWAITING_PAYMENT', label: 'À payer' },
  { value: 'CONFIRMED', label: 'Confirmées' },
  { value: 'HONORED', label: 'Honorées' },
  { value: 'NO_SHOW', label: 'Absences' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Annulées client' },
  { value: 'CANCELLED_BY_VENDOR', label: 'Annulées restaurant/support' },
  { value: 'DECLINED', label: 'Refusées' },
  { value: 'EXPIRED', label: 'Expirées' },
];

export type Tone = 'amber' | 'emerald' | 'red' | 'zinc' | 'blue';

export function reservationStatusTone(s: ReservationStatus): Tone {
  switch (s) {
    case 'PENDING':
    case 'AWAITING_PAYMENT':
      return 'amber';
    case 'CONFIRMED':
      return 'blue';
    case 'HONORED':
      return 'emerald';
    case 'NO_SHOW':
      return 'red';
    default:
      return 'zinc';
  }
}

export const TONE_STYLES: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  zinc: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

/** Motif d'annulation support : mêmes bornes que le serveur (10 à 500). */
export const CANCEL_REASON_MIN = 10;
export const CANCEL_REASON_MAX = 500;

export function cancelReasonError(reason: string): string | null {
  const n = reason.trim().length;
  if (n < CANCEL_REASON_MIN) return `Motif obligatoire (${CANCEL_REASON_MIN} caractères au moins).`;
  if (n > CANCEL_REASON_MAX) return `Motif trop long (${CANCEL_REASON_MAX} caractères au plus).`;
  return null;
}

/** Ce que l'administrateur doit savoir avant d'annuler. */
export function cancelConsequence(payment: { total: number } | null): string {
  return payment
    ? `La commande liée sera annulée et le client remboursé de ${formatXaf(payment.total)} FCFA par la file des remboursements (aucun virement ne part d’ici). Le client et le restaurant sont prévenus.`
    : 'Rien n’a été payé : la demande est simplement annulée. Le client et le restaurant sont prévenus.';
}

export const NO_SHOW_STATE_LABELS: Record<NoShowPayoutState, string> = {
  NOTHING_DUE: 'Rien à verser',
  DUE: 'Part due',
  IN_PROGRESS: 'Versement en cours',
  PAID: 'Versée',
};

export const NO_SHOW_STATE_TONES: Record<NoShowPayoutState, Tone> = {
  NOTHING_DUE: 'zinc',
  DUE: 'amber',
  IN_PROGRESS: 'blue',
  PAID: 'emerald',
};

export const NO_SHOW_STATE_FILTERS: { value: NoShowPayoutState | ''; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'DUE', label: 'Part due' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'PAID', label: 'Versées' },
  { value: 'NOTHING_DUE', label: 'Rien à verser' },
];

/**
 * Le bouton « Demander le versement » n'existe que si le serveur dit la part
 * due. Une approbation déjà ouverte n'apparaît pas ici : le serveur la
 * refuserait (409), et le message s'affiche alors tel quel.
 */
export function canRequestNoShowPayout(s: Pick<AdminNoShowSettlement, 'payoutState'>): boolean {
  return s.payoutState === 'DUE';
}

/** « 50 % » à partir des points de base. */
export function bpsLabel(bps: number): string {
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
}

export function formatXaf(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

/** Référence courte d'un identifiant, comme sur les autres écrans admin. */
export function shortRef(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}
