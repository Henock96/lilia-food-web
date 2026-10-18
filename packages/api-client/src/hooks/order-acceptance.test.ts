import { describe, expect, it } from 'vitest';

import {
  acceptOrderRequest,
  arbitratePickupRequest,
  rejectOrderRequest,
} from './orders';

/**
 * Acceptation vendeur (Phase 3, F3-01) : forme exacte des deux requêtes.
 * Construites par des fonctions pures pour être vérifiables sans React.
 */
describe('acceptation vendeur — requêtes', () => {
  it('accepter : POST /orders/:id/accept avec le temps de préparation', () => {
    expect(acceptOrderRequest('o1', 20)).toEqual({
      path: '/orders/o1/accept',
      method: 'POST',
      body: { prepMinutes: 20 },
    });
  });

  it('refuser : POST /orders/:id/reject avec motif et précision', () => {
    expect(
      rejectOrderRequest('o1', { reason: 'OUT_OF_STOCK', note: ' Plus de poulet ' }),
    ).toEqual({
      path: '/orders/o1/reject',
      method: 'POST',
      body: { reason: 'OUT_OF_STOCK', note: 'Plus de poulet' },
    });
  });

  it('refuser sans précision : la note n’est pas envoyée (ni vide)', () => {
    expect(rejectOrderRequest('o1', { reason: 'TOO_BUSY', note: '   ' }).body).toEqual({
      reason: 'TOO_BUSY',
    });
  });

  it('refus « rupture » : les produits manquants sont désignés (F3-10)', () => {
    expect(
      rejectOrderRequest('o1', { reason: 'OUT_OF_STOCK', outOfStockProductIds: ['vin'] }).body,
    ).toEqual({ reason: 'OUT_OF_STOCK', outOfStockProductIds: ['vin'] });
    // Un autre motif ne met rien en rupture, même si une liste traîne.
    expect(
      rejectOrderRequest('o1', { reason: 'TOO_BUSY', outOfStockProductIds: ['vin'] }).body,
    ).toEqual({ reason: 'TOO_BUSY' });
  });

  it('l’identifiant est encodé dans le chemin', () => {
    expect(acceptOrderRequest('a/b', 10).path).toBe('/orders/a%2Fb/accept');
  });
});

/**
 * 1B (ADM-03) — la remise d'un retrait par l'ADMIN passe par l'arbitrage
 * motivé, jamais par la route de statut.
 */
describe('arbitrage de remise ADMIN — requête', () => {
  it('POST /admin/orders/:id/pickup/arbitrate avec motif et note nettoyée', () => {
    expect(
      arbitratePickupRequest('o1', {
        reason: 'CUSTOMER_COLLECTED_NO_CODE',
        note: '  Téléphone déchargé ',
      }),
    ).toEqual({
      path: '/admin/orders/o1/pickup/arbitrate',
      method: 'POST',
      body: { reason: 'CUSTOMER_COLLECTED_NO_CODE', note: 'Téléphone déchargé' },
    });
  });

  it('sans note : la note n’est pas envoyée (ni vide)', () => {
    expect(
      arbitratePickupRequest('o1', { reason: 'VENDOR_COULD_NOT_RECORD', note: '  ' })
        .body,
    ).toEqual({ reason: 'VENDOR_COULD_NOT_RECORD' });
  });

  it('l’identifiant est encodé dans le chemin', () => {
    expect(
      arbitratePickupRequest('a/b', { reason: 'OTHER', note: 'Cas particulier' }).path,
    ).toBe('/admin/orders/a%2Fb/pickup/arbitrate');
  });
});
