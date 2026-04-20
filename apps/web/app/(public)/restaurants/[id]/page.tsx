import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantHero } from '@/components/restaurants/restaurant-hero';
import { RestaurantMenu } from '@/components/restaurants/restaurant-menu';
import { RestaurantReviews } from '@/components/restaurants/restaurant-reviews';
import { ProductCardSkeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getRestaurant(id: string): Promise<Restaurant | null> {
  'use cache';
  try {
    return await apiClient<Restaurant>(`/restaurants/${id}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) return { title: 'Restaurant introuvable' };
  return {
    title: restaurant.nom,
    description: `Commander chez ${restaurant.nom} — ${restaurant.adresse}`,
  };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);

  if (!restaurant) notFound();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-dark-bg pt-16">
      {/* Hero statique */}
      <RestaurantHero restaurant={restaurant} />

      {/* Menu dynamique */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Suspense
              fallback={
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              }
            >
              <RestaurantMenu restaurant={restaurant} />
            </Suspense>
          </div>

          <div className="lg:col-span-1">
            <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
              <RestaurantReviews restaurantId={restaurant.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
