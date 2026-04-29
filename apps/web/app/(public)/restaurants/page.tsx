import { Suspense } from 'react';
import type { Metadata } from 'next';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantGrid } from '@/components/restaurants/restaurant-grid';
import { RestaurantsFilters } from '@/components/restaurants/restaurants-filters';
import { RestaurantCardSkeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Restaurants',
  description: 'Découvrez tous les restaurants disponibles à Brazzaville pour la livraison.',
};

async function getRestaurants(): Promise<Restaurant[]> {
  'use cache';
  try {
    return await apiClient<Restaurant[]>('/restaurants');
  } catch {
    return [];
  }
}

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-dark-bg pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Restaurants
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">{restaurants.length} restaurants disponibles à Brazzaville</p>
        </div>

        {/* Filters + Grid */}
        <Suspense fallback={<RestaurantCardSkeleton />}>
          <RestaurantsFilters restaurants={restaurants} />
        </Suspense>
      </div>
    </div>
  );
}
