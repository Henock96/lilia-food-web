'use client';

import Image from 'next/image';
import { useRestaurantOrders, useRestaurants } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import type { Order } from '@lilia/types';

export function RestaurantRevenue() {
  const { token } = useAuthStore();
  const { data: orders,      isLoading: loadingOrders }  = useRestaurantOrders(token);
  const { data: restaurants, isLoading: loadingRestaurants } = useRestaurants();

  const isLoading = loadingOrders || loadingRestaurants;

  // Grouper les commandes par restaurantId
  const revenueMap = (orders ?? []).reduce<Record<string, { revenue: number; orders: number }>>((acc, o: Order) => {
    if (!o.restaurantId) return acc;
    if (!acc[o.restaurantId]) acc[o.restaurantId] = { revenue: 0, orders: 0 };
    acc[o.restaurantId]!.revenue += o.total ?? 0;
    acc[o.restaurantId]!.orders  += 1;
    return acc;
  }, {});

  // Associer avec les noms de restaurants + trier par revenue desc
  const rows = Object.entries(revenueMap)
    .map(([id, stats]) => {
      const restaurant = (restaurants ?? []).find(r => r.id === id);
      return { id, name: restaurant?.nom ?? 'Restaurant', imageUrl: restaurant?.imageUrl ?? null, ...stats };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-dark-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Revenus par restaurant</h3>
        <span className="text-xs text-zinc-400">{totalRevenue.toLocaleString('fr-FR')} FCFA total</span>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-zinc-400">Aucune commande enregistrée</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-dark-border">
          {rows.map((r, i) => {
            const pct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
            return (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-zinc-400 w-4 tabular-nums">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    {r.imageUrl
                      ? <Image src={r.imageUrl} alt={r.name} width={32} height={32} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-base">🍽️</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">{r.name}</p>
                    <p className="text-xs text-zinc-400">{r.orders} commande{r.orders > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {r.revenue.toLocaleString('fr-FR')}
                      <span className="text-xs font-normal text-zinc-400 ml-1">FCFA</span>
                    </p>
                    <p className="text-xs text-zinc-400">{pct.toFixed(0)}% du total</p>
                  </div>
                </div>
                {/* Barre de progression */}
                <div className="ml-7 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
