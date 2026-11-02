import { afterEach, describe, expect, it, vi } from 'vitest';

// Enable the browser timers in QueryObserver without installing a DOM runtime.
vi.hoisted(() => {
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
});
import { QueryClient, QueryObserver, focusManager, onlineManager } from '@tanstack/react-query';
import type { Order } from '@lilia/types';
import { ApiError } from './client';
import { SessionObsoleteError } from './auth-session';
import { orderPollInterval, orderQueryOptions } from './hooks/orders';

const clients: QueryClient[] = [];
const stops: (() => void)[] = [];
const order = (status: string) => ({ id: 'order', status, items: [] }) as unknown as Order;
function setup(initial: string = 'DEMANDE_ENVOYEE', initialFailure = false) {
  vi.useFakeTimers();
  let current = order(initial);
  let failed = initialFailure;
  const fetch = vi.fn(async (_url: string, _options?: RequestInit) => {
    if (failed) throw new Error('network unavailable');
    return new Response(JSON.stringify({ data: current }));
  });
  vi.stubGlobal('fetch', fetch);
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: 300000, refetchOnWindowFocus: false } } }); clients.push(client); client.mount();
  // Retry policy is checked separately; these tests exercise interval recovery.
  const options = { ...orderQueryOptions('order', 'synthetic'), retry: false };
  const observer = new QueryObserver(client, options);
  stops.push(observer.subscribe(() => {}));
  return { observer, fetch, client, options,
    status: (status: string) => { current = order(status); },
    fail: (value: boolean) => { failed = value; } };
}
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  for (const client of clients.splice(0)) { client.unmount(); client.clear(); }
  focusManager.setFocused(undefined); onlineManager.setOnline(true);
  vi.useRealTimers(); vi.unstubAllGlobals();
  vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
});

describe('order tracking policy', () => {
  it.each(['DEMANDE_ENVOYEE', 'EN_ATTENTE', 'PAYER', 'ACCEPTEE', 'EN_PREPARATION', 'PRET', 'EN_ROUTE', 'FUTURE_STATUS'])('keeps reading %s', (status) => {
    expect(orderPollInterval(order(status), null)).toBe(15000);
  });
  it.each(['LIVRER', 'ANNULER', 'ECHEC_LIVRAISON'])('stops only terminal %s', (status) => {
    expect(orderPollInterval(order(status), null)).toBe(false);
  });
  it('retries unknown reads but stops inaccessible resources and retired sessions', () => {
    expect(orderPollInterval(undefined, new Error('network'))).toBe(15000);
    for (const status of [401, 403, 404]) expect(orderPollInterval(order('PAYER'), new ApiError(status, 'unavailable'))).toBe(false);
    expect(orderPollInterval(undefined, new SessionObsoleteError())).toBe(false);
    const options = orderQueryOptions('order', 'synthetic');
    expect(options.retry(0, new Error('network'))).toBe(true);
    expect(options.retry(1, new Error('network'))).toBe(false);
    expect(options.retry(0, new ApiError(404, 'missing'))).toBe(false);
    expect(options.enabled).toBe(true);
    expect(orderQueryOptions('order', null).enabled).toBe(false);
  });
});

describe('real QueryObserver + HTTP adapter', () => {
  it('continues across acceptance, payment and preparation, stopping on delivery', async () => {
    const s = setup(); await s.observer.refetch();
    for (const status of ['EN_ATTENTE', 'PAYER', 'ACCEPTEE', 'EN_PREPARATION', 'PRET', 'EN_ROUTE', 'LIVRER']) {
      s.status(status); await vi.advanceTimersByTimeAsync(15000);
      expect(s.observer.getCurrentResult().data?.status).toBe(status);
    }
    const count = s.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(45000);
    expect(s.fetch).toHaveBeenCalledTimes(count);
  });
  it.each(['ANNULER', 'ECHEC_LIVRAISON'])('stops after the server returns %s', async (terminal) => {
    const s = setup('PRET'); await s.observer.refetch();
    s.status(terminal); await vi.advanceTimersByTimeAsync(15000);
    expect(s.observer.getCurrentResult().data?.status).toBe(terminal);
    const count = s.fetch.mock.calls.length;
    await vi.advanceTimersByTimeAsync(45000);
    expect(s.fetch).toHaveBeenCalledTimes(count);
  });
  it('recovers an initial network failure without requiring navigation', async () => {
    const s = setup('DEMANDE_ENVOYEE', true); await s.observer.refetch();
    expect(s.observer.getCurrentResult().data).toBeUndefined();
    expect(s.observer.getCurrentResult().isError).toBe(true);
    s.fail(false); s.status('EN_ATTENTE'); await vi.advanceTimersByTimeAsync(15000);
    expect(s.observer.getCurrentResult().data?.status).toBe('EN_ATTENTE');
  });
  it('retains the last known status on failure, then reads the new status', async () => {
    const s = setup('ACCEPTEE'); await s.observer.refetch(); s.fail(true);
    await vi.advanceTimersByTimeAsync(15000);
    expect(s.observer.getCurrentResult().isError).toBe(true);
    expect(s.observer.getCurrentResult().data?.status).toBe('ACCEPTEE');
    s.fail(false); s.status('EN_PREPARATION'); await vi.advanceTimersByTimeAsync(15000);
    expect(s.observer.getCurrentResult().isError).toBe(false);
    expect(s.observer.getCurrentResult().data?.status).toBe('EN_PREPARATION');
  });
  it('refreshes on tab focus, reconnection and remount despite fresh global defaults', async () => {
    const s = setup(); await s.observer.refetch();
    focusManager.setFocused(false); s.status('EN_ATTENTE'); focusManager.setFocused(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.observer.getCurrentResult().data?.status).toBe('EN_ATTENTE');
    onlineManager.setOnline(false); s.status('PAYER'); onlineManager.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(s.observer.getCurrentResult().data?.status).toBe('PAYER');
    s.status('PRET');
    const remounted = new QueryObserver(s.client, s.options);
    stops.push(remounted.subscribe(() => {}));
    await vi.advanceTimersByTimeAsync(0);
    expect(remounted.getCurrentResult().data?.status).toBe('PRET');
    expect(s.fetch.mock.calls.every(([, options]) => (options?.method ?? 'GET') === 'GET')).toBe(true);
  });
});
