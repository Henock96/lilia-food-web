import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { VendorCard } from '@/components/restaurants/vendor-card';
import { EmptyVendorSlot } from '@/components/restaurants/empty-vendor-slot';
import { RestaurantCardSkeleton } from '@/components/ui';
import { getVendors } from '@/lib/vendors';

/** Nombre d'emplacements affichés, remplis ou non. */
const SLOTS = 4;

const GRID_CLASSNAME = 'mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4';

/**
 * Grille des vendeurs — seule partie de la section qui dépend du backend.
 *
 * `getVendors()` appelle `connection()` : ce sous-arbre est donc rendu à la
 * requête, jamais au build. C'est ce qui empêche un backend Render endormi de
 * faire échouer le déploiement (cf. le commentaire de `lib/vendors.ts`), d'où
 * le `<Suspense>` obligatoire autour.
 *
 * Le catalogue de production ne compte qu'un seul vendeur : une grille de 4
 * cases dont 3 resteraient blanches lirait comme un site cassé. On complète
 * donc toujours jusqu'à 4 emplacements avec `EmptyVendorSlot` (pointillés),
 * partagé avec `VendorGrid` (/restaurants) pour ne pas dupliquer ce motif —
 * un service qui démarre, pas un bug. On ne délègue pas à `VendorGrid` ici :
 * son propre état vide (« Aucun restaurant disponible ») ferait doublon avec
 * ces emplacements explicites.
 */
async function FeaturedGrid() {
  const restaurants = await getVendors();
  const featured = restaurants.slice(0, SLOTS);

  return (
    <div className={GRID_CLASSNAME}>
      {featured.map((r) => (
        <VendorCard key={r.id} restaurant={r} />
      ))}
      {Array.from({ length: Math.max(0, SLOTS - featured.length) }).map((_, i) => (
        <EmptyVendorSlot key={`empty-${i}`} label={i === 0 ? 'Prochain vendeur ici' : undefined} />
      ))}
    </div>
  );
}

/** Occupe exactement la place de la grille finale — pas de décalage à l'arrivée. */
function FeaturedGridFallback() {
  return (
    <div className={GRID_CLASSNAME}>
      {Array.from({ length: SLOTS }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Section « Les plus courus » — vendeurs en vedette.
 *
 * La coquille (titre, accroche, liens « Voir tout ») ne dépend d'aucune donnée
 * et reste prérendue statiquement ; seule la grille est différée.
 *
 * L'accroche annonçait auparavant « N vendeurs ouverts en ce moment » en se
 * contentant de compter les vendeurs *listés*, ouverts ou non — la même
 * inexactitude que celle corrigée sur `/restaurants`. Le catalogue de
 * production ne comptant qu'un vendeur, actuellement fermé, la home affirmait
 * « 1 vendeur ouvert en ce moment » au-dessus d'une carte « Fermé ». On s'en
 * tient donc à une accroche qui ne prétend rien de vérifiable.
 */
export function FeaturedRestaurants() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Ils font saliver tout Brazza
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              Les meilleurs vendeurs de la ville, sélectionnés pour toi.
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

        <Suspense fallback={<FeaturedGridFallback />}>
          <FeaturedGrid />
        </Suspense>

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
