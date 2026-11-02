import * as React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ReorderResult } from '@lilia/api-client';
import CommandesPage from '../app/(protected)/commandes/page';
import { ReorderNotice } from '../components/orders/reorder-notice';

// Execute the actual page handlers with deterministic hook state, without a DOM.
const state = vi.hoisted(() => ({
  slots: [] as unknown[], cursor: 0,
  history: { data: [{ id: 'old', status: 'LIVRER', createdAt: '2026-01-01', items: [], total: 1500, isDelivery: false }], meta: { page: 1, limit: 20, total: 43, totalPages: 3 } },
  failed: false, error: null as unknown, pending: false, current: true,
  read: vi.fn(), mutate: vi.fn(), push: vi.fn(), success: vi.fn(), warning: vi.fn(), toastError: vi.fn(),
}));
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = initial;
    return [state.slots[index], (value: unknown) => { state.slots[index] = typeof value === 'function' ? value(state.slots[index]) : value; }];
  },
}));
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ token: 'synthetic' }), useSessionGuard: () => () => state.current }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock('sonner', () => ({ toast: { success: state.success, warning: state.warning, error: state.toastError } }));
vi.mock('@lilia/api-client', async original => ({
  ...await original<typeof import('@lilia/api-client')>(),
  useMyOrdersPage: (token: string, page: number) => {
    state.read(token, page);
    return { data: state.history, isLoading: false, isFetching: false, isError: state.failed, error: state.error, isPaused: false, refetch: vi.fn() };
  },
  useReorder: () => ({ mutateAsync: state.mutate, isPending: state.pending }),
}));
type Node = React.ReactElement<{ children?: React.ReactNode; disabled?: boolean; onClick?: (event?: unknown) => unknown; result?: ReorderResult }>;
function nodes(value: React.ReactNode): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!React.isValidElement(value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children)];
}
function words(value: React.ReactNode): string {
  if (Array.isArray(value)) return value.map(words).join('');
  if (React.isValidElement(value)) return words((value as Node).props.children);
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function render() { state.cursor = 0; return CommandesPage(); }
function button(label: string) { return nodes(render()).find(node => node.type === 'button' && words(node.props.children).trim() === label)!; }
const outcome = (added: number, unavailable: number): ReorderResult => ({ summary: { totalAdded: added, totalUnavailable: unavailable, totalErrors: 0 }, details: { added: Array.from({ length: added }, () => ({})), unavailable: Array.from({ length: unavailable }, () => ({ reason: 'Épuisé' })), errors: [] } });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('React', React);
  Object.assign(state, { slots: [], cursor: 0, failed: false, error: null, pending: false, current: true });
});
afterEach(() => vi.unstubAllGlobals());

describe('history page controls and reorder handlers', () => {
  it('requests the next page then the previous, with boundaries', () => {
    expect(button('Précédent').props.disabled).toBe(true);
    button('Suivant').props.onClick?.(); render();
    expect(state.read).toHaveBeenLastCalledWith('synthetic', 2);
    button('Suivant').props.onClick?.();
    expect(button('Suivant').props.disabled).toBe(true);
    button('Précédent').props.onClick?.(); render();
    expect(state.read).toHaveBeenLastCalledWith('synthetic', 2);
  });
  it.each([[2, 0, true], [1, 1, false], [0, 1, false], [0, 0, false]])('handles server reorder result %s/%s (navigation=%s)', async (added, unavailable, navigates) => {
    const result = outcome(added, unavailable);
    state.mutate.mockResolvedValueOnce(result);
    const event = { preventDefault: vi.fn() };
    await button('Recommander').props.onClick?.(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(state.mutate).toHaveBeenCalledWith('old');
    if (navigates) {
      expect(state.push).toHaveBeenCalledWith('/panier');
      expect(state.success).toHaveBeenCalledOnce();
    } else {
      expect(state.push).not.toHaveBeenCalled();
      expect(state.success).not.toHaveBeenCalled();
      expect(nodes(render()).find(node => node.type === ReorderNotice)?.props.result).toEqual(result);
    }
  });
  it('shows a server rejection without success or navigation', async () => {
    state.mutate.mockRejectedValueOnce(new ApiError(400, 'Votre panier contient un autre vendeur.'));
    await button('Recommander').props.onClick?.({ preventDefault: vi.fn() });
    expect(state.toastError).toHaveBeenCalledWith('Votre panier contient un autre vendeur.');
    expect(state.push).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });
  it('ignores a result arriving after logout', async () => {
    state.mutate.mockImplementationOnce(async () => { state.current = false; return outcome(1, 0); });
    await button('Recommander').props.onClick?.({ preventDefault: vi.fn() });
    expect(state.push).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });
  it('does not submit a second reorder while pending', async () => {
    state.pending = true;
    const action = button('Recommander');
    expect(action.props.disabled).toBe(true);
    await action.props.onClick?.({ preventDefault: vi.fn() });
    expect(state.mutate).not.toHaveBeenCalled();
  });
  it('allows returning from a failed page without announcing an empty history', () => {
    state.failed = true;
    state.error = new ApiError(503, 'indisponible');
    state.slots = [2, null];
    expect(button('Précédent').props.disabled).toBe(false);
    expect(button('Suivant').props.disabled).toBe(true);
    expect(words(render())).toContain('Impossible de charger vos commandes');
    expect(words(render())).not.toContain('Aucune commande');
  });
});
