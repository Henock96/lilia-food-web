import { describe, it, expect } from 'vitest';
import {
  computeCheckoutEstimate,
  resolveDeliveryFee,
  minimumOrderError,
  PRICING_SETTINGS_FALLBACK,
  type PricingSettings,
} from './checkout-estimate';

/** Valeurs réellement servies par `GET /platform-settings` en production. */
const PROD: PricingSettings = {
  serviceFeePercent: 15,
  loyaltyPointValueXaf: 5,
  loyaltyMinRedemption: 100,
};

describe('computeCheckoutEstimate — frais de service', () => {
  it('applique le taux serveur, pas 8 % en dur (P0-2)', () => {
    const e = computeCheckoutEstimate({
      subTotal: 10_000,
      deliveryFee: 1000,
      isDelivery: true,
      settings: PROD,
    });
    // C'est le chiffre exact de l'audit : le web affichait 800.
    expect(e.serviceFee).toBe(1500);
    expect(e.total).toBe(12_500);
  });

  it('suit le taux si l\'admin le change', () => {
    const e = computeCheckoutEstimate({
      subTotal: 10_000,
      deliveryFee: 0,
      isDelivery: false,
      settings: { ...PROD, serviceFeePercent: 8 },
    });
    expect(e.serviceFee).toBe(800);
  });

  it('arrondit comme le serveur (Math.round sur le sous-total seul)', () => {
    const e = computeCheckoutEstimate({
      subTotal: 3333,
      deliveryFee: 500,
      isDelivery: true,
      settings: PROD,
    });
    // round(3333 * 15 / 100) = round(499.95) = 500 ; la livraison n'entre pas
    // dans l'assiette des frais de service.
    expect(e.serviceFee).toBe(500);
  });
});

describe('computeCheckoutEstimate — livraison', () => {
  it('ne compte aucune livraison en retrait', () => {
    const e = computeCheckoutEstimate({
      subTotal: 5000,
      deliveryFee: 1000,
      isDelivery: false,
      settings: PROD,
    });
    expect(e.deliveryFee).toBe(0);
    expect(e.total).toBe(5750);
  });

  it('utilise le tarif du vendeur (500 chez Attieke.com), pas 1000 figé', () => {
    const e = computeCheckoutEstimate({
      subTotal: 4000,
      deliveryFee: 500,
      isDelivery: true,
      settings: PROD,
    });
    expect(e.deliveryFee).toBe(500);
    expect(e.total).toBe(4000 + 500 + 600);
  });

  it('applique FREE_DELIVERY et expose la remise', () => {
    const e = computeCheckoutEstimate({
      subTotal: 6000,
      deliveryFee: 1000,
      isDelivery: true,
      settings: PROD,
      promoDeliveryFee: 0,
    });
    expect(e.baseDeliveryFee).toBe(1000);
    expect(e.deliveryFee).toBe(0);
    expect(e.deliveryDiscount).toBe(1000);
    expect(e.total).toBe(6000 + 900);
  });

  it('n\'offre pas la livraison sur une commande à emporter', () => {
    const e = computeCheckoutEstimate({
      subTotal: 6000,
      deliveryFee: 1000,
      isDelivery: false,
      settings: PROD,
      promoDeliveryFee: 0,
    });
    expect(e.deliveryFee).toBe(0);
    expect(e.deliveryDiscount).toBe(0);
  });
});

describe('computeCheckoutEstimate — promo', () => {
  it('déduit la remise du total sans toucher aux frais de service', () => {
    const e = computeCheckoutEstimate({
      subTotal: 10_000,
      deliveryFee: 1000,
      isDelivery: true,
      settings: PROD,
      promoDiscount: 2000,
    });
    expect(e.serviceFee).toBe(1500);
    expect(e.total).toBe(10_500);
  });

  it('ne descend jamais sous zéro', () => {
    const e = computeCheckoutEstimate({
      subTotal: 1000,
      deliveryFee: 500,
      isDelivery: true,
      settings: PROD,
      promoDiscount: 99_999,
    });
    expect(e.total).toBe(0);
  });
});

describe('computeCheckoutEstimate — fidélité', () => {
  it('ignore un solde sous le minimum de rachat', () => {
    const e = computeCheckoutEstimate({
      subTotal: 5000,
      deliveryFee: 500,
      isDelivery: true,
      settings: PROD,
      loyaltyPoints: 99,
      useLoyaltyPoints: true,
    });
    expect(e.loyaltyPointsUsed).toBe(0);
    expect(e.loyaltyDiscount).toBe(0);
  });

  it('ne consomme que les points nécessaires (plafond au montant dû)', () => {
    // Dû = 1000 + 0 + 150 = 1150 → 230 points suffisent, le client en a 5000.
    const e = computeCheckoutEstimate({
      subTotal: 1000,
      deliveryFee: 0,
      isDelivery: false,
      settings: PROD,
      loyaltyPoints: 5000,
      useLoyaltyPoints: true,
    });
    expect(e.loyaltyPointsUsed).toBe(230);
    expect(e.loyaltyDiscount).toBe(1150);
    expect(e.total).toBe(0);
  });

  it('arrondit à l\'entier inférieur — le reliquat reste dû (bug Flutter #2)', () => {
    // Dû = 703 → floor(703 / 5) = 140 points = 700, il reste 3 FCFA.
    // L'ancien calcul web (points * 5 sans plafond) affichait 0.
    const e = computeCheckoutEstimate({
      subTotal: 703,
      deliveryFee: 0,
      isDelivery: false,
      settings: { ...PROD, serviceFeePercent: 0 },
      loyaltyPoints: 5000,
      useLoyaltyPoints: true,
    });
    expect(e.loyaltyPointsUsed).toBe(140);
    expect(e.total).toBe(3);
  });

  it('plafonne au solde réel du client', () => {
    const e = computeCheckoutEstimate({
      subTotal: 50_000,
      deliveryFee: 1000,
      isDelivery: true,
      settings: PROD,
      loyaltyPoints: 120,
      useLoyaltyPoints: true,
    });
    expect(e.loyaltyPointsUsed).toBe(120);
    expect(e.loyaltyDiscount).toBe(600);
    expect(e.total).toBe(50_000 + 1000 + 7500 - 600);
  });

  it('se calcule après la promo, pas avant', () => {
    // Dû après promo = 10 000 + 1000 + 1500 - 12 000 = 500 → 100 points.
    const e = computeCheckoutEstimate({
      subTotal: 10_000,
      deliveryFee: 1000,
      isDelivery: true,
      settings: PROD,
      promoDiscount: 12_000,
      loyaltyPoints: 5000,
      useLoyaltyPoints: true,
    });
    expect(e.loyaltyPointsUsed).toBe(100);
    expect(e.total).toBe(0);
  });

  it('ne fait rien si la case n\'est pas cochée', () => {
    const e = computeCheckoutEstimate({
      subTotal: 5000,
      deliveryFee: 500,
      isDelivery: true,
      settings: PROD,
      loyaltyPoints: 5000,
      useLoyaltyPoints: false,
    });
    expect(e.loyaltyDiscount).toBe(0);
  });
});

describe('PRICING_SETTINGS_FALLBACK', () => {
  it('reprend les défauts Prisma, pas une valeur inventée', () => {
    expect(PRICING_SETTINGS_FALLBACK).toEqual({
      serviceFeePercent: 8,
      loyaltyPointValueXaf: 5,
      loyaltyMinRedemption: 100,
    });
  });
});

describe('resolveDeliveryFee', () => {
  it('FIXED : ignore le devis de zone', () => {
    expect(
      resolveDeliveryFee({
        fixedDeliveryFee: 500,
        deliveryPriceMode: 'FIXED',
        quartierId: 'q1',
        quotedFee: 2500,
      }),
    ).toBe(500);
  });

  it('ZONE_BASED avec quartier : prend le devis serveur', () => {
    expect(
      resolveDeliveryFee({
        fixedDeliveryFee: 1000,
        deliveryPriceMode: 'ZONE_BASED',
        quartierId: 'q1',
        quotedFee: 1500,
      }),
    ).toBe(1500);
  });

  it('ZONE_BASED sans quartier : retombe sur le tarif fixe, comme le serveur', () => {
    expect(
      resolveDeliveryFee({
        fixedDeliveryFee: 1000,
        deliveryPriceMode: 'ZONE_BASED',
        quartierId: null,
        quotedFee: 1500,
      }),
    ).toBe(1000);
  });

  it('devis pas encore arrivé : tarif fixe plutôt qu\'un montant inventé', () => {
    expect(
      resolveDeliveryFee({
        fixedDeliveryFee: 1000,
        deliveryPriceMode: 'ZONE_BASED',
        quartierId: 'q1',
        quotedFee: undefined,
      }),
    ).toBe(1000);
  });
});

describe('minimumOrderError', () => {
  it('rend le message serveur mot pour mot', () => {
    expect(minimumOrderError(2000, 5000, 'Maison Kayser')).toBe(
      'Montant minimum pour Maison Kayser : 5000 FCFA. Votre panier : 2000 FCFA.',
    );
  });

  it('laisse passer un panier au-dessus du seuil', () => {
    expect(minimumOrderError(5000, 5000, 'Maison Kayser')).toBeNull();
  });

  it('laisse passer quand le vendeur n\'impose pas de minimum', () => {
    expect(minimumOrderError(100, 0, 'Chez Maman Lili')).toBeNull();
  });
});
