'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, CreateOrderDto } from '@lilia/types';
import { apiClient } from '../client';

export const orderKeys = {
  all: ['orders'] as const,
  mine: () => [...orderKeys.all, 'mine'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
};

export function useMyOrders(token: string | null) {
  return useQuery({
    queryKey: orderKeys.mine(),
    queryFn: async () => {
      const res = await apiClient<Order[] | { data: Order[] }>('/orders/my', { token });
      return Array.isArray(res) ? res : (res as { data: Order[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    retry: 3,
  });
}

export function useOrder(id: string, token: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient<Order>(`/orders/${id}`, { token }),
    enabled: !!id && !!token,
    refetchInterval: (query) => {
      const data = query.state.data as Order | undefined;
      const activeStatuses = ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'PRET', 'EN_ROUTE'];
      if (data && activeStatuses.includes(data.status)) return 15 * 1000;
      return false;
    },
  });
}

export function useCreateOrder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) =>
      apiClient<Order>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useCancelOrder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient<Order>(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
