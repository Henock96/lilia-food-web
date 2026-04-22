'use client';

import { useRestaurants, useToggleRestaurantOpen } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export function RestaurantStatus() {
  const { token } = useAuthStore();
  const { data: restaurants, isLoading } = useRestaurants();
  const { mutate: toggleOpen, isPending } = useToggleRestaurantOpen(token);

  function handleToggle(id: string, current: boolean) {
    toggleOpen(id, {
      onSuccess: () => toast.success(current ? 'Restaurant fermé' : 'Restaurant ouvert'),
      onError:   () => toast.error('Erreur lors de la mise à jour'),
    });
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Statut des restaurants</h3>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}
        </div>
      ) : !restaurants?.length ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">Aucun restaurant</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-dark-border">
          {restaurants.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${r.isOpen ? 'bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">{r.nom}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                r.isOpen
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {r.isOpen ? 'Ouvert' : 'Fermé'}
              </span>
              <button
                onClick={() => handleToggle(r.id, r.isOpen)}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors disabled:opacity-40"
              >
                {r.isOpen ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
