import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { RestaurantCardSkeleton } from '@/components/ui';
import { VendorGrid, VENDOR_GRID_CLASSNAME } from '@/components/restaurants/vendor-grid';
import { VendorsLoadError } from '@/components/restaurants/vendors-load-error';
import { getVendorPage } from '@/lib/vendors';
import {
  SHOWCASE_BATCH,
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
    <section id="vendeurs" aria-labelledby="vendeurs-titre" className="scroll-mt-20 py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="vendeurs-titre"
          className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
        >
          Ils font saliver tout Brazza
        </h2>
        <Suspense fallback={<ShowcaseFallback />}>
          <Showcase searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Showcase({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const requested = parseShowcaseCount((await searchParams).vendeurs);
  const result = await getVendorPage({ page: 1, limit: requested });

  if (result.status === 'error') {
    return (
      <>
        <p className="mt-2 text-sm text-ink-500">Les vendeurs de Brazzaville, en direct.</p>
        <VendorsLoadError className="mt-8" />
      </>
    );
  }

  const { vendors, meta } = result.value;
  const open = vendors.filter((v) => v.isOpen).length;
  const view = showcaseView(vendors.length, meta.total, requested);

  if (meta.total === 0) {
    return (
      <div className="mt-8 rounded-xl border border-cream-300 bg-white p-6">
        <p className="font-semibold text-ink-900">Aucun vendeur disponible pour le moment.</p>
        <p className="mt-1 text-sm text-ink-500">
          Les premières boutiques arrivent bientôt.{' '}
          <Link href="/devenir-vendeur" className="font-semibold text-tomato-700 underline-offset-2 hover:underline">
            Tu cuisines ? Rejoins Lilia Food.
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Le serveur classe les ouverts en tête : quand tout le catalogue tient
          dans le lot, compter les ouverts du lot compte ceux du catalogue. */}
      <p className="mt-2 text-sm text-ink-500" aria-live="polite">
        {vendors.length >= meta.total
          ? vendorCountLabel(meta.total, open)
          : `${meta.total} vendeurs à Brazzaville · les ouverts en premier`}
      </p>

      <VendorGrid vendors={vendors} className="mt-6" />

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {view.canShowMore && (
          <Link
            href={`/?vendeurs=${view.nextCount}`}
            scroll={false}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill bg-tomato-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-tomato-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Afficher plus
          </Link>
        )}
        {view.showCatalogueLink && (
          <Link
            href="/restaurants"
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border-[1.5px] border-cream-300 bg-white px-6 text-sm font-semibold text-ink-700 transition-colors hover:border-tomato-600 hover:text-tomato-700"
          >
            {meta.total > 1 ? `Voir les ${meta.total} vendeurs` : 'Voir le catalogue'}
            <ArrowRight
              className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
              aria-hidden
            />
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
      <p className="mt-2 text-sm text-ink-500">Les vendeurs de Brazzaville, en direct.</p>
      <div className={`mt-6 ${VENDOR_GRID_CLASSNAME}`} aria-hidden>
        {Array.from({ length: Math.min(SHOWCASE_BATCH, 8) }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
