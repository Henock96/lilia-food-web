import { QueryClient, MutationObserver, type MutationObserverOptions } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { SessionObsoleteError, type SessionCredential } from './auth-session';
import { myOrdersPageQueryOptions, orderKeys, useReorder, type ReorderResult } from './hooks/orders';
import { cartQueryOptions } from './hooks/cart';

const bridge = vi.hoisted(() => ({ client: null as QueryClient | null, options: {} as MutationObserverOptions<ReorderResult, Error, string> }));
vi.mock('./session-query', async (original) => ({
  ...await original<typeof import('./session-query')>(),
  useQueryClient: () => bridge.client,
  useMutation: (options: typeof bridge.options) => { bridge.options = options; return {}; },
}));
beforeEach(() => { bridge.client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); });
afterEach(() => { bridge.client?.clear(); vi.unstubAllGlobals(); });
const result = (added = 1, unavailable = 0, errors = 0): ReorderResult => ({
  summary: { totalAdded: added, totalUnavailable: unavailable, totalErrors: errors },
  details: {
    added: Array.from({ length: added }, () => ({ productName: 'Plat' })),
    unavailable: Array.from({ length: unavailable }, () => ({ productName: 'Jus', reason: 'Rupture de stock' })),
    errors: Array.from({ length: errors }, () => ({ productId: 'id' })),
  },
});

describe('client order history HTTP contract', () => {
  it('requests distinct pages beyond twenty orders and preserves server totals', async () => {
    const fetch = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      return Response.json({ data: Array.from({ length: 20 }, (_, i) => ({ id: `order-${(page - 1) * 20 + i}` })), meta: { page, limit: 20, total: 43, totalPages: 3 } });
    });
    vi.stubGlobal('fetch', fetch);
    const first = await bridge.client!.fetchQuery(myOrdersPageQueryOptions('synthetic', 1));
    const second = await bridge.client!.fetchQuery(myOrdersPageQueryOptions('synthetic', 2));
    expect(first.data[0].id).toBe('order-0');
    expect(second.data[0].id).toBe('order-20');
    expect(second.meta).toEqual({ page: 2, limit: 20, total: 43, totalPages: 3 });
    expect(fetch.mock.calls.map(([url]) => new URL(url).search)).toEqual(['?page=1&limit=20', '?page=2&limit=20']);
    expect(bridge.client!.getQueryData(orderKeys.minePage(1))).toEqual(first);
    expect(bridge.client!.getQueryData(orderKeys.minePage(2))).toEqual(second);
  });
  it('accepts a truly empty history, but not missing pagination metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }))
      .mockResolvedValueOnce(Response.json({ data: [] })));
    expect((await myOrdersPageQueryOptions('synthetic').queryFn()).meta.total).toBe(0);
    await expect(myOrdersPageQueryOptions('synthetic').queryFn()).rejects.toMatchObject({ code: 'INVALID_ORDER_HISTORY' });
  });
  it('keeps a failed second page distinct from an empty history or page one', async () => {
    bridge.client!.setQueryData(orderKeys.minePage(1), { data: [{ id: 'first' }], meta: { total: 21 } });
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ message: 'Indisponible' }, { status: 503 })));
    await expect(bridge.client!.fetchQuery(myOrdersPageQueryOptions('synthetic', 2))).rejects.toMatchObject({ status: 503 });
    expect(bridge.client!.getQueryData(orderKeys.minePage(2))).toBeUndefined();
    expect(bridge.client!.getQueryData(orderKeys.minePage(1))).toMatchObject({ data: [{ id: 'first' }] });
  });
  it('rejects the late response from a retired session', async () => {
    let current = true;
    const token: SessionCredential = { uid: 'A', generation: 1, signal: new AbortController().signal,
      isCurrent: () => current, getToken: () => 'synthetic', refresh: async () => 'synthetic', onAuthError: async () => {} };
    vi.stubGlobal('fetch', vi.fn(async () => { current = false; return Response.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } }); }));
    await expect(myOrdersPageQueryOptions(token).queryFn()).rejects.toBeInstanceOf(SessionObsoleteError);
    expect(myOrdersPageQueryOptions(null).enabled).toBe(false);
  });
});

describe('reorder mutation with real HTTP adapter and QueryClient invalidation', () => {
  it.each([[2, 0, 0], [1, 1, 1], [0, 2, 0], [0, 0, 0]])('preserves the server summary %s/%s/%s', async (added, unavailable, errors) => {
    const expected = result(added, unavailable, errors);
    const fetch = vi.fn(async () => Response.json({ data: expected }));
    vi.stubGlobal('fetch', fetch);
    bridge.client!.setQueryData(['cart', 'detail'], { items: [] });
    useReorder('synthetic');
    const observer = new MutationObserver(bridge.client!, bridge.options);
    await expect(observer.mutate('old-order')).resolves.toEqual(expected);
    expect(bridge.client!.getQueryState(['cart', 'detail'])?.isInvalidated).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/orders/old-order/reorder'), expect.objectContaining({ method: 'POST' }));
  });
  it.each([null, {}, { summary: { totalAdded: 1, totalUnavailable: 0, totalErrors: 0 }, details: { added: [], unavailable: [], errors: [] } }])('does not announce success for malformed result %j', async (body) => {
    const fetch = vi.fn(async () => Response.json({ data: body }));
    vi.stubGlobal('fetch', fetch);
    bridge.client!.setQueryData(['cart', 'detail'], { items: [] });
    useReorder('synthetic');
    const observer = new MutationObserver(bridge.client!, bridge.options);
    await expect(observer.mutate('order')).rejects.toMatchObject({ code: 'INVALID_REORDER_RESULT' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(bridge.client!.getQueryState(['cart', 'detail'])?.isInvalidated).toBe(true);
  });
  it('preserves the ownership error without replaying the POST', async () => {
    const fetch = vi.fn(async () => Response.json({ message: 'Cette commande ne vous appartient pas.' }, { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    useReorder('synthetic');
    await expect(new MutationObserver(bridge.client!, bridge.options).mutate('other-order')).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('cart read is not an empty-state fallback', () => {
  it.each([null, {}, { items: null }])('rejects malformed cart %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: body })));
    await expect(cartQueryOptions('synthetic').queryFn()).rejects.toMatchObject({ code: 'INVALID_CART' });
  });
  it('preserves a valid empty cart', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ data: { id: 'cart', items: [] } })));
    await expect(cartQueryOptions('synthetic').queryFn()).resolves.toEqual({ id: 'cart', items: [] });
  });
});
