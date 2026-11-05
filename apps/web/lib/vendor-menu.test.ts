import { readFileSync } from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiClient: vi.fn(), apiClientRaw: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@lilia/api-client', async (original) => ({
  ...(await original<typeof import('@lilia/api-client')>()),
  apiClient: api.apiClient,
  apiClientRaw: api.apiClientRaw,
}));

import { ApiError } from '@lilia/api-client';
import { getVendorMenu } from './vendor-menu';

afterEach(() => {
  api.apiClient.mockReset();
  api.apiClientRaw.mockReset();
});

describe('getVendorMenu', () => {
  it('vendeur servi : sa carte', async () => {
    const vendor = { id: 'v1', nom: 'Chez Lili', products: [{ id: 'p1' }] };
    api.apiClient.mockResolvedValue(vendor);
    expect(await getVendorMenu('v1')).toEqual({ kind: 'found', value: vendor });
  });

  it('404 du serveur : introuvable', async () => {
    api.apiClient.mockRejectedValue(new ApiError(404, 'Vendeur introuvable.'));
    expect(await getVendorMenu('v1')).toEqual({ kind: 'missing' });
  });

  it('404 : franchit la frontière de cache comme une valeur, jamais comme une erreur', async () => {
    // En production, l'erreur ressort de `'use cache'` sans son statut, ce que
    // ce test ne peut pas reproduire : la directive n'agit pas sous vitest. La
    // lecture du fichier garantit au moins que le 404 est traité dans la frontière.
    const source = readFileSync(path.join(__dirname, 'vendor-menu.ts'), 'utf8');
    const boundary = source.slice(source.indexOf("'use cache';"), source.indexOf('async function fetchRemainingProducts'));
    expect(boundary).toContain("readResultFromError(error).kind === 'missing'");
  });

  it('panne du serveur : indisponible, pas introuvable', async () => {
    api.apiClient.mockRejectedValue(new ApiError(503, 'Service indisponible'));
    expect(await getVendorMenu('v1')).toEqual({ kind: 'unavailable' });
  });

  it('réseau coupé : indisponible', async () => {
    api.apiClient.mockRejectedValue(new TypeError('fetch failed'));
    expect(await getVendorMenu('v1')).toEqual({ kind: 'unavailable' });
  });

  it('page suivante en échec : la carte partielle reste servie', async () => {
    const vendor = { id: 'v1', products: [{ id: 'p1' }], hasMoreProducts: true, totalProducts: 2 };
    api.apiClient.mockResolvedValue(vendor);
    api.apiClientRaw.mockRejectedValue(new ApiError(500, 'Erreur interne'));
    expect(await getVendorMenu('v1')).toEqual({ kind: 'found', value: vendor });
  });
});
