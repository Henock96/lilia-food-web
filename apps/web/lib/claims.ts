import type { ClaimOutcome, ClaimReason, IncidentStatus, OrderItem } from '@lilia/types';

/** Ce que le client peut signaler sur une commande livrée (F3-06). */
export const CLAIM_REASONS: { reason: ClaimReason; label: string }[] = [
  { reason: 'MISSING_ITEM', label: 'Il manque un article' },
  { reason: 'WRONG_ITEM', label: 'Je n’ai pas reçu le bon article' },
  { reason: 'DAMAGED', label: 'Un article est abîmé ou renversé' },
  { reason: 'LATE', label: 'La livraison a été très en retard' },
  { reason: 'OTHER', label: 'Autre chose' },
];

const REASON_LABELS: Record<string, string> = {
  MISSING_ITEM: 'Article manquant',
  WRONG_ITEM: 'Article erroné',
  DAMAGED: 'Article abîmé',
  LATE: 'Retard',
  OTHER: 'Autre',
  NOT_RECEIVED: 'Commande non reçue',
  WRONG_ORDER: 'Mauvaise commande',
};

export function claimReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? 'Demande';
}

/** Motifs qui n'ont de sens qu'avec des articles cochés (règle serveur). */
export function claimNeedsItems(reason: ClaimReason): boolean {
  return reason === 'MISSING_ITEM' || reason === 'WRONG_ITEM' || reason === 'DAMAGED';
}

/** Ce que voit le client : l'issue si elle existe, sinon où en est sa demande. */
export function claimStatusLabel(status: IncidentStatus, outcome: ClaimOutcome | null): string {
  if (outcome === 'REFUNDED') return 'Remboursée';
  if (outcome === 'VOUCHER') return 'Avoir offert';
  if (outcome === 'REJECTED') return 'Réponse donnée';
  if (status === 'OPEN') return 'Envoyée';
  if (status === 'IN_PROGRESS') return 'En cours de traitement';
  return 'Traitée';
}

export function itemLabel(it: Pick<OrderItem, 'variantLabel' | 'product'>): string {
  const name = it.product?.nom ?? 'Article';
  const variant =
    it.variantLabel && it.variantLabel.toLowerCase() !== 'default' ? ` (${it.variantLabel})` : '';
  return `${name}${variant}`;
}
