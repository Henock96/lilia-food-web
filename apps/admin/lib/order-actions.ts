import type {
  DeliveryArbitrationReason,
  OrderAction,
  OrderStatus,
  PickupArbitrationReason,
  VendorRejectionReason,
} from '@lilia/types';

/**
 * Gestes à proposer sur une commande (Phase 3, F3-01 — règle R1).
 *
 * Le serveur publie `allowedActions` : c'est lui qui sait ce qu'il acceptera,
 * et c'est la seule source (`GET /admin/orders`, `GET /orders/restaurant`, la
 * fiche). Durcissement lot 5 : le repli sur une copie de la matrice
 * (`order-transitions.ts`, supprimé) a disparu. Une commande sans verdict
 * serveur ne propose **aucun** geste, jamais une supposition.
 */
export function resolveOrderActions(order: {
  allowedActions?: OrderAction[];
}): OrderAction[] {
  return order.allowedActions ?? [];
}

/** Statut visé par les gestes qui passent par la route de statut. */
export const ACTION_TARGET = {
  START_PREPARATION: 'EN_PREPARATION',
  MARK_READY: 'PRET',
  HAND_OVER: 'LIVRER',
  CANCEL: 'ANNULER',
} as const satisfies Partial<Record<OrderAction, OrderStatus>>;

export const ACTION_LABELS: Record<OrderAction, string> = {
  ACCEPT: 'Accepter',
  REJECT: 'Refuser',
  START_PREPARATION: 'En préparation',
  MARK_READY: 'Prête',
  HAND_OVER: 'Remise au client',
  CANCEL: 'Annuler',
  // Geste du CLIENT (F3-07) : jamais publié à ce back-office, mais le
  // vocabulaire est fermé.
  CONFIRM_PICKUP: 'Retrait confirmé',
};

/** Code de retrait saisi au comptoir : 4 chiffres, comme le DTO serveur. */
export function isPickupCode(value: string): boolean {
  return /^\d{4}$/.test(value);
}

/**
 * Remise d'un retrait par le VENDEUR : on lui demande le code du client
 * (F3-07, D-P5). L'ADMIN arbitre, il ne saisit pas de code — la route de
 * saisie lui est d'ailleurs fermée.
 */
export function asksPickupCode(
  order: { isDelivery: boolean },
  role: string | undefined,
): boolean {
  return !order.isDelivery && role === 'RESTAURATEUR';
}

/**
 * 1B (ADM-03) — remise d'un retrait par l'ADMIN : c'est un arbitrage. Il pose
 * `PICKUP_ADMIN_OVERRIDE`, qui ouvre le versement du vendeur ; il passe donc
 * par `POST /admin/orders/:id/pickup/arbitrate`, motif obligatoire.
 */
export function asksPickupArbitration(
  order: { isDelivery: boolean },
  role: string | undefined,
): boolean {
  return !order.isDelivery && role === 'ADMIN';
}

/** Motifs d'arbitrage — liste fermée, identique au serveur. */
export const PICKUP_ARBITRATION_REASONS: Array<{
  value: PickupArbitrationReason;
  label: string;
}> = [
  { value: 'CUSTOMER_COLLECTED_NO_CODE', label: 'Le client a récupéré sa commande sans son code' },
  { value: 'CUSTOMER_CONFIRMED_TO_SUPPORT', label: 'Le client a confirmé la remise au support' },
  { value: 'VENDOR_COULD_NOT_RECORD', label: 'Le vendeur n’a pas pu enregistrer la remise' },
  { value: 'OTHER', label: 'Autre raison (à préciser)' },
];

/** Mêmes bornes que le DTO serveur : motif requis, note 5–300 si « Autre ». */
export function arbitrationIsComplete(
  reason: PickupArbitrationReason | null,
  note: string,
): boolean {
  if (!reason) return false;
  const trimmed = note.trim();
  if (trimmed.length > 300) return false;
  return reason !== 'OTHER' || trimmed.length >= 5;
}

/**
 * 15/11/2026 — clôture d'une livraison par l'ADMIN, sans le livreur. Le
 * serveur publie le verdict (`deliveryArbitrable`) : absent sur une API
 * ancienne, le geste n'est pas proposé.
 */
export function asksDeliveryArbitration(order: {
  deliveryArbitrable?: boolean;
}): boolean {
  return order.deliveryArbitrable === true;
}

/** Motifs de clôture de livraison — liste fermée, identique au serveur. */
export const DELIVERY_ARBITRATION_REASONS: Array<{
  value: DeliveryArbitrationReason;
  label: string;
}> = [
  { value: 'CUSTOMER_REFUSED', label: 'Le client a refusé la commande' },
  { value: 'DRIVER_DID_NOT_CONFIRM', label: 'Livrée, mais le livreur ne l’a pas enregistré' },
  { value: 'DELIVERED_OUTSIDE_APP', label: 'Remise hors de l’application' },
  { value: 'OTHER', label: 'Autre raison (à préciser)' },
];

/** Bornes de l'avoir, identiques au DTO serveur. */
export const VOUCHER_MIN_XAF = 100;
export const VOUCHER_MAX_XAF = 100_000;

/**
 * Montant d'avoir saisi : `null` si le champ est vide (aucun avoir), `NaN`
 * s'il est invalide (non entier, hors bornes, supérieur au total payé).
 */
export function parseVoucherAmount(raw: string, orderTotal: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) return Number.NaN;
  const amount = Number(trimmed);
  if (amount < VOUCHER_MIN_XAF || amount > VOUCHER_MAX_XAF || amount > orderTotal) {
    return Number.NaN;
  }
  return amount;
}

/** Motif requis, note 5–300 si « Autre », avoir vide ou valide. */
export function deliveryArbitrationIsComplete(
  reason: DeliveryArbitrationReason | null,
  note: string,
  voucherRaw: string,
  orderTotal: number,
): boolean {
  if (!reason) return false;
  const trimmed = note.trim();
  if (trimmed.length > 300) return false;
  if (reason === 'OTHER' && trimmed.length < 5) return false;
  return !Number.isNaN(parseVoucherAmount(voucherRaw, orderTotal));
}

/** Temps de préparation proposés (bornes serveur : 5 à 120 min). */
export const PREP_MINUTES_CHOICES = [10, 20, 30, 45] as const;

/** Motifs de refus — liste fermée, identique à l'enum serveur. */
export const REJECTION_REASONS: Array<{
  value: VendorRejectionReason;
  label: string;
}> = [
  { value: 'OUT_OF_STOCK', label: 'Rupture de stock' },
  { value: 'TOO_BUSY', label: 'Trop de commandes en cours' },
  { value: 'CLOSING', label: 'Fermeture imminente' },
  { value: 'OUT_OF_ZONE', label: 'Adresse hors de ma zone' },
  { value: 'OTHER', label: 'Autre raison' },
];
