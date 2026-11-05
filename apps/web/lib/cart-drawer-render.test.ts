import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product, ProductVariant } from '@lilia/types';
import { CartDrawer } from '../components/layout/cart-drawer';
import { buildGuestLine, guestCartAsCart, type GuestCartLine } from './guest-cart';

const fixture = vi.hoisted(() => ({ data: undefined as unknown, loading: false, error: false, paused: false, pending: false, token: 'synthetic' as string | null, sessionLoading: false, guestLines: [] as GuestCartLine[] }));
vi.mock('@/lib/use-cart-view', () => ({ useCartView: (token: unknown) => token ? fixture.data : guestCartAsCart(fixture.guestLines) }));
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

describe('panier du visiteur', () => {
  // Rendu serveur : zustand y lit son état initial, la vue s'injecte donc ici.
  const line = () => buildGuestLine(
    { id: 'p1', nom: 'Poulet DG', restaurantId: 'v1', stockRestant: null } as Product,
    { id: 'va1', label: 'Grande', prix: 3000 } as ProductVariant, 2, [], [],
  );
  afterEach(() => { fixture.guestLines = []; });

  it('vide : un panier vide, sans erreur de lecture', () => {
    fixture.token = null;
    const html = render();
    expect(html).toContain('Votre panier est vide'); expect(html).not.toContain('Impossible de charger');
  });

  it('avec des lignes : prix indicatif, sans total final, et la connexion comme suite', () => {
    fixture.token = null; fixture.guestLines = [line()];
    const html = render();
    expect(html).toContain('Poulet DG');
    expect(html).toContain('Sous-total indicatif');
    expect(html).toContain('Se connecter pour commander');
    expect(html).not.toContain('Voir le panier');
    expect(html).not.toContain('>Total<');
  });

  it('attend la session avant de montrer quoi que ce soit', () => {
    fixture.token = null; fixture.sessionLoading = true; fixture.guestLines = [line()];
    const html = render();
    expect(html).toContain('Chargement du panier'); expect(html).not.toContain('Poulet DG');
  });
});
