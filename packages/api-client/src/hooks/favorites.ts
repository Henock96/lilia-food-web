'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Restaurant } from '@lilia/types';
import { apiClient } from '../client';

export const favoriteKeys = {
  all: ['favorites'] as const,
  check: (restaurantId: string) => ['favorites', 'check', restaurantId] as const,
};

export function useFavorites(token: string | null) {
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: () => apiClient<Restaurant[]>('/favorites', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useToggleFavorite(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      restaurantId,
      isFavorite,
    }: {
      restaurantId: string;
      isFavorite: boolean;
      // Objet restaurant requis pour l'ajout optimiste (insertion dans la liste).
      restaurant?: Restaurant;
    }) => {
      if (isFavorite) {
        await apiClient(`/favorites/${restaurantId}`, { method: 'DELETE', token });
      } else {
        await apiClient(`/favorites/${restaurantId}`, { method: 'POST', token });
      }
    },
    onMutate: async ({ restaurantId, isFavorite, restaurant }) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all });
      const previous = queryClient.getQueryData<Restaurant[]>(favoriteKeys.all);
      // Optimistic update — retrait ET ajout (l'ajout insère le restaurant
      // fourni s'il n'est pas déjà présent).
      queryClient.setQueryData<Restaurant[]>(favoriteKeys.all, (old = []) => {
        if (isFavorite) {
          return old.filter((r) => r.id !== restaurantId);
        }
        if (restaurant && !old.some((r) => r.id === restaurantId)) {
          return [...old, restaurant];
        }
        return old;
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(favoriteKeys.all, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
    },
  });
}
