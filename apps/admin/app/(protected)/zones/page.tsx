'use client';

import { useAdminQuartiers } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

export default function ZonesPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = useAdminQuartiers(token);

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-xs text-zinc-400">
        Référentiel des quartiers couverts. La configuration des zones de livraison et de leurs
        tarifs se fait au niveau de chaque restaurant.
      </p>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Quartiers{data ? ` (${data.length})` : ''}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les quartiers.</p>
          </div>
        ) : !data?.length ? (
          <div className="px-5 py-12 text-center">
            <MapPin size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun quartier</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <MapPin size={12} className="text-primary-500 shrink-0" />
                <span className="truncate">{q.nom}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
