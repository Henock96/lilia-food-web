import { describe, expect, it } from 'vitest';
import type { DeliveryProof } from '@lilia/types';

import { DELIVERY_PROOF_LABELS, deliveryProofSummary } from './delivery-proof';

describe('deliveryProofSummary (F3-07)', () => {
  it('rien avant la remise, ni sur l’historique sans preuve', () => {
    expect(deliveryProofSummary({ status: 'PRET', deliveryProof: 'PICKUP_CODE' })).toBeNull();
    expect(deliveryProofSummary({ status: 'LIVRER' })).toBeNull();
  });

  it('remise déclarée par le vendeur : on dit pourquoi le paiement attend', () => {
    expect(
      deliveryProofSummary({ status: 'LIVRER', deliveryProof: 'PICKUP_VENDOR_DECLARED' }),
    ).toEqual({
      label: 'Remise déclarée par le restaurant',
      payout: 'Paiement en attente de la confirmation du client.',
      waiting: true,
    });
  });

  it('livraison sans code : validation humaine', () => {
    expect(
      deliveryProofSummary({ status: 'LIVRER', deliveryProof: 'DELIVERY_UNVERIFIED' })?.payout,
    ).toMatch(/à valider par Lilia Food/);
  });

  it('preuve fiable : heure à partir de laquelle le paiement peut partir', () => {
    const summary = deliveryProofSummary({
      status: 'LIVRER',
      deliveryProof: 'PICKUP_CUSTOMER_CONFIRMED',
      customerConfirmedAt: '2026-09-25T11:00:00.000Z',
      payoutDueAt: '2026-09-25T12:00:00.000Z',
    });
    expect(summary?.waiting).toBe(false);
    // 12:00 UTC = 13:00 à Brazzaville.
    expect(summary?.payout).toMatch(/13:00/);
    expect(summary?.label).toMatch(/^Retrait confirmé par le client le /);
  });

  it('chaque preuve a son libellé', () => {
    const all: DeliveryProof[] = [
      'DELIVERY_CODE',
      'DELIVERY_ADMIN_OVERRIDE',
      'DELIVERY_UNVERIFIED',
      'PICKUP_CODE',
      'PICKUP_CUSTOMER_CONFIRMED',
      'PICKUP_ADMIN_OVERRIDE',
      'PICKUP_VENDOR_DECLARED',
    ];
    for (const p of all) expect(DELIVERY_PROOF_LABELS[p]).toBeTruthy();
  });
});
