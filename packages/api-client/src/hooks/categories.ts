'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category } from '@lilia/types';
import { apiClient } from '../client';

/**
 * Sections de menu d'un vendeur (`/categories`).
 *
 * ⚠️ Ces hooks visaient une table **globale** (`Category.nom @unique`, aucun
 * propriétaire) dont `POST` et `PATCH` étaient ouverts au rôle RESTAURATEUR :
 * renommer une section modifiait la carte de tous les commerces qui
 * l'utilisaient. Une catégorie appartient désormais à un vendeur, et un
 * vendeur ne touche qu'aux siennes — le backend le vérifie, le front n'a plus à
 * s'en préoccuper.
 *
 * `restaurantId` n'est transmis **que** par un ADMIN agissant pour un tiers.
 */

export const categoryKeys = {
  all: ['categories'] as const,
  list: (restaurantId?: string) => [...categoryKeys.all, 'list', restaurantId] as const,
};

/**
 * Sections du vendeur — **toutes**, y compris vides et désactivées.
 *
 * C'est la vue du propriétaire : celle où l'on remplit. L'ancienne route
 * filtrait sur « a déjà au moins un produit ici », si bien qu'une section
 * fraîchement créée disparaissait au rafraîchissement suivant et ne pouvait
 * plus jamais être remplie.
 */
export function useCategories(restaurantId: string | undefined, token: string | null) {
  return useQuery({
    queryKey: categoryKeys.list(restaurantId),
    queryFn: async () => {
      const res = await apiClient<Category[] | { data: Category[] }>(
        `/categories${restaurantId ? `?restaurantId=${restaurantId}` : ''}`,
        { token },
      );
      return Array.isArray(res) ? res : ((res as { data: Category[] }).data ?? []);
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

function invalidateCatalog(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: categoryKeys.all });
  // Un produit porte sa section dans sa réponse : renommer ou supprimer une
  // section rend le cache produits obsolète.
  void qc.invalidateQueries({ queryKey: ['products'] });
}

export function useCreateCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { nom: string; restaurantId?: string }) =>
      apiClient<Category>('/categories', {
        method: 'POST',
        token,
        body: JSON.stringify(vars),
      }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

export function useUpdateCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      nom?: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }) =>
      apiClient<Category>(`/categories/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

/**
 * Réordonnancement — on envoie la liste ordonnée **complète**.
 *
 * Un couple `(id, position)` suffirait pour un seul appelant ; à deux, chacun
 * partant d'un ordre différent, le résultat ne serait celui d'aucun des deux.
 */
export function useReorderCategories(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { categoryIds: string[]; restaurantId?: string }) =>
      apiClient<Category[]>('/categories/reorder', {
        method: 'PATCH',
        token,
        body: JSON.stringify(vars),
      }),
    onSuccess: () => invalidateCatalog(qc),
  });
}

/**
 * Supprime la section, **jamais** ses produits : ils sont détachés et restent
 * en vente. Ouvert au propriétaire — ce n'est plus une action réservée à
 * l'ADMIN, puisqu'il n'y a plus de vocabulaire partagé à protéger.
 */
export function useDeleteCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ detachedProducts: number }>(`/categories/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => invalidateCatalog(qc),
  });
}
