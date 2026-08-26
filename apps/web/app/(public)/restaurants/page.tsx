import { Suspense } from 'react';
import type { Metadata } from 'next';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantsFilters } from '@/components/restaurants/restaurants-filters';
import { RestaurantCardSkeleton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Vendeurs',
  description:
    'Découvrez tous les restaurants, cuisines maison, boulangeries et boutiques de boissons disponibles à Brazzaville.',
};

/**
 * LIL-119 : on consomme le marketplace `/vendors`. Le backend filtre déjà
 * `adminApproved=true AND isActive=true`. Filtrage par `vendorType` client-side
 * via les chips (cf. RestaurantsFilters).
 *
 * Volontairement sans `'use cache'` : cette fonction n'a qu'un seul appelant
 * (cette page), donc aucun dédoublonnage inter-appel à en tirer — contrairement
 * à `lib/vendors.ts`, partagé par la home. En échange, un échec réseau reste un
 * échec à *chaque* tentative plutôt que de figer un résultat vide en cache :
 * condition nécessaire pour que le bouton « Réessayer » (RestaurantsFilters →
 * VendorGrid, via `router.refresh()`) relance une vraie requête réseau.
 */
async function getVendors(): Promise<{ vendors: Restaurant[]; failed: boolean }> {
  try {
    const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=50');
    return { vendors: res.data ?? [], failed: false };
  } catch {
    return { vendors: [], failed: true };
  }
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-cream-200" />
      <div className="mt-3 h-4 w-80 animate-pulse rounded-lg bg-cream-200" />
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Chargée dans un unique `<Suspense>` (header + filtres) : le compteur du
 * sous-titre dépend des mêmes données que la grille, pas la peine de deux
 * frontières de streaming distinctes pour une seule requête.
 */
async function RestaurantsContent() {
  const { vendors: restaurants, failed } = await getVendors();

  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 pb-20 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Tous les vendeurs</h1>
      <p className="mt-2 text-sm text-ink-500">
        {restaurants.length} vendeur{restaurants.length > 1 ? 's' : ''} ouvert
        {restaurants.length > 1 ? 's' : ''} · restaurants, cuisines maison, boulangeries & boissons
      </p>

      <div className="mt-8">
        <RestaurantsFilters restaurants={restaurants} failed={failed} />
      </div>
    </div>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RestaurantsContent />
    </Suspense>
  );
}
