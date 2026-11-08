import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiClient: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@lilia/api-client', async (original) => ({
  ...(await original<typeof import('@lilia/api-client')>()),
  apiClient: api.apiClient,
}));

import { ApiError } from '@lilia/api-client';
import { getVendorReviews } from './vendor-reviews';

afterEach(() => api.apiClient.mockReset());

const stats = { averageRating: 4.5, totalReviews: 2 };
const reviews = [{ id: 'r1' }, { id: 'r2' }];

function serve(byPath: Record<string, unknown>) {
  api.apiClient.mockImplementation(async (p: string) => {
    if (p in byPath) return byPath[p];
    throw new ApiError(500, 'Erreur interne');
  });
}

describe('getVendorReviews', () => {
  it('note et avis du vendeur', async () => {
    serve({ '/reviews/restaurant/v1/stats': stats, '/reviews/restaurant/v1': reviews });
    expect(await getVendorReviews('v1')).toEqual({ stats, reviews });
  });

  it('déballe la liste quand le serveur la range sous `data`', async () => {
    serve({ '/reviews/restaurant/v1/stats': stats, '/reviews/restaurant/v1': { message: 'ok', data: reviews, stats } });
    expect((await getVendorReviews('v1')).reviews).toEqual(reviews);
  });

  it('panne : rien à afficher, sans faire échouer la fiche, mais tracée', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    serve({});
    expect(await getVendorReviews('v1')).toEqual({ stats: null, reviews: [] });
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('panne partielle : la moitié lue est gardée', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    serve({ '/reviews/restaurant/v1': reviews });
    expect(await getVendorReviews('v1')).toEqual({ stats: null, reviews });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('v1'));
    warn.mockRestore();
  });

  it('borne l’attente du backend', async () => {
    serve({ '/reviews/restaurant/v1/stats': stats, '/reviews/restaurant/v1': reviews });
    await getVendorReviews('v1');
    for (const [, options] of api.apiClient.mock.calls) {
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('une panne n’est jamais mémorisée : aucun `catch` dans les frontières de cache', () => {
    // La directive n'agit pas sous vitest. Un `catch` à l'intérieur ferait
    // mémoriser « 0 avis » pour tout le monde jusqu'à expiration ; dehors, la
    // rejection n'est pas persistée et la visite suivante relit le serveur.
    const source = readFileSync(path.join(__dirname, 'vendor-reviews.ts'), 'utf8');
    const boundaries = source.slice(
      source.indexOf("'use cache: remote';"),
      source.indexOf('export async function getVendorReviews'),
    );
    expect(boundaries.length).toBeGreaterThan(0);
    expect(boundaries).not.toMatch(/catch/);
  });
});
