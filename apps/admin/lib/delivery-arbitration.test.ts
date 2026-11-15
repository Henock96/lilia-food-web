import { describe, expect, it } from 'vitest';

import {
  DELIVERY_ARBITRATION_REASONS,
  asksDeliveryArbitration,
  deliveryArbitrationIsComplete,
  parseVoucherAmount,
} from './order-actions';

/**
 * 15/11/2026 — « Clôturer la livraison » (ADMIN) : le bouton suit le verdict
 * serveur, le formulaire reprend les bornes du DTO.
 */
describe('clôture de livraison ADMIN', () => {
  it('proposée seulement quand le serveur le publie', () => {
    expect(asksDeliveryArbitration({ deliveryArbitrable: true })).toBe(true);
    expect(asksDeliveryArbitration({ deliveryArbitrable: false })).toBe(false);
    // API ancienne : rien n'est publié, rien n'est proposé.
    expect(asksDeliveryArbitration({})).toBe(false);
  });

  it('les motifs reprennent la liste fermée du serveur, « Autre » en dernier', () => {
    expect(DELIVERY_ARBITRATION_REASONS.map((r) => r.value)).toEqual([
      'CUSTOMER_REFUSED',
      'DRIVER_DID_NOT_CONFIRM',
      'DELIVERED_OUTSIDE_APP',
      'OTHER',
    ]);
  });

  it('avoir : vide = aucun ; entier 100–100 000 sans dépasser le total', () => {
    expect(parseVoucherAmount('', 5000)).toBeNull();
    expect(parseVoucherAmount('  ', 5000)).toBeNull();
    expect(parseVoucherAmount('2500', 5000)).toBe(2500);
    expect(parseVoucherAmount('99', 5000)).toBeNaN();
    expect(parseVoucherAmount('5001', 5000)).toBeNaN();
    expect(parseVoucherAmount('100001', 200000)).toBeNaN();
    expect(parseVoucherAmount('12.5', 5000)).toBeNaN();
  });

  it('complet : motif requis, note pour « Autre », avoir valide ou absent', () => {
    expect(deliveryArbitrationIsComplete(null, '', '', 5000)).toBe(false);
    expect(deliveryArbitrationIsComplete('CUSTOMER_REFUSED', '', '', 5000)).toBe(true);
    expect(deliveryArbitrationIsComplete('OTHER', 'ok', '', 5000)).toBe(false);
    expect(deliveryArbitrationIsComplete('OTHER', 'Client parti', '', 5000)).toBe(true);
    expect(deliveryArbitrationIsComplete('CUSTOMER_REFUSED', '', '9000', 5000)).toBe(
      false,
    );
    expect(deliveryArbitrationIsComplete('CUSTOMER_REFUSED', '', '1000', 5000)).toBe(
      true,
    );
  });
});
