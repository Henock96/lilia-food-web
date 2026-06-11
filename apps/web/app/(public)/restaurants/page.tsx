import { Suspense } from 'react';
import type { Metadata } from 'next';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { RestaurantsFilters } from '@/components/restaurants/restaurants-filters';

export const metadata: Metadata = {
  title: 'Vendeurs',
  description:
    'Découvrez tous les restaurants, cuisines maison, boulangeries et boutiques de boissons disponibles à Brazzaville.',
};

/**
 * LIL-119 : on consomme le marketplace `/vendors`. Le backend filtre déjà
 * `adminApproved=true AND isActive=true`. Filtrage par `vendorType` client-side
 * via les chips (cf. RestaurantsFilters).
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

function FiltersFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 rounded-[1.5rem] border border-white/8 bg-white/[0.03]" />
      ))}
    </div>
  );
}

export default async function RestaurantsPage() {
  const restaurants = await getVendors();

  return (
    <div className="grain noir-canvas min-h-screen">
      {/* En-tête immersif */}
      <div className="relative overflow-hidden pt-28 pb-10">
        <div aria-hidden className="ember-glow absolute -right-20 top-0 h-80 w-80 opacity-60" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
            <span className="h-px w-6 bg-[var(--ember-400)]/60" aria-hidden />
            La marketplace
          </span>
          <h1
            className="mt-3 text-4xl font-bold leading-tight text-white sm:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Tous les vendeurs <span className="text-ember italic">de Brazza.</span>
          </h1>
          <p className="mt-3 text-white/55">
            {restaurants.length} vendeur{restaurants.length > 1 ? 's' : ''} ouvert
            {restaurants.length > 1 ? 's' : ''} · restaurants, cuisines maison, boulangeries & boissons
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <Suspense fallback={<FiltersFallback />}>
          <RestaurantsFilters restaurants={restaurants} />
        </Suspense>
      </div>
    </div>
  );
}
