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
    <div className="min-h-screen bg-[#faf7f2]">
      <p role="status" className="sr-only">
        Chargement du produit…
      </p>
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 lg:px-8" aria-hidden>
        <Skeleton className="mb-5 h-5 w-40" />
        <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-10">
          <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
