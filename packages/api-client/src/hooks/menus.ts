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

/** Menus d'un restaurant (GET /menus?restaurantId=) — usage ADMIN. */
export function useMenus(restaurantId: string | undefined) {
  return useQuery({
    queryKey: menuKeys.list(restaurantId),
    queryFn: () => fetchList(`/menus?restaurantId=${restaurantId}`),
    enabled: !!restaurantId,
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
