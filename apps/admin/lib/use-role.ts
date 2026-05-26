'use client';

import { useMyRestaurant } from '@lilia/api-client';
import type { Restaurant, Role } from '@lilia/types';
import { useAuthStore } from '@/store/auth';

/**
 * Hooks de pilotage role-aware de l'admin web (LIL-102).
 *
 * Inspirés du pattern Flutter (`currentUserProfileProvider` +
 * `currentRestaurantIdProvider` dans `lilia-food-admin`).
 *
 * La source de vérité du rôle est le store Zustand peuplé par `auth-provider`
 * après le sync backend.
 */

export function useCurrentRole(): Role | undefined {
  return useAuthStore((s) => s.user?.role);
}

export function useIsAdmin(): boolean {
  return useCurrentRole() === 'ADMIN';
}

export function useIsRestaurateur(): boolean {
  return useCurrentRole() === 'RESTAURATEUR';
}

/**
 * Restaurant du restaurateur connecté.
 *
 * - ADMIN : `null` (un admin n'a pas "son" restaurant — il gère tout)
 * - RESTAURATEUR : fetch `GET /restaurants/mine` (cached 5min)
 * - Si l'endpoint renvoie 404 (restaurateur sans resto attribué), `isError`
 *   sera vrai côté `useMyRestaurant` — à la charge du caller de décider.
 */
export function useMyRestaurantScoped(token: string | null) {
  const isAdmin = useIsAdmin();
  const query = useMyRestaurant(isAdmin ? null : token);
  return {
    restaurant: (query.data ?? null) as Restaurant | null,
    isLoading: !isAdmin && query.isLoading,
    isError: !isAdmin && query.isError,
  };
}

/**
 * ID du restaurant courant pour scopper les requêtes.
 *
 * Retourne `undefined` pour ADMIN (pas de scope, il voit tout) et tant que
 * le fetch RESTAURATEUR n'a pas résolu — les consumers doivent gérer le
 * `undefined` (ex: `enabled: !!restaurantId`).
 */
export function useCurrentRestaurantId(token: string | null): string | undefined {
  const { restaurant } = useMyRestaurantScoped(token);
  return restaurant?.id;
}
