import type { MetadataRoute } from 'next';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';

const BASE_URL = 'https://lilia-food.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/restaurants`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/connexion`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/inscription`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    const restaurants = await apiClient<Restaurant[]>('/restaurants');
    const restaurantRoutes: MetadataRoute.Sitemap = restaurants.map((r) => ({
      url: `${BASE_URL}/restaurants/${r.id}`,
      lastModified: new Date(r.updatedAt),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...restaurantRoutes];
  } catch {
    return staticRoutes;
  }
}
