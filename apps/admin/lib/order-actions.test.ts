import { describe, expect, it } from 'vitest';
import type { OrderStatus } from '@lilia/types';

import {
  ACTION_TARGET,
  PREP_MINUTES_CHOICES,
  REJECTION_REASONS,
  asksPickupCode,
  isPickupCode,
  resolveOrderActions,
} from './order-actions';

/**
 * Gestes proposés sur une commande (Phase 3, F3-01 — règle R1).
 *
 * Le serveur publie `allowedActions` : ce back-office n'a plus à recopier la
 * matrice. Le repli ne sert que face à un serveur antérieur, qui n'a ni
 * `/accept` ni `/reject` — il ne les propose donc jamais.
 */
const order = (status: OrderStatus, extra: Record<string, unknown> = {}) => ({
  status,
  isDelivery: true,
  ...extra,
});

describe('resolveOrderActions', () => {
  it('le serveur fait foi quand il publie', () => {
    expect(
      resolveOrderActions(order('PAYER', { allowedActions: ['ACCEPT', 'REJECT'] }), 'RESTAURATEUR'),
    ).toEqual(['ACCEPT', 'REJECT']);
  });

  it('liste vide publiée : aucun geste', () => {
    expect(resolveOrderActions(order('EN_ROUTE', { allowedActions: [] }), 'ADMIN')).toEqual([]);
  });

  it('serveur antérieur : repli sans Accepter ni Refuser', () => {
    expect(resolveOrderActions(order('PAYER'), 'RESTAURATEUR')).toEqual([
      'START_PREPARATION',
      'CANCEL',
    ]);
  });

  it('repli : un vendeur n’annule pas une course en route (le serveur répondrait 403)', () => {
    expect(resolveOrderActions(order('EN_ROUTE'), 'RESTAURATEUR')).toEqual([]);
    expect(resolveOrderActions(order('EN_ROUTE'), 'ADMIN')).toEqual(['CANCEL']);
  });

  it('repli : rien avant paiement ni sur un état terminal', () => {
    for (const status of ['LIVRER', 'ANNULER', 'ECHEC_LIVRAISON'] as const) {
      expect(resolveOrderActions(order(status), 'ADMIN')).toEqual([]);
    }
    expect(resolveOrderActions(order('EN_ATTENTE'), 'RESTAURATEUR')).toEqual(['CANCEL']);
  });

  it('rôle inconnu : rien plutôt qu’une supposition', () => {
    expect(resolveOrderActions(order('PAYER'), undefined)).toEqual([]);
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
