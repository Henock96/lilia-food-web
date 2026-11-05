import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../client';
import { cartQueryOptions } from './cart';

afterEach(() => vi.unstubAllGlobals());

const respondWith = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe('cartQueryOptions', () => {
  it('un compte sans panier (404 du serveur) a un panier vide, pas une erreur', async () => {
    respondWith(404, { message: 'Panier non trouvé.' });
    const cart = await cartQueryOptions('synthetic').queryFn();
    expect(cart.items).toEqual([]);
  });

  it('une panne reste une panne : le panier n’est pas annoncé vide', async () => {
    respondWith(500, { message: 'Erreur interne' });
    await expect(cartQueryOptions('synthetic').queryFn()).rejects.toBeInstanceOf(ApiError);
  });

  it('une réponse incomplète reste refusée', async () => {
    respondWith(200, { data: { id: 'c1' } });
    await expect(cartQueryOptions('synthetic').queryFn()).rejects.toMatchObject({ code: 'INVALID_CART' });
  });

  it('un panier servi est rendu tel quel', async () => {
    respondWith(200, { data: { id: 'c1', items: [{ id: 'i1' }] } });
    const cart = await cartQueryOptions('synthetic').queryFn();
    expect(cart.items).toHaveLength(1);
  });
});
