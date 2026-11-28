import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { RestaurantCardSkeleton } from '@/components/ui';
import { VendorGrid, VENDOR_GRID_CLASSNAME } from '@/components/restaurants/vendor-grid';
import { VendorsLoadError } from '@/components/restaurants/vendors-load-error';
import { getVendorFacets, getVendorPage } from '@/lib/vendors';
import {
  SHOWCASE_BATCH,
  VENDOR_TYPE_PLURAL,
  availableTypeFilters,
  parseCatalogueParams,
  parseShowcaseCount,
  showcaseView,
  vendorCountLabel,
} from '@/lib/vendor-catalog';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Section vendeurs de l'accueil.
 *
 * ## Avant
 *
 * `SLOTS = 4` (les quatre colonnes de la grille) partait au serveur en
 * `?limit=4`. Neuf vendeurs publiés, quatre visibles, `meta.total` jeté, et des
 * emplacements « Prochain vendeur ici » pour compléter la rangée : rien ne
 * laissait deviner qu'il en manquait cinq.
 *
 * ## Maintenant
 *
 * Un **lot** de 12 dans l'ordre serveur (ouverts d'abord), indépendant du
 * nombre de colonnes. S'il en reste, « Afficher plus » demande le lot suivant
 * (`?vendeurs=24`, rendu serveur : partageable, fonctionne sans JavaScript,
 * le retour arrière retrouve la même liste). Au-delà de 96, l'accueil cesse de
 * grandir et le lien « Voir les N vendeurs » — N = `meta.total` du serveur —
 * mène au catalogue paginé et filtrable.
 */
export function FeaturedRestaurants({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <section
      id="vendeurs"
      aria-labelledby="vendeurs-titre"
      className="scroll-mt-20 bg-[#faf7f2] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="vendeurs-titre"
          className="font-display text-ink-900 text-2xl font-extrabold sm:text-3xl"
        >
          Commande chez eux aujourd&apos;hui
        </h2>
        <Suspense fallback={<ShowcaseFallback />}>
          <Showcase searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Showcase({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requested = parseShowcaseCount(params.vendeurs);
  const { vendorType } = parseCatalogueParams(params);
  const [result, facets] = await Promise.all([
    getVendorPage({ page: 1, limit: requested, vendorType }),
    getVendorFacets(),
  ]);
  const filters = facets.status === 'ok' ? availableTypeFilters(facets.value) : [];
  if (vendorType && !filters.some((filter) => filter.type === vendorType)) {
    filters.push({ type: vendorType, label: VENDOR_TYPE_PLURAL[vendorType], count: 0 });
  }

  if (result.status === 'error') {
    return (
      <>
        <p className="text-ink-500 mt-2 text-sm">Choisis une boutique et découvre sa carte.</p>
        <VendorsLoadError className="mt-8" />
      </>
    );
  }

  const { vendors, meta } = result.value;
  const open = vendors.filter((v) => v.isOpen).length;
  const view = showcaseView(vendors.length, meta.total, requested);

  const catalogue = vendorType ? `/restaurants?vendorType=${vendorType}` : '/restaurants';

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="text-ink-500 text-sm" aria-live="polite">
          {vendors.length >= meta.total
            ? vendorCountLabel(meta.total, open)
            : `${meta.total} vendeurs à Brazzaville · les ouverts en premier`}
        </p>
        {filters.length > 0 && (
          <nav aria-label="Univers des vendeurs" className="flex flex-wrap gap-2">
            {[{ type: null, label: 'Tous' }, ...filters].map(({ type, label }) => (
              <Link
                key={type ?? 'all'}
                href={type ? `/?vendorType=${type}#vendeurs` : '/#vendeurs'}
                aria-current={type === vendorType ? 'true' : undefined}
                className={
                  type === vendorType
                    ? 'rounded-pill bg-tomato-600 inline-flex min-h-11 items-center px-4 text-sm font-semibold text-white'
                    : 'rounded-pill border-ink-100 text-ink-700 hover:border-tomato-600 hover:text-tomato-700 inline-flex min-h-11 items-center border bg-white px-4 text-sm font-semibold'
                }
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {meta.total === 0 ? (
        <div className="border-ink-100 mt-6 rounded-xl border bg-white p-6">
          <p className="text-ink-900 font-semibold">
            {vendorType
              ? 'Aucun vendeur dans cet univers.'
              : 'Aucun vendeur disponible pour le moment.'}
          </p>
          {!vendorType && (
            <Link
              href="/devenir-vendeur"
              className="text-tomato-700 mt-2 inline-flex min-h-11 items-center font-semibold hover:underline"
            >
              Tu cuisines ? Rejoins Lilia Food.
            </Link>
          )}
        </div>
      ) : (
        <VendorGrid vendors={vendors} className="mt-6" />
      )}

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
        {view.canShowMore && (
          <Link
            href={`/?vendeurs=${view.nextCount}${vendorType ? `&vendorType=${vendorType}` : ''}#vendeurs`}
            scroll={false}
            className="rounded-pill bg-tomato-600 hover:bg-tomato-700 inline-flex min-h-11 items-center justify-center gap-2 px-6 text-sm font-semibold text-white transition-colors"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Afficher plus
          </Link>
        )}
        {(view.showCatalogueLink || meta.total > 0) && (
          <Link
            href={catalogue}
            className="group rounded-pill border-cream-300 text-ink-700 hover:border-tomato-600 hover:text-tomato-700 inline-flex min-h-11 items-center justify-center gap-2 border-[1.5px] bg-white px-6 text-sm font-semibold transition-colors"
          >
            {meta.total > 1 ? `Voir les ${meta.total} vendeurs` : 'Voir le catalogue'}
          </Link>
        )}
      </div>
    </>
  );
}

/** Hauteur réservée pour un premier lot : pas de décalage à l'arrivée des cartes. */
function ShowcaseFallback() {
  return (
    <>
      <p className="text-ink-500 mt-2 text-sm">Choisis une boutique et découvre sa carte.</p>
      <div className={`mt-6 ${VENDOR_GRID_CLASSNAME}`} aria-hidden>
        {Array.from({ length: Math.min(SHOWCASE_BATCH, 8) }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
