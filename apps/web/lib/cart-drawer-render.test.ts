import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CartDrawer } from '../components/layout/cart-drawer';

const fixture = vi.hoisted(() => ({ data: undefined as unknown, loading: false, error: false, paused: false, pending: false, token: 'synthetic' as string | null, sessionLoading: false }));
vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ token: fixture.token, isLoading: fixture.sessionLoading }), useSessionGuard: () => () => true }));
vi.mock('@/store/cart', () => ({ useCartStore: () => ({ isOpen: true, closeCart: vi.fn() }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('@lilia/api-client', async original => ({
  ...await original<typeof import('@lilia/api-client')>(),
  useCart: () => ({ data: fixture.data, isLoading: fixture.loading, isError: fixture.error, isPaused: fixture.paused, isFetching: false, refetch: vi.fn() }),
  useUpdateCartItem: () => ({ isPending: fixture.pending }),
  useRemoveCartItem: () => ({ isPending: false }),
}));
afterEach(() => { vi.unstubAllGlobals(); fixture.data = undefined; fixture.loading = false; fixture.error = false; fixture.paused = false; fixture.pending = false; fixture.token = 'synthetic'; fixture.sessionLoading = false; });
const render = () => { vi.stubGlobal('React', React); return renderToStaticMarkup(React.createElement(CartDrawer)); };
describe('cart drawer rendered states', () => {
  it('shows loading rather than an empty cart', () => {
    fixture.loading = true;
    const html = render();
    expect(html).toContain('Chargement du panier'); expect(html).not.toContain('Votre panier est vide');
  });
  it.each([undefined, { items: [] }])('shows read failure and retry even with cached emptiness', (data) => {
    fixture.data = data; fixture.error = true;
    const html = render();
    expect(html).toContain('Impossible de charger votre panier'); expect(html).toContain('Réessayer');
    expect(html).not.toContain('Votre panier est vide'); expect(html).not.toContain('Sous-total');
  });
  it('shows empty only after a successful empty read', () => {
    fixture.data = { items: [] }; expect(render()).toContain('Votre panier est vide');
  });
  it('does not offer checkout while an offline read is paused with a cached cart', () => {
    fixture.paused = true;
    fixture.data = { items: [{ id: 'one', quantite: 1, product: { nom: 'Plat', prixOriginal: 1000 } }] };
    const html = render();
    expect(html).toContain('Son contenu ne peut pas être confirmé');
    expect(html).not.toContain('Sous-total');
    expect(html).not.toContain('Augmenter la quantité');
  });
  it('disables both quantity controls while a mutation is pending', () => {
    fixture.pending = true;
    fixture.data = { items: [{ id: 'one', quantite: 1, product: { nom: 'Plat', prixOriginal: 1000 } }] };
    const html = render();
    expect(html).toMatch(/aria-label="Diminuer la quantité" disabled=""/);
    expect(html).toMatch(/aria-label="Augmenter la quantité" disabled=""/);
  });
});

it('invites an anonymous visitor to sign in without inventing a read error or empty cart', () => {
  fixture.token = null;
  const html = render();
  expect(html).toContain('Connectez-vous pour consulter votre panier.');
  expect(html).not.toContain('Impossible de charger'); expect(html).not.toContain('Votre panier est vide');
});
it('waits for the session before inviting the visitor to sign in', () => {
  fixture.token = null; fixture.sessionLoading = true;
  const html = render();
  expect(html).toContain('Chargement du panier'); expect(html).not.toContain('Connectez-vous');
});
