import { cn } from '@lilia/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden />;
}

/** Même gabarit que `VendorCard` : ligne sur mobile, carte verticale dès `sm`. */
export function RestaurantCardSkeleton() {
  return (
    <div className="flex gap-3.5 rounded-xl border border-cream-300 bg-white p-3 sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0">
      <Skeleton className="aspect-square w-24 shrink-0 rounded-lg sm:aspect-[16/10] sm:w-full sm:rounded-none" />
      <div className="flex flex-1 flex-col gap-2.5 sm:p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 border border-cream-300 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-3 mt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-cream-300 flex gap-3 p-3">
      <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between items-center mt-auto">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-4">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}
