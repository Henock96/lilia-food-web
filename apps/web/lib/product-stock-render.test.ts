import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product, Restaurant } from '@lilia/types';
import { RestaurantMenu } from '../components/restaurants/restaurant-menu';
import { ProductPurchase } from '../components/products/product-purchase';

vi.mock('@/lib/auth-session', () => ({ useAuthSession: () => ({ token: null }), useSessionGuard: () => () => true }));
vi.mock('@lilia/api-client', () => ({ useAddToCart: () => ({ isPending: false }), useClearCart: () => ({}), useCart: () => ({ data: null }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/analytics', () => ({ analytics: { track: vi.fn() } }));
vi.mock('@/components/cart/cart-mode-conflict-dialog', () => ({ CartModeConflictDialog: () => null }));
vi.mock('@/components/ui', () => ({ ImageCarousel: () => null }));

afterEach(() => vi.unstubAllGlobals());

function product(availableQuantity: number | null, stockStatus: 'AVAILABLE' | 'OUT_OF_STOCK' | 'UNLIMITED'): Product {
  return { id: 'p', nom: 'Carton', prixOriginal: 1000, restaurantId: 'r', stockRestant: 5,
    isAvailable: true, availableNow: true, images: [],
    description: null, imageUrl: null, stockQuotidien: null, categoryId: null,
    createdAt: '2026-01-01', updatedAt: '2026-01-01',
    variants: [{ id: 'c6', productId: 'p', createdAt: '2026-01-01', updatedAt: '2026-01-01', label: 'Six', prix: 1000, stockConsumption: 6, availableQuantity, stockStatus }],
  };
}

describe('LF12 — boutons réels avec format unique sélectionné', () => {
  it.each([
    [0, 'OUT_OF_STOCK', true],
    [2, 'AVAILABLE', false],
    [null, 'UNLIMITED', false],
  ] as const)('quantité %s, verdict %s : ajout désactivé %s', (quantity, status, disabled) => {
    vi.stubGlobal('React', React);
    const item = product(quantity, status);
    const restaurant = { id: 'r', isOpen: true, categories: [], products: [item] } as unknown as Restaurant;
    const menu = renderToStaticMarkup(createElement(RestaurantMenu, { restaurant }));
    const detail = renderToStaticMarkup(createElement(ProductPurchase, { product: item, vendor: null }));
    const menuButton = menu.match(/<button[^>]*aria-label="(?:Carton — en rupture|Ajouter Carton au panier)"[^>]*>/)?.[0];
    const detailButton = detail.match(/<button[^>]*disabled=""[^>]*class="[^"]*w-full/)?.[0];
    expect(menuButton).toBeDefined();
    expect(menuButton?.includes('disabled=""')).toBe(disabled);
    if (disabled) {
      expect(detailButton).toBeDefined();
      expect(menu).toContain('Ce format est épuisé');
      expect(detail).toContain('Ce format est épuisé');
    } else {
      expect(detail).toContain('Ajouter au panier');
    }
  });
});


it('LF12 — plafond publié de 1 désactive Augmenter malgré 5 unités de stock brut', () => {
  vi.stubGlobal('React', React);
  const detail = renderToStaticMarkup(createElement(ProductPurchase, { product: product(1, 'AVAILABLE'), vendor: null }));
  const increase = detail.match(/<button[^>]*aria-label="Augmenter"[^>]*>/)?.[0];
  expect(increase).toContain('disabled=""');
});

it('LF12 — fiche choisit le format disponible parmi un carton épuisé et une bouteille vendable', () => {
  vi.stubGlobal('React', React);
  const item = product(0, 'OUT_OF_STOCK');
  item.variants.push({ ...item.variants[0]!, id: 'b', label: 'Bouteille', prix: 200,
    availableQuantity: 5, stockConsumption: 1, stockStatus: 'AVAILABLE' });
  const detail = renderToStaticMarkup(createElement(ProductPurchase, { product: item, vendor: null }));
  expect(detail).toMatch(/aria-pressed="true"[^>]*>Bouteille/);
  expect(detail).toContain('Ajouter au panier');
  expect(detail).not.toContain('Ce format est épuisé');
});
