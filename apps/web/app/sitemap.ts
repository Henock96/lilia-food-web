import type { MetadataRoute } from 'next';
import { apiClient } from '@lilia/api-client';
import type { Product, Restaurant } from '@lilia/types';
import { SITE_URL as BASE_URL } from '@/lib/site';
import { SERVER_MAX_LIMIT } from '@/lib/vendor-catalog';

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

    // Les fiches produits sont les pages les plus recherchées d'un site de
    // livraison : on cherche « poulet braisé Brazzaville », pas le nom d'un
    // vendeur qu'on ne connaît pas encore. Elles sont déclarées avec une
    // priorité inférieure à celle des vendeurs, qui restent les pages
    // d'entrée du catalogue.
    //
    // ⚠️ Leur absence est **tolérée** : elles vivent dans leur propre `try`.
    // Un échec de `/products` ne doit pas coûter au sitemap ses fiches
    // vendeurs, qui viennent d'être lues avec succès.
    const productRoutes = await fetchProductRoutes();

    return [...staticRoutes, ...restaurantRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}

async function fetchProductRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const products = await fetchAllProducts();
    return products.map((p) => ({
      url: `${BASE_URL}/produits/${p.id}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {
    return [];
  }
}

/** Nombre maximum de pages parcourues — garde-fou contre une boucle infinie. */
const MAX_SITEMAP_PAGES = 50;
/**
 * Borne serveur commune (`PaginationQueryDto`, `MAX_PAGE_SIZE = 100`) : la
 * limite propre à `/vendors` (50) a été alignée côté backend. Une valeur
 * au-delà ferait échouer le premier appel en 400, et le `catch` rendrait un
 * sitemap sans aucune fiche — sans le moindre signal d'erreur.
 */
const PAGE_SIZE = SERVER_MAX_LIMIT;

/**
 * Catalogue produit public, page par page.
 *
 * `GET /products` n'expose que les vendeurs approuvés et actifs : le sitemap
 * décrit donc exactement ce que le catalogue public montre, ce qui est la seule
 * règle qui compte ici — soumettre à Google une fiche absente du catalogue
 * produit une page d'erreur dans l'index.
 */
async function fetchAllProducts(): Promise<Product[]> {
  const all: Product[] = [];

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const batch = await apiClient<Product[]>(
      `/products?page=${page}&limit=${PAGE_SIZE}`,
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

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
