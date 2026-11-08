import { afterEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ apiClientRaw: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@lilia/api-client', async (original) => ({
  ...(await original<typeof import('@lilia/api-client')>()),
  apiClientRaw: api.apiClientRaw,
}));

import { getVendorFacets, getVendorPage } from './vendors';

afterEach(() => {
  api.apiClientRaw.mockReset();
  vi.restoreAllMocks();
});

describe('lectures du catalogue vendeurs', () => {
  it('borne l’attente du backend', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.apiClientRaw.mockRejectedValue(new TypeError('fetch failed'));
    await getVendorPage({ page: 1, limit: 20 });
    expect(api.apiClientRaw.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('page en panne : état d’erreur, et tracé', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.apiClientRaw.mockRejectedValue(new DOMException('aborted due to timeout', 'TimeoutError'));
    expect(await getVendorPage({ page: 1, limit: 20 })).toEqual({ status: 'error' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('TimeoutError'));
  });

  it('facettes en panne : état d’erreur, et tracé', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.apiClientRaw.mockRejectedValue(new TypeError('fetch failed'));
    expect(await getVendorFacets()).toEqual({ status: 'error' });
    expect(warn).toHaveBeenCalled();
  });
});
