import { describe, expect, it } from 'vitest';
import type { ModifierGroup, Product, ProductVariant } from '@lilia/types';
import { cartLineUnitPrice, cartSubtotal, hasPreorderConflict, isPreorderCart } from '@lilia/utils';
import {
  GUEST_CART_TTL_MS,
  MAX_GUEST_LINE_QUANTITY,
  addGuestLine,
  buildGuestLine,
  canIncreaseGuestLine,
  guestCartAsCart,
  guestLineOptions,
  parseGuestCart,
  serializeGuestCart,
  setGuestLineQuantity,
  type GuestCartLine,
} from './guest-cart';

const product = (over: Partial<Product> = {}) =>
  ({ id: 'p1', nom: 'Poulet DG', imageUrl: 'https://res.cloudinary.com/x.jpg', restaurantId: 'v1', madeToOrder: false, stockRestant: null, ...over }) as Product;
const variant = (over: Partial<ProductVariant> = {}) =>
  ({ id: 'va1', label: 'Grande', prix: 3000, stockConsumption: 1, ...over }) as ProductVariant;
const line = (over: Partial<GuestCartLine> = {}, quantite = 1): GuestCartLine => ({
  ...buildGuestLine(product(), variant(), quantite, [], []),
  ...over,
});

describe('buildGuestLine', () => {
  it('prix affiché : format et options ; identité : format et sélection', () => {
    const details = [{ optionId: 'o1', groupId: 'g', groupName: 'Sauce', name: 'Piment', priceDeltaXaf: 200, quantity: 2 }];
    const built = buildGuestLine(product(), variant(), 1, [{ optionId: 'o1', quantity: 2 }], details);
    expect(built.unitPriceXaf).toBe(3400);
    expect(built.id).not.toBe(line().id);
  });

  it('l’ordre des options ne change pas l’identité de la ligne', () => {
    const a = buildGuestLine(product(), variant(), 1, [{ optionId: 'a', quantity: 1 }, { optionId: 'b', quantity: 1 }], []);
    const b = buildGuestLine(product(), variant(), 1, [{ optionId: 'b', quantity: 1 }, { optionId: 'a', quantity: 1 }], []);
    expect(a.id).toBe(b.id);
  });
});

describe('guestLineOptions', () => {
  it('reprend nom et supplément pour l’affichage', () => {
    const groups = [{ id: 'g', name: 'Sauce', options: [{ id: 'o1', name: 'Piment', priceDeltaXaf: 200 }, { id: 'o2', name: 'Ail', priceDeltaXaf: 0 }] }] as ModifierGroup[];
    expect(guestLineOptions(groups, { o1: 2 })).toEqual([
      { optionId: 'o1', groupId: 'g', groupName: 'Sauce', name: 'Piment', priceDeltaXaf: 200, quantity: 2 },
    ]);
  });
});

describe('addGuestLine', () => {
  it('même format et mêmes options : les quantités s’additionnent', () => {
    const result = addGuestLine([line({}, 2)], line({}, 3));
    expect(result.status).toBe('added');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantite).toBe(5);
  });

  it('options différentes : deux lignes', () => {
    const other = buildGuestLine(product(), variant(), 1, [{ optionId: 'o1', quantity: 1 }], []);
    expect(addGuestLine([line()], other).lines).toHaveLength(2);
  });

  it('autre vendeur : refusé, le panier ne bouge pas', () => {
    const lines = [line()];
    const other = buildGuestLine(product({ id: 'p2', restaurantId: 'v2' }), variant({ id: 'va2' }), 1, [], []);
    expect(addGuestLine(lines, other)).toEqual({ status: 'other_vendor', lines });
  });

  it('plafond de quantité du serveur', () => {
    const lines = [line({}, MAX_GUEST_LINE_QUANTITY)];
    expect(addGuestLine(lines, line()).status).toBe('limit');
  });

  it('stock : deux formats puisent dans le même compteur, selon leur poids', () => {
    const limited = product({ stockRestant: 7 });
    const carton = buildGuestLine(limited, variant({ id: 'carton', stockConsumption: 6 }), 1, [], []);
    const bouteille = buildGuestLine(limited, variant({ id: 'bouteille', stockConsumption: 1 }), 2, [], []);
    expect(addGuestLine([carton], bouteille).status).toBe('limit');
  });

  it('stock `null` = illimité, jamais confondu avec 0', () => {
    expect(addGuestLine([], line({ stockRestant: null }, 10)).status).toBe('added');
  });
});

describe('setGuestLineQuantity', () => {
  it('zéro retire la ligne', () => {
    const l = line();
    expect(setGuestLineQuantity([l], l.id, 0)).toEqual([]);
  });

  it('au-delà du stock : la quantité ne bouge pas', () => {
    const l = line({ stockRestant: 2 }, 2);
    expect(setGuestLineQuantity([l], l.id, 3)[0].quantite).toBe(2);
    expect(canIncreaseGuestLine([l], l.id)).toBe(false);
  });

  it('dans le stock : la quantité change', () => {
    const l = line({ stockRestant: 3 }, 2);
    expect(setGuestLineQuantity([l], l.id, 3)[0].quantite).toBe(3);
    expect(canIncreaseGuestLine([l], l.id)).toBe(true);
  });
});

describe('parseGuestCart', () => {
  const now = 1_000_000_000;

  it('relit ce qui a été écrit', () => {
    const l = line();
    expect(parseGuestCart(serializeGuestCart([l], now), now)).toEqual([l]);
  });

  it.each([
    ['absent', null],
    ['vide', ''],
    ['JSON cassé', '{oups'],
    ['mauvaise forme', '{"lines":"x"}'],
    ['nombre', '42'],
  ])('%s : pas de panier', (_label, raw) => {
    expect(parseGuestCart(raw, now)).toEqual([]);
  });

  it('expiré après 7 jours', () => {
    const raw = serializeGuestCart([line()], now);
    expect(parseGuestCart(raw, now + GUEST_CART_TTL_MS - 1)).toHaveLength(1);
    expect(parseGuestCart(raw, now + GUEST_CART_TTL_MS + 1)).toEqual([]);
  });

  it('écarte une ligne modifiée à la main, garde les autres', () => {
    const good = line();
    const raw = JSON.stringify({ savedAt: now, lines: [good, { ...good, quantite: 'beaucoup' }, { ...good, variantId: 42 }, { ...good, quantite: 0 }] });
    expect(parseGuestCart(raw, now)).toEqual([good]);
  });
});

describe('guestCartAsCart', () => {
  it('rend la forme lue par le tiroir et les règles de panier', () => {
    const l = line({}, 2);
    const cart = guestCartAsCart([l]);
    expect(cart.items[0].product?.nom).toBe('Poulet DG');
    expect(cartLineUnitPrice(cart.items[0])).toBe(3000);
    expect(cartSubtotal(cart)).toBe(6000);
  });

  it('porte le mode du panier', () => {
    const cart = guestCartAsCart([line({ madeToOrder: true })]);
    expect(isPreorderCart(cart)).toBe(true);
    expect(hasPreorderConflict(cart, { madeToOrder: false })).toBe(true);
  });
});
