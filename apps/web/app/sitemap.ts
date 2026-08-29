import type { MetadataRoute } from 'next';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { SITE_URL as BASE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/restaurants`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/connexion`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/inscription`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  try {
    // `GET /restaurants` est paginé depuis l'audit du 28/08/2026 (il servait
    // tout le catalogue avec spécialités, horaires et galeries — plusieurs Mo
    // par appel). Le sitemap, lui, doit lister TOUS les vendeurs : on parcourt
    // donc les pages jusqu'à épuisement.
    const restaurants = await fetchAllRestaurants();
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

/** Nombre maximum de pages parcourues — garde-fou contre une boucle infinie. */
const MAX_SITEMAP_PAGES = 50;
const PAGE_SIZE = 100;

async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const all: Restaurant[] = [];

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const batch = await apiClient<Restaurant[]>(
      `/restaurants?page=${page}&limit=${PAGE_SIZE}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}
