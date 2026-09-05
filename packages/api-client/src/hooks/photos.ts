'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EntityType, Photo } from '@lilia/types';
import { apiClient } from '../client';

const endpoints: Record<EntityType, string> = {
  vendor: '/vendor-photos',
  product: '/product-images',
  menu: '/menu-images',
};

const parentFields: Record<EntityType, string> = {
  vendor: 'restaurantId',
  product: 'productId',
  menu: 'menuDuJourId',
};

/**
 * Quelle question la galerie pose au serveur.
 *
 * - `public` — « qu'est-ce qu'un client verrait ? » ; la route publique
 *   applique la frontière marketplace du vendeur ;
 * - `manage` — « qu'y a-t-il à gérer ? » ; la route `/mine` applique la
 *   **propriété** et rien d'autre.
 *
 * ⚠️ Le back-office lisait la vue publique. Elle ne rend rien d'un vendeur
 * suspendu, non validé ou en cours de configuration : `[]` sur `/vendor-photos`,
 * `404` sur `/product-images` et `/menu-images`. La page « Détails & photos »
 * affichait donc « Aucune photo » sur des galeries peuplées en base, et la
 * photo qu'on venait d'ajouter disparaissait au rafraîchissement suivant
 * (l'invalidation relit la route publique, qui ne la voit pas).
 *
 * C'est le même défaut que `GET /products` servi au back-office produits, et
 * il se corrige de la même façon : une route de gestion distincte, pas un
 * contournement côté interface.
 */
export type PhotoScope = 'public' | 'manage';

export const photoKeys = {
  all: ['photos'] as const,
  /**
   * Préfixe couvrant **tous** les périmètres d'une même entité.
   *
   * Les mutations invalident ici, jamais sur une clé de périmètre : une
   * suppression faite depuis le back-office doit aussi périmer la vue publique
   * en cache, sans quoi les deux divergent dans la même session.
   */
  entity: (entity: EntityType, parentId: string) =>
    ['photos', entity, parentId] as const,
  list: (entity: EntityType, parentId: string, scope: PhotoScope = 'public') =>
    ['photos', entity, parentId, scope] as const,
};

/**
 * URL de liste pour un périmètre donné.
 *
 * Exportée pour être testable : l'URL fautive vivait dans une closure de
 * `useQuery`, donc hors de portée de tout test — la même raison qui avait
 * imposé d'extraire `ownerCatalogQueryOptions` du hook catalogue.
 */
export function listPath(
  entity: EntityType,
  parentId: string,
  scope: PhotoScope,
) {
  const base = scope === 'manage' ? `${endpoints[entity]}/mine` : endpoints[entity];
  return `${base}?${parentFields[entity]}=${encodeURIComponent(parentId)}`;
}

/**
 * Photos d'une entité. `scope: 'manage'` pour toute surface d'administration —
 * elle exige un token, la route `/mine` étant réservée au propriétaire et à
 * l'ADMIN.
 */
export function usePhotos(
  entity: EntityType,
  parentId: string,
  token: string | null,
  scope: PhotoScope = 'public',
) {
  return useQuery({
    queryKey: photoKeys.list(entity, parentId, scope),
    queryFn: () =>
      apiClient<Photo[]>(listPath(entity, parentId, scope), { token }),
    // Sans le token, `/mine` répond 401 : attendre l'hydratation du store
    // d'authentification plutôt que d'afficher une erreur de chargement au
    // premier rendu.
    enabled: !!parentId && (scope === 'public' || !!token),
    staleTime: 30 * 1000,
  });
}

type UploadPayload = {
  url: string;
  publicId: string;
  alt?: string;
  isCover?: boolean;
};

/**
 * POST création d'une photo, hors contexte hook (utilisé pour rattacher
 * les images d'un produit juste après sa création). Le caller a déjà fait
 * l'upload Cloudinary et passe url + publicId.
 */
export function createPhoto(
  entity: EntityType,
  parentId: string,
  token: string | null,
  payload: UploadPayload,
): Promise<Photo> {
  return apiClient<Photo>(endpoints[entity], {
    method: 'POST',
    token,
    body: JSON.stringify({
      [parentFields[entity]]: parentId,
      url: payload.url,
      publicId: payload.publicId,
      ...(payload.alt !== undefined ? { alt: payload.alt } : {}),
      isCover: payload.isCover ?? false,
    }),
  });
}

/**
 * POST création. Le caller fait l'upload Cloudinary séparément (cf.
 * apps/admin/lib/cloudinary-upload.ts) puis passe url + publicId ici.
 */
export function useUploadPhoto(
  entity: EntityType,
  parentId: string,
  token: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadPayload) =>
      createPhoto(entity, parentId, token, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: photoKeys.entity(entity, parentId),
      });
    },
  });
}

type UpdatePayload = {
  photoId: string;
  alt?: string;
  isCover?: boolean;
  displayOrder?: number;
};

/**
 * PATCH /:id. Optimistic : si isCover passe à true, on démet les autres
 * covers en local avant l'appel API ; rollback en cas d'erreur.
 */
export function useUpdatePhoto(
  entity: EntityType,
  parentId: string,
  token: string | null,
  scope: PhotoScope = 'public',
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId, scope);
  return useMutation({
    mutationFn: ({ photoId, ...patch }: UpdatePayload) =>
      apiClient<Photo>(`${endpoints[entity]}/${photoId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      }),
    onMutate: async ({ photoId, alt, isCover }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Photo[]>(key);
      queryClient.setQueryData<Photo[]>(key, (old = []) =>
        old.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              ...(alt !== undefined ? { alt } : {}),
              ...(isCover !== undefined ? { isCover } : {}),
            };
          }
          if (isCover === true) {
            return { ...p, isCover: false };
          }
          return p;
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: photoKeys.entity(entity, parentId),
      });
    },
  });
}

/**
 * DELETE /:id. Optimistic remove + rollback en cas d'erreur.
 */
export function useDeletePhoto(
  entity: EntityType,
  parentId: string,
  token: string | null,
  scope: PhotoScope = 'public',
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId, scope);
  return useMutation({
    mutationFn: (photoId: string) =>
      apiClient<void>(`${endpoints[entity]}/${photoId}`, {
        method: 'DELETE',
        token,
      }),
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Photo[]>(key);
      queryClient.setQueryData<Photo[]>(key, (old = []) =>
        old.filter((p) => p.id !== photoId),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: photoKeys.entity(entity, parentId),
      });
    },
  });
}

/**
 * POST /reorder. Reçoit la liste d'IDs ordonnée. Optimistic : réécrit
 * `displayOrder` localement.
 */
export function useReorderPhotos(
  entity: EntityType,
  parentId: string,
  token: string | null,
  scope: PhotoScope = 'public',
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId, scope);
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient<void>(`${endpoints[entity]}/reorder`, {
        method: 'POST',
        token,
        body: JSON.stringify({ [parentFields[entity]]: parentId, ids }),
      }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Photo[]>(key);
      const byId = new Map((previous ?? []).map((p) => [p.id, p]));
      const next: Photo[] = ids
        .map((id, idx) => {
          const existing = byId.get(id);
          if (!existing) return null;
          return { ...existing, displayOrder: idx };
        })
        .filter((p): p is Photo => p !== null);
      queryClient.setQueryData<Photo[]>(key, next);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: photoKeys.entity(entity, parentId),
      });
    },
  });
}
