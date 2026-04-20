import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantGrid } from '@/components/restaurants/restaurant-grid';

async function getRestaurants(): Promise<Restaurant[]> {
  'use cache';
  try {
    return await apiClient<Restaurant[]>('/restaurants');
  } catch {
    return [];
  }
}

export async function FeaturedRestaurants() {
  const restaurants = await getRestaurants();
  const featured = restaurants.slice(0, 6);

  return (
    <section className="py-16 bg-zinc-50/50 dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Restaurants populaires
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">{restaurants.length} restaurants à Brazzaville</p>
          </div>
          <Link
            href="/restaurants"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <RestaurantGrid restaurants={featured} />

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-2xl hover:bg-primary-600 transition-colors"
          >
            Voir tous les restaurants
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
