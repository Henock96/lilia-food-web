import { cacheLife, cacheTag } from 'next/cache';
import { apiClient, apiClientRaw, MAX_PAGE_SIZE } from '@lilia/api-client';
import type { Product, Restaurant } from '@lilia/types';

/**
 * **La carte d'un vendeur, telle que le site la lit.**
 *
 * ## `GET /vendors/:id`, et non plus `GET /restaurants/:id`
 *
 * Les deux routes répondaient à la même question et avaient divergé sur six
 * points (audit du 06/09/2026) : produits épuisés exclus d'un côté, aucun tri,
 * aucune borne, menus du jour absents de l'autre, note moyenne manquante,
 * compteurs de pagination absents. `/vendors/:id` est désormais la **source
 * canonique** — l'application Flutter la consommait déjà.
 *
 * `/restaurants/:id` reste servie et construit sa carte avec le **même**
 * `include` côté serveur : le panier du site et l'écran de réglages de
 * l'administration la lisent pour ses frais de livraison et ses horaires, pas
 * pour son catalogue.
 *
 * ## Le cache, et pourquoi il portait un `age` de plusieurs heures
 *
 * L'appel était enveloppé dans `'use cache'` **sans `cacheTag` ni
 * `cacheLife`** — alors que les deux fichiers voisins (`lib/vendors.ts`,
 * `app/(public)/restaurants/page.tsx`) avaient déjà été corrigés pour ce
 * défaut exact, commentaire à l'appui. Sans `cacheTag`, aucune action ne peut
 * invalider l'entrée ; sans `cacheLife`, elle suit le profil par défaut.
 * Résultat : un prix modifié dans l'administration pouvait rester faux sur le
 * site pendant des heures, et un plat épuisé rester commandable — le backend
 * refusant alors la commande au tout dernier moment, après le tunnel entier.
 *
 * Deux étiquettes, délibérément : `vendors` pour purger tout le catalogue,
 * `vendor-<id>` pour n'invalider qu'une boutique après une modification qui ne
 * concerne qu'elle.
 *
 * ⚠️ On ne retire pas `'use cache'` pour autant : c'est lui qui protège la page
 * du réveil du service Render, qui s'endort. La bonne réponse est de **borner**
 * la fraîcheur, pas de la supprimer.
 */
async function fetchVendorMenu(id: string): Promise<Restaurant> {
  'use cache';
  cacheTag('vendors');
  cacheTag(`vendor-${id}`);
  cacheLife('minutes');
  return apiClient<Restaurant>(`/vendors/${id}`);
}

/**
 * Pages supplémentaires du catalogue, quand la carte dépasse la borne serveur.
 *
 * `GET /products` applique **exactement** le même `where` et le même `orderBy`
 * que la carte (`vendor-menu-parity.spec.ts` l'exige côté backend) : la page 2
 * prolonge donc la page 1 sans doublon ni trou. Avec un tri différent, on
 * recevrait deux fois certains produits et jamais d'autres — une carte fausse,
 * sans erreur visible.
 *
 * Fait **côté serveur**, dans la frontière de cache : la page rend alors un
 * menu complet en HTML (donc indexable), et le surcoût n'est payé qu'au premier
 * visiteur après expiration. La quasi-totalité des vendeurs tient dans la
 * première réponse et ne déclenche aucun appel supplémentaire.
 */
async function fetchRemainingProducts(
  id: string,
  alreadyLoaded: number,
  total: number,
): Promise<Product[]> {
  'use cache';
  cacheTag('vendors');
  cacheTag(`vendor-${id}`);
  cacheLife('minutes');

  const rest: Product[] = [];
  // Plafond dur : une boucle « tant qu'il reste des pages » pilotée par une
  // réponse serveur est une boucle pilotée de l'extérieur.
  const MAX_PAGES = 20;
  const firstPage = Math.floor(alreadyLoaded / MAX_PAGE_SIZE) + 1;

  for (let i = 0; i < MAX_PAGES; i++) {
    const page = firstPage + i;
    const res = await apiClientRaw<{ data: Product[]; meta?: { totalPages?: number } }>(
      `/products?restaurantId=${id}&page=${page}&limit=${MAX_PAGE_SIZE}`,
    );
    rest.push(...(res.data ?? []));
    if (alreadyLoaded + rest.length >= total) break;
    if (page >= (res.meta?.totalPages ?? page)) break;
  }
  return rest;
}

/**
 * Carte complète d'un vendeur, ou `null` s'il est introuvable ou non publié.
 *
 * Le `try/catch` vit **hors** de la frontière `'use cache'` : une rejection
 * survenue à l'intérieur est observée par le prérendu lui-même, pas seulement
 * par l'`await` appelant — c'est ce qui faisait échouer la compilation quand le
 * backend Render sortait de veille (voir le commentaire jumeau dans
 * `lib/vendors.ts`). Normaliser l'échec en `null` *avant* la mise en cache le
 * rendrait par ailleurs mémoïsable, et un vendeur bien vivant resterait
 * introuvable jusqu'à expiration.
 */
export async function getVendorMenu(id: string): Promise<Restaurant | null> {
  let vendor: Restaurant;
  try {
    vendor = await fetchVendorMenu(id);
  } catch {
    return null;
  }

  const loaded = vendor.products?.length ?? 0;
  const total = vendor.totalProducts ?? loaded;

  if (!vendor.hasMoreProducts || loaded >= total) return vendor;

  try {
    const rest = await fetchRemainingProducts(id, loaded, total);
    return { ...vendor, products: [...(vendor.products ?? []), ...rest] };
  } catch {
    // Une carte partielle vaut mieux qu'une page d'erreur : le client voit ce
    // qui a été chargé, et `hasMoreProducts` reste vrai pour le dire.
    return vendor;
  }
}
