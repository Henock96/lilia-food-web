import { describe, expect, it } from 'vitest';
import { buildRefundLines, refundReasonForClaim } from './refund-composer';

describe('buildRefundLines', () => {
  it('n’envoie jamais de montant sur un article, ni sur un frais', () => {
    expect(
      buildRefundLines({
        items: { a: 2, b: 0 },
        deliveryFee: true,
        serviceFee: false,
        goodwillXaf: 0,
      }),
    ).toEqual([
      { kind: 'ITEM', orderItemId: 'a', quantity: 2 },
      { kind: 'DELIVERY_FEE' },
    ]);
  });

  it('un geste commercial porte son montant, arrondi à l’entier', () => {
    expect(
      buildRefundLines({ items: {}, deliveryFee: false, serviceFee: false, goodwillXaf: 500.7 }),
    ).toEqual([{ kind: 'GOODWILL', amountXaf: 500 }]);
  });
});

describe('refundReasonForClaim', () => {
  it('reprend le motif client, et « Autre » pour les anciens signalements', () => {
    expect(refundReasonForClaim('MISSING_ITEM')).toBe('MISSING_ITEM');
    expect(refundReasonForClaim('NOT_RECEIVED')).toBe('OTHER');
  });
});
