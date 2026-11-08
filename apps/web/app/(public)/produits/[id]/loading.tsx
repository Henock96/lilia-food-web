import { Skeleton } from '@/components/ui/skeleton';

/**
 * Attente d'une fiche produit.
 *
 * La page lit `GET /products/:id` à chaque requête (`cache()` de React ne dure
 * que le rendu) : sans repli, la page restait blanche le temps de cet appel,
 * en-tête compris (audit du 06/11/2026, PERF-01). Même gabarit que la page.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-cream-100">
      <p role="status" className="sr-only">
        Chargement du produit…
      </p>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" aria-hidden>
        <Skeleton className="mb-6 h-5 w-40" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
