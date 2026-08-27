import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Banner } from '@lilia/types';

// Mock server-only avant d'importer le module
vi.mock('server-only', () => ({}));

// Mock apiClientRaw
const mockApi = vi.fn();
vi.mock('@lilia/api-client', () => ({
  apiClientRaw: (...args: unknown[]) => mockApi(...args),
}));

import { fetchBanners } from './hero-slides';

function banner(over: Partial<Banner> = {}): Banner {
  return {
    id: 'b1',
    title: 'Promo Grillades',
    imageUrl: 'https://res.cloudinary.com/x/grillades.jpg',
    description: 'Découvrez nos grillades du weekend',
    linkUrl: '/restaurants/grillades',
    isActive: true,
    displayOrder: 0,
    restaurantId: 'r1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchBanners', () => {
  it('retourne un tableau vide quand l\'API échoue', async () => {
    mockApi.mockRejectedValueOnce(new Error('Network'));
    expect(await fetchBanners()).toEqual([]);
  });

  it('retourne un tableau vide quand aucun banner', async () => {
    mockApi.mockResolvedValueOnce({ data: [] });
    expect(await fetchBanners()).toEqual([]);
  });

  it('exclut les bannières inactives', async () => {
    mockApi.mockResolvedValueOnce({
      data: [
        banner({ id: 'a', isActive: true }),
        banner({ id: 'b', isActive: false }),
      ],
    });
    const out = await fetchBanners();
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('a');
  });

  it('mappe correctement les champs du banner', async () => {
    mockApi.mockResolvedValueOnce({ data: [banner()] });
    const out = await fetchBanners();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({
      id: 'b1',
      title: 'Promo Grillades',
      imageUrl: 'https://res.cloudinary.com/x/grillades.jpg',
      description: 'Découvrez nos grillades du weekend',
      linkUrl: '/restaurants/grillades',
      displayOrder: 0,
    });
  });

  it('utilise des fallbacks quand title/linkUrl/description sont null', async () => {
    mockApi.mockResolvedValueOnce({
      data: [banner({ title: null, linkUrl: null, description: null })],
    });
    const out = await fetchBanners();
    expect(out[0].title).toBe('Lilia Food');
    expect(out[0].linkUrl).toBe('/restaurants');
    expect(out[0].description).toBe('');
  });

  it('trie par displayOrder et limite à 5', async () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      banner({ id: `b${i}`, displayOrder: 7 - i }),
    );
    mockApi.mockResolvedValueOnce({ data: many });
    const out = await fetchBanners();
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.displayOrder)).toEqual([0, 1, 2, 3, 4]);
  });
});
