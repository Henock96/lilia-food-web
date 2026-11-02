'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery, useMutation, useQueryClient } from '../session-query';
import type { PromoCode } from '@lilia/types';
import { apiClient } from '../client';

export const promoKeys = {
  all:   ['promos'] as const,
  list:  (activeOnly?: boolean) => [...promoKeys.all, 'list', activeOnly] as const,
  stats: (id: string)           => [...promoKeys.all, 'stats', id] as const,
};

export function usePromos(token: AuthCredential | null, activeOnly = false) {
  return useQuery({
    queryKey: promoKeys.list(activeOnly),
    queryFn:  async ({ signal }: { signal?: AbortSignal } = {}) => {
      const res = await apiClient<PromoCode[] | { data: PromoCode[] }>(
        `/promo${activeOnly ? '?activeOnly=true' : ''}`,
        { signal, token },
      );
      return Array.isArray(res) ? res : (res as { data: PromoCode[] }).data ?? [];
    },
    enabled:   !!token,
    staleTime: 60 * 1000,
  });
}

export function usePromoStats(promoId: string | null, token: AuthCredential | null) {
  return useQuery({
    queryKey: promoKeys.stats(promoId ?? ''),
    queryFn:  ({ signal }: { signal?: AbortSignal } = {}) => apiClient<unknown>(`/promo/${promoId}/stats`, { signal, token }),
    enabled:  !!promoId && !!token,
    staleTime: 60 * 1000,
  });
}

export function useCreatePromo(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<PromoCode>('/promo', { method: 'POST', token, body: JSON.stringify(data) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}

export function useTogglePromo(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<PromoCode>(`/promo/${id}/toggle`, { method: 'PATCH', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}

export function useDeletePromo(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/promo/${id}`, { method: 'DELETE', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}
