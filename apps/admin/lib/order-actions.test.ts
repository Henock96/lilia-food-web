import { describe, expect, it } from 'vitest';
import type { OrderAction, OrderStatus } from '@lilia/types';

import {
  ACTION_TARGET,
  PICKUP_ARBITRATION_REASONS,
  PREP_MINUTES_CHOICES,
  REJECTION_REASONS,
  arbitrationIsComplete,
  asksPickupArbitration,
  asksPickupCode,
  isPickupCode,
  resolveOrderActions,
} from './order-actions';

/**
 * Gestes proposés sur une commande (Phase 3, F3-01 — règle R1).
 *
 * Le serveur publie `allowedActions` ; durcissement lot 5 : plus aucune copie
 * de la matrice côté web, donc plus de repli.
 */
const order = (
  status: OrderStatus,
  allowedActions?: OrderAction[],
): { status: OrderStatus; isDelivery: boolean; allowedActions?: OrderAction[] } => ({
  status,
  isDelivery: true,
  ...(allowedActions ? { allowedActions } : {}),
});

describe('resolveOrderActions', () => {
  it('le serveur fait foi', () => {
    expect(resolveOrderActions(order('PAYER', ['ACCEPT', 'REJECT']))).toEqual([
      'ACCEPT',
      'REJECT',
    ]);
  });

  it('liste vide publiée : aucun geste', () => {
    expect(resolveOrderActions(order('EN_ROUTE', []))).toEqual([]);
  });

  it('aucun verdict serveur : aucun geste, jamais une supposition', () => {
    for (const status of ['PAYER', 'EN_ATTENTE', 'EN_ROUTE', 'PRET'] as const) {
      expect(resolveOrderActions(order(status))).toEqual([]);
    }
  });
});

describe('vocabulaire', () => {
  it('chaque geste de changement de statut vise le bon statut', () => {
    expect(ACTION_TARGET).toEqual({
      START_PREPARATION: 'EN_PREPARATION',
      MARK_READY: 'PRET',
      HAND_OVER: 'LIVRER',
      CANCEL: 'ANNULER',
    });
  });

  it('motifs de refus : ceux du serveur, liste fermée', () => {
    expect(REJECTION_REASONS.map((r) => r.value)).toEqual([
      'OUT_OF_STOCK',
      'TOO_BUSY',
      'CLOSING',
      'OUT_OF_ZONE',
      'OTHER',
    ]);
  });

  it('temps de préparation proposés dans les bornes serveur (5–120 min)', () => {
    for (const m of PREP_MINUTES_CHOICES) {
      expect(m).toBeGreaterThanOrEqual(5);
      expect(m).toBeLessThanOrEqual(120);
    }
  });
});

describe('retrait au comptoir (F3-07)', () => {
  it('le vendeur est invité à saisir le code du client', () => {
    expect(asksPickupCode({ isDelivery: false }, 'RESTAURATEUR')).toBe(true);
  });

  it('l’admin arbitre sans code ; une livraison ne se remet pas au comptoir', () => {
    expect(asksPickupCode({ isDelivery: false }, 'ADMIN')).toBe(false);
    expect(asksPickupCode({ isDelivery: true }, 'RESTAURATEUR')).toBe(false);
  });

  it('le code compte exactement 4 chiffres, comme le DTO serveur', () => {
    expect(isPickupCode('4821')).toBe(true);
    expect(isPickupCode('0007')).toBe(true);
    for (const bad of ['482', '48210', 'abcd', '', ' 4821']) {
      expect(isPickupCode(bad)).toBe(false);
    }
  });
});

/**
 * 1B (ADM-03) — pour l'ADMIN, « Remise au client » d'un retrait est un
 * arbitrage : elle ouvre un versement vendeur, elle exige un motif.
 */
describe('arbitrage de remise ADMIN', () => {
  it('seul l’ADMIN, sur un retrait, passe par l’arbitrage', () => {
    expect(asksPickupArbitration({ isDelivery: false }, 'ADMIN')).toBe(true);
    expect(asksPickupArbitration({ isDelivery: true }, 'ADMIN')).toBe(false);
    expect(asksPickupArbitration({ isDelivery: false }, 'RESTAURATEUR')).toBe(false);
    expect(asksPickupArbitration({ isDelivery: false }, undefined)).toBe(false);
  });

  it('les motifs reprennent la liste fermée du serveur, « Autre » en dernier', () => {
    expect(PICKUP_ARBITRATION_REASONS.map((r) => r.value)).toEqual([
      'CUSTOMER_COLLECTED_NO_CODE',
      'CUSTOMER_CONFIRMED_TO_SUPPORT',
      'VENDOR_COULD_NOT_RECORD',
      'OTHER',
    ]);
  });

  it('un motif est requis ; « Autre » exige une note d’au moins 5 caractères', () => {
    expect(arbitrationIsComplete(null, '')).toBe(false);
    expect(arbitrationIsComplete('CUSTOMER_COLLECTED_NO_CODE', '')).toBe(true);
    expect(arbitrationIsComplete('OTHER', '')).toBe(false);
    expect(arbitrationIsComplete('OTHER', '  ok  ')).toBe(false);
    expect(arbitrationIsComplete('OTHER', 'Client venu sans téléphone')).toBe(true);
    expect(arbitrationIsComplete('VENDOR_COULD_NOT_RECORD', 'x'.repeat(301))).toBe(
      false,
    );
  });
});
