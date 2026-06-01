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

export const photoKeys = {
  all: ['photos'] as const,
  list: (entity: EntityType, parentId: string) =>
    ['photos', entity, parentId] as const,
};

/**
 * Liste publique des photos d'une entité. Le backend ne requiert pas de
 * token mais on le passe quand il est dispo pour rester cohérent.
 */
export function usePhotos(
  entity: EntityType,
  parentId: string,
  token: string | null,
) {
  return useQuery({
    queryKey: photoKeys.list(entity, parentId),
    queryFn: () =>
      apiClient<Photo[]>(
        `${endpoints[entity]}?${parentFields[entity]}=${parentId}`,
        { token },
      ),
    enabled: !!parentId,
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
      apiClient<Photo>(endpoints[entity], {
        method: 'POST',
        token,
        body: JSON.stringify({
          [parentFields[entity]]: parentId,
          url: payload.url,
          publicId: payload.publicId,
          ...(payload.alt !== undefined ? { alt: payload.alt } : {}),
          isCover: payload.isCover ?? false,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: photoKeys.list(entity, parentId),
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
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId);
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
      void queryClient.invalidateQueries({ queryKey: key });
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
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId);
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
      void queryClient.invalidateQueries({ queryKey: key });
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
) {
  const queryClient = useQueryClient();
  const key = photoKeys.list(entity, parentId);
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
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
