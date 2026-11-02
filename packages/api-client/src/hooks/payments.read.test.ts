import { afterEach, describe, expect, it, vi } from 'vitest';
import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { createPaymentMutationOptions, paymentReadPollIntervalMs, parseOrderPayment, PaymentStatusReadError, readOrderPayment } from './payments';
import { SessionObsoleteError, type SessionCredential } from '../auth-session';

const pending = { paymentId: 'payment-1', orderId: 'order-1', status: 'PENDING', amount: 1150, currency: 'XAF', provider: 'PAWAPAY', createdAt: '2026-11-03T12:00:00Z' };
const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });
afterEach(() => vi.unstubAllGlobals());
describe('payment recovery', () => {
  it.each([undefined, {}, { ...pending, status: 'UNKNOWN' }, { ...pending, orderId: 'another-order' }, { ...pending, amount: 1.5 }])('rejects malformed/unknown status instead of treating it as no payment', (value) => {
    expect(() => parseOrderPayment(value, 'order-1')).toThrow();
  });
  it('accepts an explicit confirmed absence', async () => {
    const fetch = vi.fn(async () => ok(null)); vi.stubGlobal('fetch', fetch);
    await expect(readOrderPayment('order-1', 'synthetic')).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('refreshes an existing pending transaction with GET only', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(ok(pending)).mockResolvedValueOnce(ok({ ...pending, status: 'SUCCESS' })); vi.stubGlobal('fetch', fetch);
    await expect(readOrderPayment('order-1', 'synthetic')).resolves.toMatchObject({ status: 'SUCCESS' });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([expect.stringContaining('/payments/by-order/order-1'), expect.stringContaining('/payments/payment-1/status')]);
    expect(fetch.mock.calls.every(([, options]) => !options.method || options.method === 'GET')).toBe(true);
  });
  it('keeps PENDING evidence but exposes a status refresh failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(pending)).mockRejectedValueOnce(new Error('offline')));
    const error = await readOrderPayment('order-1', 'synthetic').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PaymentStatusReadError);
    expect((error as PaymentStatusReadError).pending).toEqual(pending);
  });
  it('does not hide initial HTTP failure behind null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ message: 'unavailable' }) })));
    await expect(readOrderPayment('order-1', 'synthetic')).rejects.toMatchObject({ status: 500 });
  });
  it('preserves session fencing when status refresh fails after logout', async () => {
    let current = true;
    const credential: SessionCredential = { uid: 'A', generation: 1, signal: new AbortController().signal, isCurrent: () => current, getToken: () => 'synthetic', refresh: async () => 'synthetic', onAuthError: async () => {} };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(pending)).mockImplementationOnce(async () => { current = false; throw new Error('offline'); }));
    await expect(readOrderPayment('order-1', credential)).rejects.toBeInstanceOf(SessionObsoleteError);
  });
  it('invalidates payment and order after a lost POST response without replay', async () => {
    const client = new QueryClient(); const invalidate = vi.spyOn(client, 'invalidateQueries');
    const fetch = vi.fn(async () => { throw new Error('response lost'); }); vi.stubGlobal('fetch', fetch);
    const mutation = new MutationObserver(client, createPaymentMutationOptions('synthetic', client));
    await expect(mutation.mutate({ orderId: 'order-1', phoneNumber: '+242060000000' })).rejects.toThrow('response lost');
    expect(fetch).toHaveBeenCalledOnce();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['payments', 'by-order', 'order-1'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders', 'detail', 'order-1'] });
    client.clear();
  });
});

it('polls pending evidence after the first status GET fails, then stops at its original deadline', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(pending)).mockRejectedValueOnce(new Error('offline')));
  const error = await readOrderPayment('order-1', 'synthetic').catch((e: unknown) => e);
  const start = Date.parse(pending.createdAt);
  expect(paymentReadPollIntervalMs(undefined, error, start + 1000)).toBe(3000);
  expect(paymentReadPollIntervalMs(null, error, start + 61000)).toBe(5000);
  expect(paymentReadPollIntervalMs(undefined, error, start + 180001)).toBe(false);
  expect(paymentReadPollIntervalMs(undefined, new Error('offline'), start)).toBe(false);
});
