'use client';

import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { useRestaurantRanking } from '@lilia/api-client';

import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

/**
 * Classement des vendeurs par revenu.
 *
 * ## Le défaut corrigé
 *
 * Ce panneau agrégeait `useRestaurantOrders()` — la page de **vingt commandes**
 * de l'écran Commandes — groupée par `restaurantId`, et affichait le résultat
 * sous le titre « Revenus par restaurant · N FCFA total ». Deux erreurs
 * superposées : une population arbitraire, et **aucun filtre de statut**, si
 * bien que les commandes annulées y étaient comptées — seul endroit du tableau
 * de bord dans ce cas.
 *
 * `GET /dashboard/restaurant-ranking` existait, était correct, était réservé
 * ADMIN, et n'était appelé que par l'application Flutter.
 *
 * ## Pourquoi ADMIN seulement
 *
 * La route est `@Roles('ADMIN')` : un vendeur y recevrait un 403 sur son
 * tableau de bord. Et « revenus par restaurant » n'a de toute façon aucun sens
 * pour quelqu'un qui n'en tient qu'un — le panneau ne se montait auparavant
 * pour lui que parce que rien ne l'en empêchait.
 */
export function RestaurantRevenue() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();
  const { data, isLoading, isError, error } = useRestaurantRanking(
    token,
    isAdmin,
  );

  if (!isAdmin) return null;

  const rows = data ?? [];
  const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-card dark:border-dark-border dark:bg-dark-card">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-dark-border">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Revenus par vendeur
        </h3>
        <span className="text-xs text-zinc-400 tabular-nums">
          {totalRevenue.toLocaleString('fr-FR')} FCFA total
        </span>
      </div>

      {isError ? (
        <div className="p-5 text-center">
          <AlertCircle size={18} className="mx-auto mb-2 text-red-500" />
          <p className="text-xs text-red-600 dark:text-red-400">
            {apiMessage(error, 'Classement indisponible')}
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-zinc-400">
          Aucune vente sur la période.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-dark-border">
          {rows.map((r, index) => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-zinc-400">
                {index + 1}
              </span>
              {r.imageUrl ? (
                <Image
                  src={r.imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {r.nom}
                  {/* Un vendeur suspendu peut rester au classement : ses ventes
                      passées existent. Le dire évite de croire qu'il vend
                      encore. */}
                  {!r.isActive && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                      suspendu
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-400">
                  {r.orderCount} commande{r.orderCount > 1 ? 's' : ''}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {r.totalRevenue.toLocaleString('fr-FR')} FCFA
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
