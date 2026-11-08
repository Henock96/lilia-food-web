import type { MetadataRoute } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { apiClient } from '@lilia/api-client';
import type { Product, Restaurant } from '@lilia/types';
import { reportServerReadFailure, serverReadSignal } from '@/lib/server-read';
import { SITE_URL as BASE_URL } from '@/lib/site';
import { SERVER_MAX_LIMIT } from '@/lib/vendor-catalog';

/**
 * Le sitemap relisait tout le catalogue à chaque requête : 6 à 9 s (PERF-08).
 * Les deux parcours sont désormais en cache partagé, `'hours'` : le sitemap
 * n'a pas à suivre l'ouverture des boutiques, seulement leur existence, et
 * l'étiquette `vendors` le purge quand le catalogue change.
 *
 * `await connection()` le garde hors du prérendu de build, comme
 * `lib/hero-slides.ts` : une lecture en cache qui échoue pendant le build y
 * ferait échouer le déploiement, ou figerait un sitemap sans aucune fiche.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
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
  } catch (error) {
    reportServerReadFailure('sitemap, fiches vendeur', error);
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
  } catch (error) {
    reportServerReadFailure('sitemap, fiches produit', error);
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
/**
 * Seuls `id` et `updatedAt` entrent dans le cache : le cache distant est
 * facturé par tranche de 8 Ko, et une page de 100 produits complets en pèse 198.
 */
type SitemapEntry = { id: string; updatedAt: string };

/**
 * Délai d'un parcours complet, toutes pages comprises. Plus large que celui
 * d'une page (`SERVER_READ_TIMEOUT_MS`) : 302 produits au 08/11/2026, soit
 * 4 pages à ~4 s chacune, et seul un robot attend ce sitemap.
 */
const SITEMAP_READ_TIMEOUT_MS = 30_000;

/**
 * Une page qui n'est pas un tableau est une réponse mal formée, pas une fin de
 * liste : elle **lève**. Retourner ce qui a été lu la ferait mettre en cache
 * une heure, pour tout le monde — un sitemap sans fiches, sans aucune erreur.
 */
function sitemapPage<T>(batch: T[] | unknown, path: string): T[] {
  if (!Array.isArray(batch)) throw new Error(`réponse mal formée pour ${path}`);
  return batch as T[];
}

async function fetchAllProducts(): Promise<SitemapEntry[]> {
  'use cache: remote';
  cacheTag('vendors');
  cacheLife('hours');
  const all: SitemapEntry[] = [];
  const signal = serverReadSignal(SITEMAP_READ_TIMEOUT_MS);

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const path = `/products?page=${page}&limit=${PAGE_SIZE}`;
    const batch = sitemapPage<Product>(await apiClient<Product[]>(path, { signal }), path);
    if (batch.length === 0) break;
    all.push(...batch.map(({ id, updatedAt }) => ({ id, updatedAt })));
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

async function fetchAllRestaurants(): Promise<SitemapEntry[]> {
  'use cache: remote';
  cacheTag('vendors');
  cacheLife('hours');
  const all: SitemapEntry[] = [];
  const signal = serverReadSignal(SITEMAP_READ_TIMEOUT_MS);

  for (let page = 1; page <= MAX_SITEMAP_PAGES; page++) {
    const path = `/vendors?page=${page}&limit=${PAGE_SIZE}`;
    const batch = sitemapPage<Restaurant>(await apiClient<Restaurant[]>(path, { signal }), path);
    if (batch.length === 0) break;
    all.push(...batch.map(({ id, updatedAt }) => ({ id, updatedAt })));
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}
