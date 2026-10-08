import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { RestaurantCardSkeleton } from '@/components/ui';
import { VendorGrid, VENDOR_GRID_CLASSNAME } from '@/components/restaurants/vendor-grid';
import { VendorsLoadError } from '@/components/restaurants/vendors-load-error';
import { CatalogueControls } from '@/components/restaurants/catalogue-controls';
import { CataloguePagination } from '@/components/restaurants/catalogue-pagination';
import { TrackEmptyFilter } from '@/components/restaurants/track-empty-filter';
import { getAllVendors, getVendorFacets, getVendorPage, type Loaded } from '@/lib/vendors';
import {
  CATALOGUE_PAGE_SIZE,
  VENDOR_TYPE_PLURAL,
  availableTypeFilters,
  catalogueHref,
  matchesVendorQuery,
  paginate,
  parseCatalogueParams,
  vendorCountLabel,
  type CatalogueParams,
} from '@/lib/vendor-catalog';
import type { Restaurant } from '@lilia/types';

export const metadata: Metadata = {
  title: 'Vendeurs à Brazzaville',
  description:
    'Restaurants, cuisines maison et boutiques de boissons à Brazzaville : filtre par univers ou par ouverture, consulte les cartes et commande en ligne.',
  alternates: { canonical: '/restaurants' },
};

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Catalogue complet des vendeurs.
 *
 * ## Avant
 *
 * `GET /vendors?limit=50`, puis filtres, recherche et décompte **en mémoire**
 * sur ces 50 : au 51ᵉ vendeur, il disparaissait du catalogue et des filtres,
 * sans message.
 *
 * ## Maintenant
 *
 * - **Sans recherche texte** : une vraie page serveur
 *   (`/vendors?page=N&limit=24&vendorType=…&isOpen=true`). Les filtres sont
 *   ceux du serveur, la pagination aussi ; `meta.total` donne le décompte.
 * - **Avec recherche texte** : `/vendors` n'a pas de paramètre de recherche.
 *   On lit alors tout le catalogue filtré par le serveur (pages de 100,
 *   borné), on cherche, puis on pagine **côté serveur** : seules les 24 cartes
 *   de la page partent au navigateur. Une page de lecture en échec fait
 *   échouer l'ensemble — jamais un résultat partiel présenté comme complet.
 *
 * Tous les filtres vivent dans l'URL (`?q=`, `?vendorType=`, `?ouvert=1`,
 * `?page=`) : partageables, rechargeables, compatibles avec le retour arrière.
 */
export default function RestaurantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-extrabold text-ink-900">Tous les vendeurs</h1>
      <Suspense fallback={<CatalogueFallback />}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

interface CatalogueResult {
  vendors: Restaurant[];
  total: number;
  totalPages: number;
}

async function loadCatalogue(params: CatalogueParams): Promise<Loaded<CatalogueResult>> {
  const filter = { vendorType: params.vendorType, isOpen: params.openOnly || undefined };

  if (!params.q) {
    const result = await getVendorPage({ ...filter, page: params.page, limit: CATALOGUE_PAGE_SIZE });
    if (result.status === 'error') return result;
    const { vendors, meta } = result.value;
    return { status: 'ok', value: { vendors, total: meta.total, totalPages: meta.totalPages } };
  }

  const all = await getAllVendors(filter);
  if (all.status === 'error') return all;
  const matches = all.value.vendors.filter((v) => matchesVendorQuery(v, params.q));
  const { items, totalPages } = paginate(matches, params.page, CATALOGUE_PAGE_SIZE);
  return { status: 'ok', value: { vendors: items, total: matches.length, totalPages } };
}

async function Catalogue({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = parseCatalogueParams(await searchParams);
  const [facets, result] = await Promise.all([getVendorFacets(), loadCatalogue(params)]);

  const typeFilters = facets.status === 'ok' ? availableTypeFilters(facets.value) : [];
  // Le filtre courant reste proposé même si son compteur est tombé à zéro
  // entre-temps : sinon on ne pourrait plus le désélectionner.
  if (params.vendorType && !typeFilters.some((f) => f.type === params.vendorType)) {
    typeFilters.push({ type: params.vendorType, label: VENDOR_TYPE_PLURAL[params.vendorType], count: 0 });
  }
  const hasFilter = Boolean(params.q || params.vendorType || params.openOnly);

  return (
    <>
      <p className="mt-2 text-sm text-ink-500">
        {facets.status === 'ok'
          ? vendorCountLabel(facets.value.total, facets.value.open)
          : 'Restaurants, cuisines maison et boutiques de Brazzaville.'}
      </p>

      <CatalogueControls
        params={params}
        typeFilters={typeFilters}
        openCount={facets.status === 'ok' ? facets.value.open : null}
      />

      <div className="mt-6" id="resultats">
        {result.status === 'error' ? (
          <VendorsLoadError />
        ) : result.value.total === 0 ? (
          <EmptyResult params={params} hasFilter={hasFilter} />
        ) : result.value.vendors.length === 0 ? (
          <div className="rounded-xl border border-cream-300 bg-white p-6">
            <p className="font-semibold text-ink-900">Cette page n’existe plus.</p>
            <Link
              href={catalogueHref(params, { page: 1 })}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-tomato-700 underline underline-offset-4"
            >
              Revenir à la première page
            </Link>
          </div>
        ) : (
          <>
            {hasFilter && (
              <p className="mb-4 text-sm text-ink-500" role="status">
                {result.value.total} résultat{result.value.total > 1 ? 's' : ''}
              </p>
            )}
            <VendorGrid vendors={result.value.vendors} />
            <CataloguePagination
              params={params}
              page={params.page}
              totalPages={result.value.totalPages}
            />
          </>
        )}
      </div>
    </>
  );
}

function emptyMessage(params: CatalogueParams): string {
  const among = params.openOnly ? ' parmi les vendeurs ouverts' : '';
  if (params.q) return `Aucun vendeur ne correspond à « ${params.q} »${among}.`;
  if (params.vendorType) return `Aucun vendeur dans cet univers${among}.`;
  return 'Aucun vendeur n’est ouvert en ce moment.';
}

function EmptyResult({ params, hasFilter }: { params: CatalogueParams; hasFilter: boolean }) {
  if (!hasFilter) {
    return (
      <div className="rounded-xl border border-cream-300 bg-white p-6">
        <p className="font-semibold text-ink-900">Aucun vendeur disponible pour le moment.</p>
        <p className="mt-1 text-sm text-ink-500">Les premières boutiques arrivent bientôt.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-cream-300 bg-white p-6">
      <TrackEmptyFilter vendorType={params.vendorType} hasSearch={Boolean(params.q)} />
      <p className="font-semibold text-ink-900">{emptyMessage(params)}</p>
      <p className="mt-1 text-sm text-ink-500">
        {params.openOnly
          ? 'Beaucoup de vendeurs ouvrent plus tard dans la journée.'
          : 'Essaie un autre mot ou un autre univers.'}
      </p>
      <Link
        href="/restaurants"
        className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-tomato-700 underline underline-offset-4"
      >
        Voir tous les vendeurs
      </Link>
    </div>
  );
}

/** Reprend la structure de `Catalogue` — pas de décalage visuel à l'arrivée. */
function CatalogueFallback() {
  return (
    <>
      <p className="mt-2 text-sm text-ink-500">
        Restaurants, cuisines maison et boutiques de Brazzaville.
      </p>
      <div className="mt-6 h-[7.5rem] sm:h-[6.5rem]" aria-hidden />
      <div className={`mt-6 ${VENDOR_GRID_CLASSNAME}`} aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <RestaurantCardSkeleton key={i} />
        ))}
      </div>
    </>
  );
}
