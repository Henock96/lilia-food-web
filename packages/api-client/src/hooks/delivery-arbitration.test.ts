import { describe, expect, it } from 'vitest';

import { arbitrateDeliveryRequest } from './orders';

/**
 * 15/11/2026 — clôture d'une livraison par l'ADMIN : forme exacte de la
 * requête. Le serveur refuse tout champ hors DTO ; rien de vide n'est envoyé.
 */
describe('clôture de livraison ADMIN — requête', () => {
  it('POST /admin/orders/:id/delivery/arbitrate, motif, note nettoyée, avoir', () => {
    expect(
      arbitrateDeliveryRequest('o1', {
        reason: 'CUSTOMER_REFUSED',
        note: '  Refus à la porte ',
        voucherAmountXaf: 2500,
      }),
    ).toEqual({
      path: '/admin/orders/o1/delivery/arbitrate',
      method: 'POST',
      body: {
        reason: 'CUSTOMER_REFUSED',
        note: 'Refus à la porte',
        voucherAmountXaf: 2500,
      },
    });
  });

  it('sans note ni avoir : seul le motif part', () => {
    expect(
      arbitrateDeliveryRequest('o1', { reason: 'DRIVER_DID_NOT_CONFIRM', note: '   ' })
        .body,
    ).toEqual({ reason: 'DRIVER_DID_NOT_CONFIRM' });
  });

  it('l’identifiant est encodé dans le chemin', () => {
    expect(
      arbitrateDeliveryRequest('a/b', { reason: 'OTHER', note: 'Cas particulier' })
        .path,
    ).toBe('/admin/orders/a%2Fb/delivery/arbitrate');
  });
});
