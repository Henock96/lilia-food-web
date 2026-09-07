'use client';

import Link from 'next/link';
import { useAdminQuartiers } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin } from 'lucide-react';

export default function ZonesPage() {
  const { token } = useAuthStore();
  const { data, isLoading, isError } = useAdminQuartiers(token);

  return (
    <div className="max-w-4xl space-y-4">
      {/* Cette phrase disait « la configuration se fait au niveau de chaque
          restaurant » — et la page du restaurant renvoyait ici, « dans Zones,
          par l'admin ». Deux écrans qui se désignaient l'un l'autre pour une
          fonction qu'aucun ne portait. Elle existe maintenant, et le lien y
          mène pour de bon. */}
      <p className="text-xs text-zinc-400">
        Référentiel des quartiers de la ville. Les zones de livraison et leurs
        tarifs sont <strong className="font-medium text-zinc-500 dark:text-zinc-300">propres à chaque
        vendeur</strong> — le même quartier peut valoir 500 F chez l&apos;un et
        1 500 F chez l&apos;autre. Ils se règlent dans{' '}
        <Link
          href="/restaurants"
          className="font-medium text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
        >
          Restaurants → un vendeur → onglet « Livraison »
        </Link>
        .
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
