import { Suspense } from 'react';
import type { Metadata } from 'next';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantsFilters } from '@/components/restaurants/restaurants-filters';
import { RestaurantCardSkeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Vendeurs',
  description:
    'Découvrez tous les restaurants, cuisines maison, boulangeries et boutiques de boissons disponibles à Brazzaville.',
};

/**
 * LIL-119 : on consomme désormais le marketplace `/vendors` au lieu de
 * `/restaurants`. Le backend filtre déjà `adminApproved=true AND isActive=true`,
 * on récupère donc seulement les vendeurs publiables. Le filtrage par
 * `vendorType` est client-side via les chips (cf. RestaurantsFilters).
 */
async function getVendors(): Promise<Restaurant[]> {
  'use cache';
  try {
    const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=50');
    return res.data;
  } catch {
    return [];
  }
}

export default async function RestaurantsPage() {
  const restaurants = await getVendors();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-dark-bg pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Restaurants & vendeurs
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            {restaurants.length} vendeur{restaurants.length > 1 ? 's' : ''} disponible{restaurants.length > 1 ? 's' : ''} à Brazzaville
          </p>
        </div>

        {/* Filters + Grid */}
        <Suspense fallback={<RestaurantCardSkeleton />}>
          <RestaurantsFilters restaurants={restaurants} />
        </Suspense>
      </div>
    </div>
  );
}
