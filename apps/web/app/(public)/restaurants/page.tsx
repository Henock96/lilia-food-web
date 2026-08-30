import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantsFilters } from '@/components/restaurants/restaurants-filters';
import { RestaurantCardSkeleton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Vendeurs à Brazzaville',
  description:
    'Découvrez tous les restaurants, cuisines maison, boulangeries et boutiques de boissons disponibles à Brazzaville. Commandez et faites-vous livrer.',
  alternates: { canonical: '/restaurants' },
};

/**
 * LIL-119 : on consomme le marketplace `/vendors`. Le backend filtre déjà
 * `adminApproved=true AND isActive=true`. Filtrage par `vendorType` client-side
 * via les chips (cf. RestaurantsFilters).
 *
 * `'use cache'` + `cacheTag('vendors')` : le backend est un service Render
 * qui s'endort (cold start de 30-60s) et `apiClientRaw` n'a pas de timeout —
 * chaque visite ne doit donc PAS déclencher un aller-retour réseau. Le succès
 * est mis en cache normalement ; un throw levé à l'intérieur d'une fonction
 * `'use cache'` n'est en revanche jamais persisté par le cache handler, donc
 * un échec réseau reste un échec à la prochaine requête sans action
 * supplémentaire. Le bouton « Réessayer » (VendorGrid) appelle en plus
 * `retryVendors()` (Server Action, `revalidateTag('vendors')`) avant de
 * rafraîchir, pour ne pas dépendre uniquement de cette hypothèse de
 * non-mise-en-cache des erreurs — voir `lib/actions/vendors.ts`.
 */
async function fetchVendors(): Promise<Restaurant[]> {
  'use cache';
  cacheTag('vendors');
  // Borne la fraîcheur : sans `cacheLife`, l'entrée ne dépendait que d'une
  // invalidation explicite, et un vendeur qui ouvrait pouvait rester affiché
  // fermé pendant des jours.
  cacheLife('minutes');
  const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=50');
  return res.data ?? [];
}

/**
 * Wrapper non caché : distingue un échec réseau (`failed: true`) d'un
 * catalogue réellement vide. Cette distinction vit délibérément en dehors de
 * la frontière `'use cache'` de `fetchVendors` — sans quoi un échec risquerait
 * d'être normalisé en `{ vendors: [], failed: true }` *avant* la mise en
 * cache, ce qui le rendrait, lui, mémoïsable.
 */
async function getVendors(): Promise<{ vendors: Restaurant[]; failed: boolean }> {
  try {
    const vendors = await fetchVendors();
    return { vendors, failed: false };
  } catch {
    return { vendors: [], failed: true };
  }
}

/**
 * Décrit le catalogue sans le travestir.
 *
 * L'ancienne formulation annonçait « N vendeurs ouverts » en se contentant de
 * compter les vendeurs *listés* : la page affichait donc « 1 vendeur ouvert »
 * au-dessus d'une carte portant le badge « Fermé ». On distingue désormais le
 * nombre de vendeurs référencés de ceux réellement ouverts à l'instant T.
 */
function vendorCountLabel(restaurants: Restaurant[]): string {
  const total = restaurants.length;
  const open = restaurants.filter((r) => r.isOpen).length;
  const plural = total > 1 ? 's' : '';

  if (total === 0) return 'Aucun vendeur pour le moment';
  if (open === 0) return `${total} vendeur${plural} · aucun ouvert en ce moment`;
  if (open === total) return `${total} vendeur${plural} ouvert${plural}`;
  return `${total} vendeur${plural} · ${open} ouvert${open > 1 ? 's' : ''} en ce moment`;
}

function FiltersFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default async function RestaurantsPage() {
  const { vendors: restaurants, failed } = await getVendors();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Tous les vendeurs</h1>
      <p className="mt-2 text-sm text-ink-500">
        {failed ? (
          'Restaurants, cuisines maison, boulangeries & boissons.'
        ) : (
          <>
            {vendorCountLabel(restaurants)} · restaurants, cuisines maison, boulangeries &
            boissons
          </>
        )}
      </p>

      <div className="mt-8">
        <Suspense fallback={<FiltersFallback />}>
          <RestaurantsFilters restaurants={restaurants} failed={failed} />
        </Suspense>
      </div>
    </div>
  );
}
