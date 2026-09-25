import type {
  OrderAction,
  OrderStatus,
  VendorRejectionReason,
} from '@lilia/types';

import { nextOrderStatus } from './order-transitions';

/**
 * Gestes à proposer sur une commande (Phase 3, F3-01 — règle R1).
 *
 * Le serveur publie `allowedActions` : c'est lui qui sait ce qu'il acceptera.
 * Ce back-office recopiait la matrice de transitions (`order-transitions.ts`)
 * et proposait « Annuler » sur toute commande non terminée — y compris celles
 * où le serveur répond 403 au vendeur.
 *
 * Le repli ne sert que face à un serveur antérieur à la Phase 3, qui ne publie
 * rien — et qui n'a donc ni `/accept` ni `/reject` : ils n'y sont jamais
 * proposés. À supprimer, avec `order-transitions.ts`, une fois ce serveur-là
 * disparu.
 */
export function resolveOrderActions(
  order: {
    status: OrderStatus;
    isDelivery: boolean;
    allowedActions?: OrderAction[];
  },
  role: string | undefined,
): OrderAction[] {
  if (order.allowedActions) return order.allowedActions;
  if (role !== 'ADMIN' && role !== 'RESTAURATEUR') return [];

  const actions: OrderAction[] = [];
  const next = nextOrderStatus({
    current: order.status,
    role,
    isDelivery: order.isDelivery,
  });
  if (next === 'EN_PREPARATION') actions.push('START_PREPARATION');
  if (next === 'PRET') actions.push('MARK_READY');
  if (next === 'LIVRER') actions.push('HAND_OVER');

  // Matrice d'un serveur antérieur : le vendeur annule jusqu'à `PRET`,
  // l'ADMIN aussi en route ; personne n'annule un état terminal.
  const vendorCancellable: OrderStatus[] = [
    'EN_ATTENTE',
    'PAYER',
    'EN_PREPARATION',
    'PRET',
  ];
  if (
    vendorCancellable.includes(order.status) ||
    (role === 'ADMIN' && order.status === 'EN_ROUTE')
  ) {
    actions.push('CANCEL');
  }
  return actions;
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
