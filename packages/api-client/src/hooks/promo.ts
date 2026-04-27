'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PromoCode } from '@lilia/types';
import { apiClient } from '../client';

export const promoKeys = {
  all:   ['promos'] as const,
  list:  (activeOnly?: boolean) => [...promoKeys.all, 'list', activeOnly] as const,
  stats: (id: string)           => [...promoKeys.all, 'stats', id] as const,
};

export function usePromos(token: string | null, activeOnly = false) {
  return useQuery({
    queryKey: promoKeys.list(activeOnly),
    queryFn:  async () => {
      const res = await apiClient<PromoCode[] | { data: PromoCode[] }>(
        `/promo${activeOnly ? '?activeOnly=true' : ''}`,
        { token },
      );
      return Array.isArray(res) ? res : (res as { data: PromoCode[] }).data ?? [];
    },
    enabled:   !!token,
    staleTime: 60 * 1000,
  });
}

export function usePromoStats(promoId: string | null, token: string | null) {
  return useQuery({
    queryKey: promoKeys.stats(promoId ?? ''),
    queryFn:  () => apiClient<unknown>(`/promo/${promoId}/stats`, { token }),
    enabled:  !!promoId && !!token,
    staleTime: 60 * 1000,
  });
}

export function useCreatePromo(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<PromoCode>('/promo', { method: 'POST', token, body: JSON.stringify(data) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}

export function useTogglePromo(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<PromoCode>(`/promo/${id}/toggle`, { method: 'PATCH', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}

export function useDeletePromo(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/promo/${id}`, { method: 'DELETE', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: promoKeys.all }),
  });
}
