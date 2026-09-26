import { describe, expect, it } from 'vitest';

import { availableForVariant, computePurchaseState } from './product-purchase-state';

/** F3-10 — le format choisi décide de la quantité, pas seulement le produit. */
describe('computePurchaseState — formats multi-unités', () => {
  const product = {
    variants: [{ id: 'b' }, { id: 'c6' }],
    stockRestant: 5,
  } as never;
  const open = { isOpen: true };

  it('5 bouteilles : la bouteille reste vendable, plafonnée à 5', () => {
    const state = computePurchaseState(product, open, {
      availableQuantity: 5,
      stockStatus: 'AVAILABLE',
      stockConsumption: 1,
    });
    expect(state.canAdd).toBe(true);
    expect(state.maxQuantity).toBe(5);
  });

  it('5 bouteilles : le carton de 6 est épuisé, message propre au format', () => {
    const state = computePurchaseState(product, open, {
      availableQuantity: 0,
      stockStatus: 'OUT_OF_STOCK',
      stockConsumption: 6,
    });
    expect(state.canAdd).toBe(false);
    expect(state.blocker).toBe('out_of_stock');
    expect(state.message).toMatch(/format/);
  });

  it('« Plus que N » est dit en unités du format', () => {
    const state = computePurchaseState({ ...(product as object), stockRestant: 18 } as never, open, {
      availableQuantity: 3,
      stockStatus: 'LOW',
      stockConsumption: 6,
    });
    expect(state.lowQuantity).toBe(3);
  });

  it('serveur antérieur : stock du produit ÷ consommation', () => {
    expect(availableForVariant(18, { stockConsumption: 6 })).toBe(3);
    expect(availableForVariant(null, { stockConsumption: 6 })).toBeNull();
    expect(availableForVariant(4, undefined)).toBe(4);
  });
});
