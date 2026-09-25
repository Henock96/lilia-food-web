import type {
  ClaimReason,
  ManualRefundReasonCode,
  RefundBearer,
  RefundLineInput,
} from '@lilia/types';

/** Ce que l'administrateur a coché dans le composeur (F3-06). */
export interface RefundSelection {
  /** orderItemId → quantité (0 = décoché). */
  items: Record<string, number>;
  deliveryFee: boolean;
  serviceFee: boolean;
  goodwillXaf: number;
}

export const REASON_LABELS: Record<ManualRefundReasonCode, string> = {
  MISSING_ITEM: 'Article manquant',
  WRONG_ITEM: 'Article erroné',
  DAMAGED: 'Article abîmé',
  LATE: 'Retard',
  GOODWILL: 'Geste commercial',
  OTHER: 'Autre',
};

export const BEARER_LABELS: Record<RefundBearer, string> = {
  VENDOR: 'Le vendeur (retenu sur son reversement)',
  PLATFORM: 'Lilia',
  DRIVER: 'Le livreur (réglé hors système)',
};

/**
 * Sélection → lignes envoyées au serveur. Aucune ligne `ITEM` ne porte de
 * montant : le serveur le calcule depuis le prix figé. Les frais partent sans
 * montant (= tout le reliquat).
 */
export function buildRefundLines(selection: RefundSelection): RefundLineInput[] {
  const lines: RefundLineInput[] = Object.entries(selection.items)
    .filter(([, qty]) => qty > 0)
    .map(([orderItemId, quantity]) => ({ kind: 'ITEM', orderItemId, quantity }));
  if (selection.deliveryFee) lines.push({ kind: 'DELIVERY_FEE' });
  if (selection.serviceFee) lines.push({ kind: 'SERVICE_FEE' });
  if (selection.goodwillXaf > 0) {
    lines.push({ kind: 'GOODWILL', amountXaf: Math.floor(selection.goodwillXaf) });
  }
  return lines;
}

/** Motif de remboursement proposé d'après le motif de la réclamation. */
export function refundReasonForClaim(reason: string): ManualRefundReasonCode {
  const map: Partial<Record<ClaimReason, ManualRefundReasonCode>> = {
    MISSING_ITEM: 'MISSING_ITEM',
    WRONG_ITEM: 'WRONG_ITEM',
    DAMAGED: 'DAMAGED',
    LATE: 'LATE',
  };
  return map[reason as ClaimReason] ?? 'OTHER';
}
