import type { ClaimOutcome, IncidentStatus } from '@lilia/types';

/** Motifs client (F3-06) et anciens signalements Phase 2. */
export const CLAIM_REASON_LABELS: Record<string, string> = {
  MISSING_ITEM: 'Article manquant',
  WRONG_ITEM: 'Article erroné',
  DAMAGED: 'Article abîmé',
  LATE: 'Retard',
  OTHER: 'Autre',
  NOT_RECEIVED: 'Commande non reçue',
  WRONG_ORDER: 'Mauvaise commande',
};

export const CLAIM_STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Sans réponse',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Traitée',
  CLOSED: 'Close',
};

export const CLAIM_OUTCOME_LABELS: Record<ClaimOutcome, string> = {
  REFUNDED: 'Remboursée',
  VOUCHER: 'Avoir',
  REJECTED: 'Refusée',
};

export function claimReasonLabel(reason: string): string {
  return CLAIM_REASON_LABELS[reason] ?? reason;
}
