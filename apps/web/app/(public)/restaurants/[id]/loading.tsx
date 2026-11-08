import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';

/**
 * Attente d'une fiche vendeur.
 *
 * Sans ce fichier, la page attendait la réponse du backend (2 à 7 s mesurées
 * en production, audit du 06/11/2026, PERF-01) sous le seul `<Suspense>` du
 * layout racine, qui n'a pas de repli : l'en-tête lui-même restait caché, et
 * un clic depuis la liste ne changeait rien à l'écran pendant 3 à 4 s. Next
 * précharge ce repli : la navigation l'affiche aussitôt.
 *
 * Même gabarit que la page (couverture, carte d'infos, carte) pour que
 * l'arrivée du contenu ne déplace rien.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-cream-100">
      <p role="status" className="sr-only">
        Chargement de la boutique…
      </p>
      <div className="h-48 bg-cream-200 sm:h-56" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-hidden>
        <div className="relative -mt-8 flex flex-col gap-3 rounded-2xl border border-cream-300 bg-white p-5 shadow-lg sm:p-6">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-hidden>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
          <div className="skeleton h-64 rounded-2xl lg:col-span-1" />
        </div>
      </div>
    </div>
  );
}
