import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { VendorCard } from '@/components/restaurants/vendor-card';
import { getVendors } from '@/lib/vendors';

/**
 * Section « Les plus courus » — vendeurs en vedette. `getVendors()` est
 * partagée avec le hero de la home (`app/(public)/page.tsx`) : un seul
 * appel réseau à `/vendors`, mémoïsé par `'use cache'`.
 *
 * Le catalogue de production ne compte qu'un seul vendeur : une grille de 4
 * cases dont 3 resteraient blanches lirait comme un site cassé. On complète
 * donc toujours jusqu'à 4 emplacements, en pointillés au-delà des vendeurs
 * réels — un service qui démarre, pas un bug. On ne délègue plus à
 * `VendorGrid` ici : son propre état vide (« Aucun restaurant disponible »)
 * ferait doublon avec ces emplacements explicites.
 */
export async function FeaturedRestaurants() {
  const restaurants = await getVendors();
  const featured = restaurants.slice(0, 4);

  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Ils font saliver tout Brazza
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              {restaurants.length > 0
                ? `${restaurants.length} vendeur${restaurants.length > 1 ? 's' : ''} ouvert${
                    restaurants.length > 1 ? 's' : ''
                  } en ce moment, prêt${restaurants.length > 1 ? 's' : ''} à te livrer.`
                : 'Les meilleurs vendeurs de la ville, sélectionnés pour toi.'}
            </p>
          </div>

          <Link
            href="/restaurants"
            className="group hidden shrink-0 items-center gap-2 rounded-pill border-[1.5px] border-cream-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-tomato-500 hover:text-tomato-700 sm:inline-flex"
          >
            Voir tout
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((r) => (
            <VendorCard key={r.id} restaurant={r} />
          ))}
          {Array.from({ length: Math.max(0, 4 - featured.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              aria-hidden
              className="grid min-h-[10.5rem] place-items-center rounded-xl border-[1.5px] border-dashed border-cream-300 bg-cream-200 text-[11.5px] text-ink-500"
            >
              {i === 0 ? 'Prochain vendeur ici' : ''}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 rounded-pill bg-tomato-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-tomato-700"
          >
            Voir tous les vendeurs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
