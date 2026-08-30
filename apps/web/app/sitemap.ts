import type { MetadataRoute } from 'next';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { SITE_URL as BASE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `/connexion` et `/inscription` ont été retirés : ce sont des formulaires
  // sans valeur en recherche, désormais en `noindex`, et les déclarer ici
  // envoyait à Google un signal contradictoire. Les pages de contenu réel
  // (support, mentions légales) les remplacent.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/restaurants`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/devenir-vendeur`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/support`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/conditions`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  try {
    // Le sitemap doit lister exactement ce que le catalogue public expose, ni
    // plus ni moins. Il interrogeait `/restaurants` alors que la page
    // `/restaurants` consomme `/vendors` (filtré `adminApproved + isActive`) :
    // deux sources différentes, donc un risque de soumettre à Google des
    // fiches absentes du catalogue — ou d'en omettre. On lit désormais la même
    // source. Elle est paginée : on parcourt jusqu'à épuisement.
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
/**
 * 50 et pas davantage : `/vendors` rejette toute valeur supérieure avec un
 * 400 (« limit must not be greater than 50 »), contrairement à
 * `/restaurants` qui tolérait 100. Une valeur trop haute faisait échouer le
 * premier appel, et le `catch` renvoyait alors un sitemap sans aucune fiche
 * vendeur — sans le moindre signal d'erreur.
 */
const PAGE_SIZE = 50;

async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const all: Restaurant[] = [];

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const batch = await apiClient<Restaurant[]>(
      `/vendors?page=${page}&limit=${PAGE_SIZE}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}
