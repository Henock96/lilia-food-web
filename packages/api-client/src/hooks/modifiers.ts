'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ModifierLibrary,
  ModifierLibraryGroup,
  ModifierOptionInput,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

/**
 * F3-09 — éditeur d'options (vendeur, et ADMIN pour l'aider).
 *
 * Toutes les routes vivent sous `/products/manage/…`. `restaurantId` n'est
 * joint que pour un ADMIN : le backend le refuse d'un RESTAURATEUR et déduit
 * son vendeur du compte authentifié (`resolveTargetRestaurant`).
 *
 * Chaque écriture invalide aussi le catalogue produits : une fiche porte ses
 * groupes d'options.
 */
export const modifierKeys = {
  all: ['modifier-groups'] as const,
  library: (restaurantId: string | undefined) =>
    [...modifierKeys.all, restaurantId ?? 'mine'] as const,
};

/** Chemins de l'API, exécutables sans React (contrat testé). */
export const modifierPaths = {
  library: (restaurantId?: string) =>
    `/products/manage/modifier-groups${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`,
  group: (id: string) => `/products/manage/modifier-groups/${encodeURIComponent(id)}`,
  groupDelete: (id: string, restaurantId?: string) =>
    `/products/manage/modifier-groups/${encodeURIComponent(id)}${restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : ''}`,
  reorder: () => '/products/manage/modifier-groups/reorder',
  availability: (optionId: string) =>
    `/products/manage/modifier-options/${encodeURIComponent(optionId)}/availability`,
  productGroups: (productId: string) =>
    `/products/manage/${encodeURIComponent(productId)}/modifier-groups`,
};

export function useModifierLibrary(restaurantId: string | undefined, token: string | null) {
  return useQuery({
    queryKey: modifierKeys.library(restaurantId),
    queryFn: async (): Promise<ModifierLibrary> => {
      const res = await apiClientRaw<{ data: ModifierLibraryGroup[]; meta: ModifierLibrary['meta'] }>(
        modifierPaths.library(restaurantId),
        { token },
      );
      return { groups: res.data ?? [], meta: res.meta };
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: modifierKeys.all });
    void qc.invalidateQueries({ queryKey: ['products'] });
    // Les lignes de panier purgées par une suppression ne concernent pas ce
    // compte-ci, mais un vendeur qui teste sa propre boutique en a un.
    void qc.invalidateQueries({ queryKey: ['cart'] });
  };
}

export interface ModifierGroupInput {
  restaurantId?: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionInput[];
}

export function useCreateModifierGroup(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: ModifierGroupInput) =>
      apiClient<ModifierLibraryGroup>(modifierPaths.library(), {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

/** `options` = liste COMPLÈTE voulue : `id` connu = modifiée, absente = retirée. */
export function useUpdateModifierGroup(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ModifierGroupInput> & { id: string }) =>
      apiClient<ModifierLibraryGroup>(modifierPaths.group(id), {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteModifierGroup(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, restaurantId }: { id: string; restaurantId?: string }) =>
      apiClient<{ id: string; soft: boolean }>(modifierPaths.groupDelete(id, restaurantId), {
        method: 'DELETE',
        token,
      }),
    onSuccess: invalidate,
  });
}

/** Rupture en un geste (« plus d'alloco ce soir ») ; ne touche aucun panier. */
export function useSetModifierOptionAvailability(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ optionId, ...body }: { optionId: string; isAvailable: boolean; restaurantId?: string }) =>
      apiClient<{ id: string; isAvailable: boolean }>(modifierPaths.availability(optionId), {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

/** Groupes d'un produit, ordonnés — remplacement complet et idempotent. */
export function useSetProductModifierGroups(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ productId, ...body }: { productId: string; groupIds: string[]; restaurantId?: string }) =>
      apiClient<{ productId: string; groupIds: string[] }>(modifierPaths.productGroups(productId), {
        method: 'PUT',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}

export function useReorderModifierGroups(token: string | null) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { groupIds: string[]; restaurantId?: string }) =>
      apiClient<{ groupIds: string[] }>(modifierPaths.reorder(), {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });
}
