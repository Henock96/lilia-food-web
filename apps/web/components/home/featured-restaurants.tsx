import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { VendorGrid } from '@/components/restaurants/vendor-grid';

/**
 * Section « Les plus courus » — vendeurs en vedette. Consomme le marketplace
 * `/vendors` (déjà filtré adminApproved + isActive côté backend, LIL-119).
 */
async function getVendors(): Promise<Restaurant[]> {
  'use cache';
  try {
    const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=12');
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function FeaturedRestaurants() {
  const restaurants = await getVendors();
  const featured = restaurants.slice(0, 6);

  return (
    <section className="grain noir-canvas relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
              <span className="h-px w-6 bg-[var(--ember-400)]/60" aria-hidden />
              Les plus courus
            </span>
            <h2
              className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Ils font saliver{' '}
              <span className="text-ember italic">tout Brazza.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
              {restaurants.length > 0
                ? `${restaurants.length} vendeurs ouverts en ce moment, prêts à te livrer.`
                : 'Les meilleurs vendeurs de la ville, sélectionnés pour toi.'}
            </p>
          </div>

          <Link
            href="/restaurants"
            className="group hidden shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[var(--ember-400)]/50 hover:text-white sm:inline-flex"
          >
            Voir tout
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-12">
          <VendorGrid restaurants={featured} />
        </div>

        <div className="mt-10 text-center sm:hidden">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--ember-500)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ember-400)]"
          >
            Voir tous les restaurants
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
