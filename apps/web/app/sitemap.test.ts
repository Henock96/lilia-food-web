import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiClient: vi.fn(), connection: vi.fn(async () => {}) }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('next/server', () => ({ connection: api.connection }));
vi.mock('@lilia/api-client', async (original) => ({
  ...(await original<typeof import('@lilia/api-client')>()),
  apiClient: api.apiClient,
}));

import { ApiError } from '@lilia/api-client';
import sitemap from './sitemap';

afterEach(() => api.apiClient.mockReset());

const vendor = { id: 'v1', updatedAt: '2026-11-01T00:00:00.000Z' };
const product = { id: 'p1', updatedAt: '2026-11-02T00:00:00.000Z' };

function serve({ vendors, products }: { vendors?: unknown[]; products?: unknown[] }) {
  api.apiClient.mockImplementation(async (p: string) => {
    const list = p.startsWith('/vendors') ? vendors : products;
    if (!list) throw new ApiError(503, 'Service indisponible');
    return p.includes('page=1&') ? list : [];
  });
}

const urls = (entries: Awaited<ReturnType<typeof sitemap>>) => entries.map((e) => e.url);

describe('sitemap', () => {
  it('déclare les fiches vendeur et produit du catalogue public', async () => {
    serve({ vendors: [vendor], products: [product] });
    const out = urls(await sitemap());
    expect(out.some((u) => u.endsWith('/restaurants/v1'))).toBe(true);
    expect(out.some((u) => u.endsWith('/produits/p1'))).toBe(true);
  });

  it('produits en panne : les fiches vendeur restent', async () => {
    serve({ vendors: [vendor] });
    const out = urls(await sitemap());
    expect(out.some((u) => u.endsWith('/restaurants/v1'))).toBe(true);
    expect(out.some((u) => u.includes('/produits/'))).toBe(false);
  });

  it('vendeurs en panne : seulement les pages statiques', async () => {
    serve({ products: [product] });
    const out = urls(await sitemap());
    expect(out.some((u) => u.includes('/restaurants/'))).toBe(false);
    expect(out.some((u) => u.endsWith('/support'))).toBe(true);
  });

  it('n’est jamais calculé au build : le backend peut dormir pendant un déploiement', async () => {
    // Sans `connection()`, Next prérend le sitemap au build. Une lecture en
    // cache qui échoue y fait échouer le build, ou fige un sitemap sans fiches.
    serve({ vendors: [vendor], products: [product] });
    api.connection.mockClear();
    await sitemap();
    expect(api.connection).toHaveBeenCalled();
    expect(api.connection.mock.invocationCallOrder[0]).toBeLessThan(
      api.apiClient.mock.invocationCallOrder[0],
    );
  });

  it('parcourt toutes les pages, sous un seul délai par parcours', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, updatedAt: product.updatedAt }));
    api.apiClient.mockImplementation(async (p: string) => {
      if (p.startsWith('/vendors')) return p.includes('page=1&') ? [vendor] : [];
      return p.includes('page=1&') ? full : p.includes('page=2&') ? [product] : [];
    });
    const out = urls(await sitemap());
    expect(out.filter((u) => u.includes('/produits/'))).toHaveLength(101);
    const productSignals = api.apiClient.mock.calls
      .filter(([p]) => String(p).startsWith('/products'))
      .map(([, options]) => options?.signal);
    expect(productSignals).toHaveLength(2);
    expect(new Set(productSignals).size).toBe(1);
  });

  it('réponse mal formée : lève (donc rien de mémorisé) et le trace', async () => {
    // Un `[]` rendu sans lever serait mis en cache une heure pour tout le
    // monde : un sitemap sans aucune fiche, sans la moindre erreur.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.apiClient.mockImplementation(async (p: string) =>
      p.startsWith('/vendors') ? { data: [vendor], summary: {} } : [product],
    );
    const out = urls(await sitemap());
    expect(out.some((u) => u.includes('/restaurants/'))).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sitemap'));
    warn.mockRestore();
  });

  it('borne l’attente du backend', async () => {
    serve({ vendors: [vendor], products: [product] });
    await sitemap();
    for (const [, options] of api.apiClient.mock.calls) {
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
