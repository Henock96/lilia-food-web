import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@lilia/api-client';
import type { Order } from '@lilia/types';
import CommandeDetailPage from '../app/(protected)/commandes/[id]/page';

const state = vi.hoisted(() => ({
  data: undefined as Order | undefined,
  isLoading: false,
  isError: false,
  error: null as unknown,
  isPaused: false,
  isFetching: false,
  refetch: vi.fn(),
}));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  use: () => ({ id: 'order-123' }),
}));
vi.mock('@/lib/auth-session', () => ({
  useAuthSession: () => ({ token: 'synthetic' }),
  useSessionGuard: () => () => true,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@lilia/api-client', async (original) => ({
  ...await original<typeof import('@lilia/api-client')>(),
  useOrder: () => state,
  useCancelOrder: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useReorder: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useDownloadReceipt: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/components/checkout/payment-panel', () => ({
  PaymentPanel: ({ paymentAllowed }: { paymentAllowed: boolean }) =>
    React.createElement('div', { 'data-payment-allowed': String(paymentAllowed) }),
}));
vi.mock('@/components/orders/pickup-panel', () => ({ PickupPanel: () => null }));
vi.mock('@/components/orders/handover-and-report', () => ({ HandoverCodePanel: () => null, ReportIssuePanel: () => null }));
vi.mock('@/components/orders/claim-panel', () => ({ ClaimPanel: () => null }));

beforeEach(() => {
  vi.stubGlobal('React', React);
  Object.assign(state, {
    data: {
      id: 'order-123', status: 'EN_ATTENTE', orderFlow: 'ACCEPT_FIRST',
      acceptedAt: '2026-01-01T10:00:00Z', createdAt: '2026-01-01T09:00:00Z',
      paymentAllowed: true, allowedActions: ['CANCEL'], paidAt: null,
      restaurant: { nom: 'PRIVATE-VENDOR' }, items: [], isDelivery: false,
      subTotal: 1000, deliveryFee: 0, serviceFee: 150, total: 1150,
      discountAmount: 0, paymentMethod: 'MTN_MOMO',
    } as unknown as Order,
    isLoading: false, isError: false, error: null, isPaused: false, isFetching: false,
  });
});
afterEach(() => vi.unstubAllGlobals());
const render = () => renderToStaticMarkup(React.createElement(CommandeDetailPage, {
  params: Promise.resolve({ id: 'order-123' }),
}));

describe('order detail tracking integration', () => {
  it('does not treat restaurant acceptance as a confirmed payment', () => {
    const html = render();
    expect(html).toContain('PRIVATE-VENDOR');
    expect(html).toContain('data-payment-allowed="true"');
    expect(html).toContain('Annuler la commande');
    expect(html).not.toContain('Télécharger le reçu');
  });
  it.each(['error', 'offline'])('blocks new payment and cancellation while the cached read is %s, then recovers', (reason) => {
    state.isError = reason === 'error';
    state.error = state.isError ? new ApiError(503, 'unavailable') : null;
    state.isPaused = reason === 'offline';
    const stale = render();
    expect(stale).toContain('PRIVATE-VENDOR');
    expect(stale).toContain('dernier état connu');
    expect(stale).toContain('data-payment-allowed="false"');
    expect(stale).not.toContain('Annuler la commande');
    Object.assign(state, { isError: false, error: null, isPaused: false });
    const recovered = render();
    expect(recovered).toContain('data-payment-allowed="true"');
    expect(recovered).toContain('Annuler la commande');
    expect(recovered).not.toContain('dernier état connu');
  });
  it.each([401, 403, 404])('hides previously cached private details after HTTP %s', (status) => {
    state.isError = true;
    state.error = new ApiError(status, 'unavailable');
    const html = render();
    expect(html).not.toContain('PRIVATE-VENDOR');
    expect(html).not.toContain('data-payment-allowed');
    expect(html).not.toContain('Annuler la commande');
    expect(html).toContain('Retour aux commandes');
  });
  it.each(['ANNULER', 'ECHEC_LIVRAISON'] as const)('shows the terminal outcome for %s', (status) => {
    Object.assign(state.data!, { status, paymentAllowed: false, allowedActions: [] });
    const html = render();
    expect(html).not.toContain('Suivi de commande');
    expect(html).toContain(status === 'ANNULER' ? 'Commande annulée' : 'La livraison n’a pas pu être effectuée');
    expect(html).toContain('data-payment-allowed="false"');
  });
});
