'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MenuDuJour } from '@lilia/types';
import { apiClient } from '../client';

export const menuKeys = {
  all: ['menus'] as const,
  list: (restaurantId?: string) => [...menuKeys.all, 'list', restaurantId] as const,
  mine: () => [...menuKeys.all, 'mine'] as const,
};

/** Déballe une réponse tableau tolérante (`T[]` ou `{ data: T[] }`). */
async function fetchList(path: string, token?: string | null): Promise<MenuDuJour[]> {
  const res = await apiClient<MenuDuJour[] | { data: MenuDuJour[] }>(path, { token });
  return Array.isArray(res) ? res : (res?.data ?? []);
}

/**
 * Menus d'un vendeur pour un ADMIN.
 *
 * ⚠️ Ce hook visait `GET /menus?restaurantId=`, une route **publique**
 * désormais filtrée par la frontière marketplace (fix SEC-02) : elle ne rend
 * que les commerces déjà publiés, c'est-à-dire l'exact complément de ceux dont
 * l'admin doit remplir le catalogue. La route dédiée, elle, voit les `DRAFT`.
 */
export function useMenus(restaurantId: string | undefined, token: string | null) {
  return useQuery({
    queryKey: menuKeys.list(restaurantId),
    queryFn: () => fetchList(`/menus/admin/by-restaurant/${restaurantId}`, token),
    enabled: !!restaurantId && !!token,
    staleTime: 60 * 1000,
  });
}

/** Menus du restaurateur connecté (GET /menus/restaurant/mine). */
export function useMyMenus(token: string | null) {
  return useQuery({
    queryKey: menuKeys.mine(),
    queryFn: () => fetchList('/menus/restaurant/mine', token),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useCreateMenu(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    // `restaurantId` n'est joint que pour un ADMIN (cf. produits et sections) :
    // le backend le refuse d'un RESTAURATEUR au lieu de le remplacer en silence.
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<MenuDuJour>('/menus', { method: 'POST', token, body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useUpdateMenu(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient<MenuDuJour>(`/menus/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

/** Bascule isActive (PATCH /menus/:id/toggle). */
export function useToggleMenu(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<MenuDuJour>(`/menus/${id}/toggle`, { method: 'PATCH', token }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}

export function useDeleteMenu(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/menus/${id}`, { method: 'DELETE', token }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: menuKeys.all }),
  });
}
