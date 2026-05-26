'use client';

import Image from 'next/image';
import { useRestaurants, useToggleRestaurantOpen, useMyRestaurant } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { useIsAdmin } from '@/lib/use-role';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Phone, Clock, ToggleLeft, ToggleRight, Star, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Page Restaurants (LIL-102 role-aware) :
 * - ADMIN : grille de TOUS les restaurants de la plateforme
 * - RESTAURATEUR : son seul restaurant (`GET /restaurants/mine`)
 *
 * Le toggle ouvert/fermé est exposé dans les deux cas — le backend filtre
 * via `@Roles('ADMIN','RESTAURATEUR')` + vérification ownership sur l'id.
 */
export default function RestaurantsPage() {
  const { token } = useAuthStore();
  const isAdmin = useIsAdmin();

  // ADMIN : fetch global. RESTAURATEUR : fetch "mine" — `enabled` désactive
  // l'autre branche pour éviter un appel inutile + un 403.
  const adminQuery = useRestaurants();
  const mineQuery = useMyRestaurant(isAdmin ? null : token);

  const restaurants: Restaurant[] = isAdmin
    ? adminQuery.data ?? []
    : mineQuery.data
    ? [mineQuery.data as Restaurant]
    : [];

  const isLoading = isAdmin ? adminQuery.isLoading : mineQuery.isLoading;
  const isError = !isAdmin && mineQuery.isError;

  const { mutate: toggleOpen, isPending } = useToggleRestaurantOpen(token);

  function handleToggle(id: string, currentState: boolean) {
    toggleOpen(id, {
      onSuccess: () => toast.success(currentState ? 'Restaurant fermé' : 'Restaurant ouvert'),
      onError: () => toast.error('Erreur lors de la mise à jour'),
    });
  }

  // Cas RESTAURATEUR sans restaurant attribué — guide vers le support
  if (isError) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle size={40} className="mx-auto text-amber-500 mb-3" />
        <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Aucun restaurant attribué
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Votre compte restaurateur n'est associé à aucun restaurant.
          Contactez un administrateur Lilia pour finaliser votre activation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isAdmin
            ? `${restaurants.length} restaurant${restaurants.length > 1 ? 's' : ''}`
            : 'Mon restaurant'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: isAdmin ? 6 : 1 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden"
            >
              {/* Image */}
              <div className="h-32 bg-zinc-100 dark:bg-zinc-800 relative">
                {r.imageUrl ? (
                  <Image src={r.imageUrl} alt={r.nom} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                )}
                {/* Open/Close badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  r.isOpen
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-800/80 text-zinc-300'
                }`}>
                  {r.isOpen ? 'Ouvert' : 'Fermé'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">{r.nom}</h3>
                  {r.averageRating !== undefined && r.averageRating > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs text-zinc-500">{r.averageRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <MapPin size={11} />
                    <span className="truncate">{r.adresse}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Phone size={11} />
                    <span>{r.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Clock size={11} />
                    <span>{r.estimatedDeliveryTimeMin}–{r.estimatedDeliveryTimeMax} min</span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggle(r.id, r.isOpen)}
                  disabled={isPending}
                  className={`flex items-center gap-2 w-full mt-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    r.isOpen
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {r.isOpen
                    ? <><ToggleRight size={14} /> Fermer le restaurant</>
                    : <><ToggleLeft size={14} /> Ouvrir le restaurant</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
