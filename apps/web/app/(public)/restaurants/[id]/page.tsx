import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiClient } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantHero } from '@/components/restaurants/restaurant-hero';
import { RestaurantMenu } from '@/components/restaurants/restaurant-menu';
import { VendorInfoSection } from '@/components/restaurants/vendor-info-section';
import { RestaurantReviews } from '@/components/restaurants/restaurant-reviews';
import { ProductCardSkeleton } from '@/components/ui/skeleton';
import { BreadcrumbJsonLd, VendorJsonLd } from '@/components/seo/json-ld';
import { SITE_URL } from '@/lib/site';

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
  // Une fiche introuvable ne doit surtout pas être indexée : sans `noindex`,
  // un vendeur retiré du catalogue laisse une page vide dans l'index.
  if (!restaurant) {
    return { title: 'Vendeur introuvable', robots: { index: false, follow: false } };
  }

  const description = restaurant.adresse
    ? `Commander chez ${restaurant.nom} à Brazzaville — ${restaurant.adresse}. Livraison et paiement Mobile Money avec Lilia Food.`
    : `Commander chez ${restaurant.nom} à Brazzaville. Livraison et paiement Mobile Money avec Lilia Food.`;

  return {
    title: restaurant.nom,
    description,
    alternates: { canonical: `/restaurants/${id}` },
    openGraph: {
      title: `${restaurant.nom} — Lilia Food`,
      description,
      url: `${SITE_URL}/restaurants/${id}`,
      type: 'website',
      // La photo du vendeur fait une bien meilleure vignette de partage que
      // l'image générique du site.
      ...(restaurant.imageUrl ? { images: [{ url: restaurant.imageUrl }] } : {}),
    },
  };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);

  if (!restaurant) notFound();

  return (
    <div className="min-h-screen bg-cream-100">
      <VendorJsonLd
        id={restaurant.id}
        nom={restaurant.nom}
        adresse={restaurant.adresse}
        imageUrl={restaurant.imageUrl}
        specialties={restaurant.specialties?.map((s) => s.name)}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: 'Vendeurs', path: '/restaurants' },
          { name: restaurant.nom, path: `/restaurants/${restaurant.id}` },
        ]}
      />
      {/* Hero statique */}
      <RestaurantHero restaurant={restaurant} />

      {/* Menu dynamique */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <VendorInfoSection restaurant={restaurant} />
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
