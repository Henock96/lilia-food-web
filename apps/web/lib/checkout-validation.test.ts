import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Cart } from '@lilia/types';
import { checkoutCacheCurrent, checkoutCartSignature, checkoutQuoteReady } from './checkout-validation';

const quote = { restaurantId: 'vendor', quoteFingerprint: `v1:${'a'.repeat(64)}`,
  subTotal: 1000, deliveryFee: 0, deliveryFeeBeforePromo: 0, serviceFee: 150,
  vendorOffer: null, promo: null, loyalty: { pointsUsed: 0, discountXaf: 0 }, total: 1150 };
const ready = { quote, restaurantId: 'vendor', hasInputs: true, success: true, fetching: false, placeholder: false, cartUpdating: false };

describe('validation checkout au moment de soumettre', () => {
  it('refuse chargement, erreur, placeholder, choix incomplets et panier en mutation', () => {
    expect(checkoutQuoteReady(ready)).toBe(true);
    for (const change of [{ fetching: true }, { placeholder: true }, { success: false },
      { hasInputs: false }, { cartUpdating: true }, { restaurantId: 'another' }, { quote: undefined }]) {
      expect(checkoutQuoteReady({ ...ready, ...change })).toBe(false);
    }
  });

  it('refuse une invalidation survenue entre le rendu et le clic', async () => {
    const client = new QueryClient();
    const key = ['cart', 'quote']; client.setQueryData(key, quote);
    const shown = client.getQueryData(key);
    expect(checkoutCacheCurrent(client.getQueryState(key), shown)).toBe(true);
    await client.invalidateQueries({ queryKey: key, refetchType: 'none' });
    expect(checkoutCacheCurrent(client.getQueryState(key), shown)).toBe(false);
    client.clear();
  });

  it('les variantes, options, prix et quantités font partie de l’identité du devis', () => {
    const line = { id: 'line', productId: 'product', variantId: 'variant', quantite: 1,
      unitPriceXaf: 1000, optionsSignature: 'option-A' };
    const cart = { id: 'cart', items: [line], subTotalXaf: 1000 } as Cart;
    const first = checkoutCartSignature(cart, null);
    for (const patch of [{ quantite: 2 }, { variantId: 'another' }, { unitPriceXaf: 1200 }, { optionsSignature: 'option-B' }]) {
      expect(checkoutCartSignature({ ...cart, items: [{ ...cart.items[0], ...patch }] }, null)).not.toBe(first);
    }
  });
});
