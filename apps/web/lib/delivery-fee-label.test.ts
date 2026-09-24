import { describe, expect, it } from 'vitest';
import { deliveryFeeLabel } from './delivery-fee-label';

describe('deliveryFeeLabel', () => {
  it('mode vendeur : le prix du vendeur', () => {
    expect(
      deliveryFeeLabel(1000, { deliveryPricingMode: 'VENDOR_LEGACY', deliveryFeeFromXaf: null }),
    ).toEqual({ kind: 'amount', amount: 1000 });
  });

  it('mode vendeur à 0 : gratuite', () => {
    expect(
      deliveryFeeLabel(0, { deliveryPricingMode: 'VENDOR_LEGACY', deliveryFeeFromXaf: null }),
    ).toEqual({ kind: 'free' });
  });

  it('mode plateforme : le plancher de la grille, jamais le prix du vendeur', () => {
    expect(
      deliveryFeeLabel(0, { deliveryPricingMode: 'PLATFORM', deliveryFeeFromXaf: 800 }),
    ).toEqual({ kind: 'from', amount: 800 });
  });

  it('mode plateforme sans plancher connu : selon la distance', () => {
    expect(
      deliveryFeeLabel(1000, { deliveryPricingMode: 'PLATFORM', deliveryFeeFromXaf: null }),
    ).toEqual({ kind: 'byDistance' });
  });

  it('réglages pas encore chargés : comportement d’avant la bascule', () => {
    expect(deliveryFeeLabel(1000, undefined)).toEqual({ kind: 'amount', amount: 1000 });
  });
});
