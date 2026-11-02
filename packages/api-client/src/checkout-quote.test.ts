import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { isVerifiedCheckoutQuote } from './checkout-quote';
import { checkoutQuoteQueryOptions } from './hooks/orders';

const quote = () => ({ restaurantId: 'vendor', quoteFingerprint: `v1:${'a'.repeat(64)}`,
  subTotal: 1000, deliveryFee: 200, deliveryFeeBeforePromo: 200, serviceFee: 150,
  vendorOffer: null, promo: null, loyalty: { pointsUsed: 0, discountXaf: 0 }, total: 1350 });
afterEach(() => vi.unstubAllGlobals());

describe('devis vérifiable', () => {
  it('accepte uniquement une ventilation entière cohérente avec empreinte serveur', () => {
    expect(isVerifiedCheckoutQuote(quote())).toBe(true);
    expect(isVerifiedCheckoutQuote({ ...quote(), total: 1300 })).toBe(false);
    expect(isVerifiedCheckoutQuote({ ...quote(), serviceFee: 1.5 })).toBe(false);
    expect(isVerifiedCheckoutQuote({ ...quote(), quoteFingerprint: undefined })).toBe(false);
    expect(isVerifiedCheckoutQuote({ ...quote(), loyalty: null })).toBe(false);
    expect(isVerifiedCheckoutQuote({ ...quote(), promo: {} })).toBe(false);
    expect(isVerifiedCheckoutQuote({ ...quote(), vendorOffer: {} })).toBe(false);
  });

  it('valide promo livraison, remise boutique et points sans recalcul métier', () => {
    expect(isVerifiedCheckoutQuote({ ...quote(), deliveryFee: 0,
      promo: { code: 'SHIP', discountXaf: 0, deliveryDiscountXaf: 200 },
      vendorOffer: { id: 'offer', label: 'Offre', discountXaf: 100 },
      loyalty: { pointsUsed: 1, discountXaf: 50 }, total: 1000 })).toBe(true);
  });

  it('la vraie requête transmet choix et signal, puis refuse une réponse partielle', async () => {
    const signal = new AbortController().signal;
    const fetch = vi.fn(async () => new Response(JSON.stringify({ data: { total: 1350 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const options = checkoutQuoteQueryOptions('synthetic', { isDelivery: false, useLoyaltyPoints: true }, 'cart');
    await expect(options.queryFn({ signal })).rejects.toMatchObject({ code: 'INVALID_CHECKOUT_QUOTE' });
    const request = vi.mocked(fetch).mock.calls[0] as unknown as [string, RequestInit];
    expect(request[1].signal).toBe(signal);
    expect(JSON.parse(request[1].body as string)).toEqual({ isDelivery: false, useLoyaltyPoints: true });
  });

  it('un changement de choix ne réutilise pas le devis précédent pendant l’attente ou après erreur', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const old = checkoutQuoteQueryOptions('synthetic', { isDelivery: false }, 'cart-A');
    client.setQueryData(old.queryKey, quote());
    const observer = new QueryObserver(client, { ...old, enabled: false });
    const stop = observer.subscribe(() => {});
    let reject!: (error: Error) => void;
    const delayed = new Promise<Response>((_yes, no) => { reject = no; });
    vi.stubGlobal('fetch', vi.fn(() => delayed));
    const next = checkoutQuoteQueryOptions('synthetic', { isDelivery: true, adresseId: 'new-address' }, 'cart-B');
    observer.setOptions(next);
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
    reject(new Error('network'));
    await vi.waitFor(() => expect(observer.getCurrentResult().isError).toBe(true));
    expect(observer.getCurrentResult().data).toBeUndefined();
    stop(); client.clear();
  });
  it('la réponse A tardive ne remplace jamais B affiché', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const pending: Array<(response: Response) => void> = [];
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))));
    const first = checkoutQuoteQueryOptions('synthetic', { isDelivery: false }, 'cart');
    const second = checkoutQuoteQueryOptions('synthetic', { isDelivery: false, useLoyaltyPoints: true }, 'cart');
    // Keep A observed so both real requests complete, even after the visible observer switches to B.
    const background = new QueryObserver(client, first);
    const stopBackground = background.subscribe(() => {});
    const visible = new QueryObserver(client, first);
    const stop = visible.subscribe(() => {});
    visible.setOptions(second);
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    const a = quote();
    const b = { ...quote(), quoteFingerprint: `v1:${'b'.repeat(64)}`,
      loyalty: { pointsUsed: 1, discountXaf: 50 }, total: 1300 };
    pending[1]!(new Response(JSON.stringify({ data: b }), { status: 200 }));
    await vi.waitFor(() => expect(visible.getCurrentResult().data?.total).toBe(1300));
    pending[0]!(new Response(JSON.stringify({ data: a }), { status: 200 }));
    await vi.waitFor(() => expect(client.getQueryData(first.queryKey)).toEqual(a));
    expect(visible.getCurrentResult().data).toEqual(b);
    expect(visible.getCurrentResult().isPlaceholderData).toBe(false);
    stop(); stopBackground(); client.clear();
  });

  it.each([
    ['mode', { isDelivery: false }],
    ['adresse', { adresseId: 'address-B' }],
    ['promo', { promoCode: 'PROMO-B' }],
    ['points', { useLoyaltyPoints: true }],
    ['créneau', { scheduledFor: '2026-11-04T12:00:00.000Z' }],
  ] as const)('%s change la clé et ne présente pas le devis précédent', (_name, change) => {
    const client = new QueryClient();
    const dto = { isDelivery: true, adresseId: 'address-A', promoCode: 'PROMO-A',
      useLoyaltyPoints: false, scheduledFor: '2026-11-03T12:00:00.000Z' };
    const first = checkoutQuoteQueryOptions('synthetic', dto, 'cart');
    const next = checkoutQuoteQueryOptions('synthetic', { ...dto, ...change }, 'cart');
    expect(next.queryKey).not.toEqual(first.queryKey);
    client.setQueryData(first.queryKey, quote());
    const observer = new QueryObserver(client, { ...first, enabled: false });
    const stop = observer.subscribe(() => {});
    expect(observer.getCurrentResult().data).toEqual(quote());
    observer.setOptions({ ...next, enabled: false });
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
    stop(); client.clear();
  });

});
