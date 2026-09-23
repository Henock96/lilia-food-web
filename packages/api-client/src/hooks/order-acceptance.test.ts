import { describe, expect, it } from 'vitest';

import { acceptOrderRequest, rejectOrderRequest } from './orders';

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

  it('l’identifiant est encodé dans le chemin', () => {
    expect(acceptOrderRequest('a/b', 10).path).toBe('/orders/a%2Fb/accept');
  });
});
