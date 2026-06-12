'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Category } from '@lilia/types';
import { apiClient } from '../client';

/**
 * Mutations CRUD catégories (LIL-108).
 *
 * ⚠️ Les catégories sont **globales** côté backend (`Category.nom @unique`, pas
 * de `restaurantId`). Créer/renommer affecte la taxonomie de toute la
 * plateforme. `POST`/`PATCH` sont ouverts à `RESTAURATEUR, ADMIN` ; `DELETE`
 * est `@Roles('ADMIN')` only → ne pas exposer le delete au restaurateur.
 *
 * La query `useCategories` (clé `['categories', restaurantId?]`) vit dans
 * `hooks/products.ts`. On invalide la racine `['categories']` après mutation.
 */

function invalidateCategories(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['categories'] });
}

export function useCreateCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nom: string) =>
      apiClient<Category>('/categories', {
        method: 'POST',
        token,
        body: JSON.stringify({ nom }),
      }),
    onSuccess: () => invalidateCategories(qc),
  });
}

export function useUpdateCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nom }: { id: string; nom: string }) =>
      apiClient<Category>(`/categories/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ nom }),
      }),
    onSuccess: () => invalidateCategories(qc),
  });
}

/** ADMIN only côté backend — ne pas appeler depuis un compte RESTAURATEUR. */
export function useDeleteCategory(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/categories/${id}`, { method: 'DELETE', token }),
    onSuccess: () => invalidateCategories(qc),
  });
}
