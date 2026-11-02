import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../packages/api-client/src/client';

// Execute the real source closure: no duplicated handler and no business network.
function handler(context: Record<string, unknown>) {
  const path = '../app/(protected)/panier/page.tsx';
  const source = ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'handleCheckout') found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!found) throw new Error('Missing actual checkout handler');
  const code = ts.transpileModule(`${found.getText(source)}; handleCheckout`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return runInNewContext(code, { Error, ...context }) as () => Promise<void>;
}
function setup() {
  const c = {
    isCurrentSession: () => true, submitting: { current: false }, quoteReady: true,
    quote: { quoteFingerprint: 'signed-quote', vendorOffer: { id: 'offer' } },
    quoteDto: { useLoyaltyPoints: true, deliveryMode: 'PICKUP', scheduledFor: '2026-12-01T10:00:00Z' },
    token: null, cartSignature: 'cart', checkoutQuoteQueryOptions: () => ({ queryKey: ['cart', 'quote'] }),
    checkoutCacheCurrent: () => true,
    queryClient: { getQueryState: vi.fn(), isMutating: () => 0, invalidateQueries: vi.fn() },
    maintenance: false, vendorServesNobody: false, minimumError: null, cartIsPreorder: false,
    scheduledFor: null, isDelivery: false, selectedAdresseId: null, phoneIsValid: true,
    setPhoneTouched: vi.fn(), analytics: { track: vi.fn(), trackOnce: vi.fn() }, items: [{}], subTotal: 1000,
    setCheckoutLoading: vi.fn(), normalizeCongoPhone: () => '242061234567', contactPhone: '06 123 45 67',
    createOrder: { mutateAsync: vi.fn().mockResolvedValue({ id: 'order', total: 1000, orderFlow: 'ACCEPT_FIRST' }) },
    createPayment: { mutateAsync: vi.fn() }, paymentMethod: 'MOMO', notes: '',
    onceKey: { orderCreated: (id: string) => id }, CURRENCY: 'XAF',
    toast: { success: vi.fn(), error: vi.fn() }, router: { push: vi.fn() }, ApiError,
    pricingKeys: { platformSettings: ['pricing'] }, isServiceModeError: () => false,
  };
  return c;
}
describe('actual checkout submission handler', () => {
  it('creates only the order with exact quote choices and fingerprint', async () => {
    const c = setup(); await handler(c)();
    expect(c.createOrder.mutateAsync).toHaveBeenCalledExactlyOnceWith({ ...c.quoteDto, paymentMethod: 'MOMO', notes: undefined, contactPhone: '242061234567', quoteFingerprint: 'signed-quote', vendorOfferId: 'offer' });
    expect(c.createPayment.mutateAsync).not.toHaveBeenCalled();
    expect(c.router.push).toHaveBeenCalledWith('/commandes/order');
  });
  it('blocks a second click while creation is unresolved', async () => {
    const c = setup(); let resolve!: (value: unknown) => void;
    c.createOrder.mutateAsync.mockImplementation(() => new Promise(r => { resolve = r; }));
    const run = handler(c); const first = run(); await run();
    expect(c.createOrder.mutateAsync).toHaveBeenCalledTimes(1);
    resolve({ id: 'order', total: 1000 }); await first; expect(c.submitting.current).toBe(false);
  });
  it('invalidates QUOTE_CHANGED without opening payment or navigating', async () => {
    const c = setup(); c.createOrder.mutateAsync.mockRejectedValue(new ApiError(409, 'changed', 'QUOTE_CHANGED'));
    await handler(c)();
    expect(c.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cart', 'quote'] });
    expect(c.createPayment.mutateAsync).not.toHaveBeenCalled(); expect(c.router.push).not.toHaveBeenCalled();
    expect(c.submitting.current).toBe(false); expect(c.setCheckoutLoading).toHaveBeenLastCalledWith(false);
  });
  it('rejects a quote that is no longer current in cache', async () => {
    const c = setup(); c.checkoutCacheCurrent = () => false;
    await handler(c)(); expect(c.createOrder.mutateAsync).not.toHaveBeenCalled();
  });
  it('does not submit while another cart mutation is active', async () => {
    const c = setup(); c.queryClient.isMutating = () => 1;
    await handler(c)(); expect(c.createOrder.mutateAsync).not.toHaveBeenCalled();
  });
  it('suppresses navigation and notifications after session replacement', async () => {
    const c = setup(); let current = true; c.isCurrentSession = () => current;
    c.createOrder.mutateAsync.mockImplementation(async () => { current = false; return { id: 'old', total: 1000 }; });
    await handler(c)(); expect(c.router.push).not.toHaveBeenCalled(); expect(c.toast.success).not.toHaveBeenCalled();
  });
});
