import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <p role="status" className="sr-only">
        Chargement de la boutique…
      </p>
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 lg:px-8" aria-hidden>
        <Skeleton className="mb-5 h-5 w-48" />
        <div className="border-ink-100 overflow-hidden rounded-2xl border bg-white">
          <Skeleton className="h-44 w-full rounded-none sm:h-56 lg:h-64" />
          <div className="space-y-3 p-5 sm:p-7">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
        <div className="grid items-start gap-7 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.46fr)] lg:gap-9">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
