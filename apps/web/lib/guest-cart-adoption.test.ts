import { describe, expect, it, vi } from 'vitest';
import type { Cart, Product, ProductVariant } from '@lilia/types';
import { ApiError } from '@lilia/api-client';
import { adoptGuestCart } from './guest-cart-adoption';
import { buildGuestLine, type GuestCartLine } from './guest-cart';

const guest = (nom: string, over: Partial<Product> = {}): GuestCartLine =>
  buildGuestLine(
    { id: `p-${nom}`, nom, restaurantId: 'v1', madeToOrder: false, stockRestant: null, ...over } as Product,
    { id: `va-${nom}`, label: null, prix: 1000 } as unknown as ProductVariant,
    1,
    [],
    [],
  );
const serverCart = (restaurantId: string | null, madeToOrder = false) =>
  ({ items: restaurantId ? [{ product: { restaurantId, madeToOrder } }] : [] }) as unknown as Cart;

function ports(lines: GuestCartLine[], server: Cart = serverCart(null)) {
  const saved: GuestCartLine[][] = [];
  return {
    saved,
    p: {
      lines,
      readServerCart: vi.fn(async () => server),
      clearServerCart: vi.fn(async () => {}),
      addLine: vi.fn(async (_line: GuestCartLine) => {}),
      save: (rest: GuestCartLine[]) => { saved.push(rest); },
    },
  };
}

describe('adoptGuestCart', () => {
  it('rien à verser : aucun appel', async () => {
    const { p } = ports([]);
    expect(await adoptGuestCart(p)).toEqual({ status: 'done', refused: [], replaced: false });
    expect(p.readServerCart).not.toHaveBeenCalled();
  });

  it('panier serveur vide : tout est versé, et le magasin se vide au fil de l’eau', async () => {
    const a = guest('Alloco');
    const b = guest('Poulet');
    const { p, saved } = ports([a, b]);
    expect(await adoptGuestCart(p)).toEqual({ status: 'done', refused: [], replaced: false });
    expect(p.addLine.mock.calls.map(([l]) => l.id)).toEqual([a.id, b.id]);
    expect(p.clearServerCart).not.toHaveBeenCalled();
    expect(saved).toEqual([[b], []]);
  });

  it('même vendeur, même mode : le panier du compte est conservé', async () => {
    const { p } = ports([guest('Alloco')], serverCart('v1'));
    const result = await adoptGuestCart(p);
    expect(p.clearServerCart).not.toHaveBeenCalled();
    expect(result.replaced).toBe(false);
  });

  it('autre vendeur : le visiteur gagne, et c’est dit', async () => {
    const { p } = ports([guest('Alloco')], serverCart('v2'));
    const result = await adoptGuestCart(p);
    expect(p.clearServerCart).toHaveBeenCalledOnce();
    expect(result).toEqual({ status: 'done', refused: [], replaced: true });
  });

  it('même vendeur, autre mode : le visiteur gagne', async () => {
    const { p } = ports([guest('Alloco')], serverCart('v1', true));
    expect((await adoptGuestCart(p)).replaced).toBe(true);
  });

  it('refus métier : seule cette ligne saute, elle est nommée et retirée', async () => {
    const a = guest('Alloco');
    const b = guest('Poulet');
    const { p, saved } = ports([a, b]);
    p.addLine.mockImplementationOnce(async () => { throw new ApiError(400, 'Épuisé'); });
    expect(await adoptGuestCart(p)).toEqual({ status: 'done', refused: ['Alloco'], replaced: false });
    expect(p.addLine).toHaveBeenCalledTimes(2);
    expect(saved.at(-1)).toEqual([]);
  });

  it.each([
    ['réseau coupé', new TypeError('fetch failed')],
    ['500', new ApiError(500, 'Erreur')],
    ['429', new ApiError(429, 'Trop de requêtes')],
    ['401', new ApiError(401, 'Session expirée')],
  ])('%s au milieu : seul ce qui n’est pas passé reste', async (_label, error) => {
    const a = guest('Alloco');
    const b = guest('Poulet');
    const c = guest('Bissap');
    const { p, saved } = ports([a, b, c]);
    p.addLine.mockImplementationOnce(async () => {});
    p.addLine.mockImplementationOnce(async () => { throw error; });
    const result = await adoptGuestCart(p);
    expect(result.status).toBe('interrupted');
    expect(p.addLine).toHaveBeenCalledTimes(2);
    expect(saved.at(-1)).toEqual([b, c]);
  });

  it('lecture du panier serveur impossible : rien n’est versé ni perdu', async () => {
    const a = guest('Alloco');
    const { p, saved } = ports([a]);
    p.readServerCart.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect((await adoptGuestCart(p)).status).toBe('interrupted');
    expect(p.addLine).not.toHaveBeenCalled();
    expect(saved).toEqual([]);
  });

  it('vidage du panier serveur impossible : rien n’est versé ni perdu', async () => {
    const { p, saved } = ports([guest('Alloco')], serverCart('v2'));
    p.clearServerCart.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect((await adoptGuestCart(p)).status).toBe('interrupted');
    expect(p.addLine).not.toHaveBeenCalled();
    expect(saved).toEqual([]);
  });
});
