import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant, ProductVendorRef } from '@lilia/types';
import { computePurchaseState } from './product-purchase-state';

const variant = { id: 'v1', label: null, prix: 3500 } as ProductVariant;

type ProductInput = Parameters<typeof computePurchaseState>[0];

function product(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    variants: [variant],
    stockRestant: null,
    isAvailable: true,
    availableNow: true,
    availableFrom: null,
    availableUntil: null,
    ...overrides,
  } as ProductInput;
}

const open = { isOpen: true } as ProductVendorRef;
const closed = { isOpen: false } as ProductVendorRef;

describe('produit commandable', () => {
  it('accepte le cas nominal', () => {
    const s = computePurchaseState(product(), open);
    expect(s.canAdd).toBe(true);
    expect(s.blocker).toBeNull();
    expect(s.message).toBeNull();
  });

  it('laisse la quantité libre quand le stock est illimité', () => {
    expect(computePurchaseState(product(), open).maxQuantity).toBe(99);
  });

  it('plafonne la quantité au stock restant', () => {
    expect(
      computePurchaseState(product({ stockRestant: 3 }), open).maxQuantity,
    ).toBe(3);
  });

  it('traite `isAvailable` et `availableNow` absents comme « en vente »', () => {
    // Réponses publiques antérieures : les champs n'existaient pas. Les lire
    // comme `false` retirerait tout le catalogue de la vente le jour d'un
    // déploiement partiel.
    const s = computePurchaseState(
      product({ isAvailable: undefined, availableNow: undefined }),
      open,
    );
    expect(s.canAdd).toBe(true);
  });

  it('reste commandable sans information sur le vendeur', () => {
    // La fiche s'affiche même si la lecture du vendeur échoue : c'est le
    // serveur qui refusera, pas un bouton grisé sans explication.
    expect(computePurchaseState(product(), null).canAdd).toBe(true);
  });
});

describe('produit non commandable', () => {
  it('retiré de la vente par le vendeur', () => {
    const s = computePurchaseState(product({ isAvailable: false }), open);
    expect(s.canAdd).toBe(false);
    expect(s.blocker).toBe('withdrawn');
    expect(s.message).toBe('Momentanément indisponible');
  });

  it('épuisé', () => {
    const s = computePurchaseState(product({ stockRestant: 0 }), open);
    expect(s.blocker).toBe('out_of_stock');
    expect(s.maxQuantity).toBeGreaterThanOrEqual(1);
  });

  it('sans variante — le prix serait indéterminé', () => {
    const s = computePurchaseState(product({ variants: [] }), open);
    expect(s.blocker).toBe('no_variant');
  });

  it('vendeur fermé', () => {
    const s = computePurchaseState(product(), closed);
    expect(s.blocker).toBe('vendor_closed');
    expect(s.message).toBe('Ce vendeur est fermé actuellement');
  });

  it('hors fenêtre horaire — la viennoiserie à 3 h du matin', () => {
    // `availableNow` est le verdict du serveur, pas un calcul local : le test
    // n'a donc plus à piloter l'horloge, et la règle n'existe qu'à un endroit.
    const s = computePurchaseState(
      product({
        availableNow: false,
        availableFrom: '06:00',
        availableUntil: '11:00',
      }),
      open,
    );
    expect(s.blocker).toBe('outside_window');
    expect(s.message).toBe('Disponible de 06:00 à 11:00');
  });

  it('dans sa fenêtre, la même viennoiserie est commandable', () => {
    const s = computePurchaseState(
      product({
        availableNow: true,
        availableFrom: '06:00',
        availableUntil: '11:00',
      }),
      open,
    );
    expect(s.canAdd).toBe(true);
    // La fenêtre reste affichée : elle fait partie de la description du
    // produit, pas seulement de son refus.
    expect(s.windowLabel).toBe('Disponible de 06:00 à 11:00');
  });
});

describe('priorité des motifs', () => {
  it('le retrait de la vente prime sur tout le reste', () => {
    const s = computePurchaseState(
      product({ isAvailable: false, stockRestant: 0, availableNow: false }),
      closed,
    );
    expect(s.blocker).toBe('withdrawn');
  });

  it("l'épuisement prime sur la fermeture du vendeur", () => {
    const s = computePurchaseState(product({ stockRestant: 0 }), closed);
    expect(s.blocker).toBe('out_of_stock');
  });

  it('la fermeture du vendeur prime sur la fenêtre horaire', () => {
    // « La boutique est fermée » explique pourquoi rien ne fonctionne ; la
    // fenêtre horaire est une nuance à l'intérieur d'une boutique ouverte.
    const s = computePurchaseState(
      product({
        availableNow: false,
        availableFrom: '06:00',
        availableUntil: '11:00',
      }),
      closed,
    );
    expect(s.blocker).toBe('vendor_closed');
  });
});

describe('quantité maximale', () => {
  it("n'est jamais nulle, même sur un produit bloqué", () => {
    // Un `max` à zéro casserait le sélecteur de quantité, qui part de 1.
    const s = computePurchaseState(product({ stockRestant: 0 }), open);
    expect(s.maxQuantity).toBe(1);
  });

  it('reste bornée à 99 malgré un stock énorme', () => {
    const s = computePurchaseState(product({ stockRestant: 5000 }), open);
    expect(s.maxQuantity).toBe(99);
  });
});

describe('type', () => {
  it('accepte un produit complet du catalogue', () => {
    // Vérifie que la signature n'exige que les champs réellement lus : la page
    // passe l'objet `Product` entier.
    const full = {
      id: 'p1',
      nom: 'Poulet braisé',
      variants: [variant],
      stockRestant: null,
      isAvailable: true,
      availableNow: true,
    } as unknown as Product;
    expect(computePurchaseState(full, open).canAdd).toBe(true);
  });
});
