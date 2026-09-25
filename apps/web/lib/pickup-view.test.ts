import { describe, expect, it } from 'vitest';
import type { Order } from '@lilia/types';

import { pickupStatusLabel, pickupView, timelineSteps } from './pickup-view';

const order = (over: Partial<Order> = {}) =>
  ({
    isDelivery: false,
    status: 'PRET',
    allowedActions: [],
    deliveryProof: null,
    pickupCode: null,
    ...over,
  }) as Order;

describe('pickupView (F3-07)', () => {
  it('jamais pour une livraison à domicile', () => {
    expect(
      pickupView(
        order({
          isDelivery: true,
          pickupCode: '4821',
          allowedActions: ['CONFIRM_PICKUP'],
        }),
      ),
    ).toBeNull();
  });

  it('prête : le code à montrer et le bouton publié par le serveur', () => {
    expect(
      pickupView(order({ pickupCode: '4821', allowedActions: ['CONFIRM_PICKUP'] })),
    ).toEqual({ code: '4821', canConfirm: true, vendorDeclared: false, proved: false });
  });

  it('le bouton suit allowedActions, pas le statut', () => {
    expect(pickupView(order({ pickupCode: '4821' }))?.canConfirm).toBe(false);
  });

  it('avant PRET, ou annulée : rien', () => {
    for (const status of ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'ANNULER'] as const) {
      expect(pickupView(order({ status }))).toBeNull();
    }
  });

  it('le code disparaît une fois la commande remise', () => {
    const view = pickupView(
      order({
        status: 'LIVRER',
        pickupCode: '4821',
        deliveryProof: 'PICKUP_VENDOR_DECLARED',
        allowedActions: ['CONFIRM_PICKUP'],
      }),
    );
    expect(view).toEqual({ code: null, canConfirm: true, vendorDeclared: true, proved: false });
  });

  it('remise prouvée : plus de bouton, « récupérée »', () => {
    for (const deliveryProof of ['PICKUP_CODE', 'PICKUP_CUSTOMER_CONFIRMED', 'PICKUP_ADMIN_OVERRIDE'] as const) {
      expect(pickupView(order({ status: 'LIVRER', deliveryProof }))).toEqual({
        code: null,
        canConfirm: false,
        vendorDeclared: false,
        proved: true,
      });
    }
  });

  it('commande livrée avant le dispositif (sans preuve) : rien à dire', () => {
    expect(pickupView(order({ status: 'LIVRER' }))).toBeNull();
  });
});

describe('libellés d’un retrait', () => {
  it('jamais « livrée » pour un retrait', () => {
    expect(pickupStatusLabel(order({ status: 'LIVRER', deliveryProof: 'PICKUP_CODE' }))).toBe('Récupérée');
    expect(
      pickupStatusLabel(order({ status: 'LIVRER', deliveryProof: 'PICKUP_VENDOR_DECLARED' })),
    ).toBe('Remise');
    expect(pickupStatusLabel(order({ status: 'PRET' }))).toBe('À retirer');
  });

  it('une livraison garde les libellés habituels', () => {
    expect(pickupStatusLabel(order({ isDelivery: true, status: 'LIVRER' }))).toBeNull();
  });

  it('la chronologie d’un retrait ne passe pas « en route »', () => {
    const steps = timelineSteps(false);
    expect(steps.map((s) => s.status)).not.toContain('EN_ROUTE');
    expect(steps.at(-1)).toEqual({ status: 'LIVRER', label: 'Récupérée' });
    expect(timelineSteps(true).map((s) => s.status)).toContain('EN_ROUTE');
  });
});
