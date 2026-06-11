'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order, CreateOrderDto } from '@lilia/types';
import { apiClient, API_URL, ApiError } from '../client';

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

/**
 * Hook de création de commande.
 *
 * `idempotencyKey` (UUID v4) doit être stable pour toute la session de
 * checkout — le composant le génère une fois via `useState(() => crypto.randomUUID())`.
 * Si l'utilisateur relance le checkout après un échec réseau (4G faible à
 * Brazzaville), la même clé est renvoyée : le backend détecte le doublon et
 * retourne la réponse mise en cache au lieu de créer une 2ᵉ commande.
 */
export function useCreateOrder(token: string | null, idempotencyKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) =>
      apiClient<Order>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
        headers: { 'Idempotency-Key': idempotencyKey },
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

export function useRestaurantOrders(token: string | null) {
  return useQuery({
    queryKey: [...orderKeys.all, 'restaurant'] as const,
    queryFn: async () => {
      const res = await apiClient<Order[] | { data: Order[] }>('/orders/restaurant', { token });
      return Array.isArray(res) ? res : (res as { data: Order[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useReorder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient<unknown>(`/orders/${orderId}/reorder`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * Récupère le reçu PDF d'une commande payée sous forme de Blob.
 * Endpoint binaire (`StreamableFile`) → on ne passe PAS par `apiClient`
 * (qui suppose du JSON). Le backend autorise le propriétaire et les ADMIN.
 */
export async function fetchReceiptBlob(orderId: string, token: string | null): Promise<Blob> {
  const res = await fetch(`${API_URL}/orders/${orderId}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
    throw new ApiError(res.status, err.message ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

/**
 * Télécharge le reçu PDF dans le navigateur (déclenche le download).
 * Mutation pour exposer un état `isPending` côté bouton.
 */
export function useDownloadReceipt(token: string | null) {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const blob = await fetchReceiptBlob(orderId, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${orderId.slice(-6).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useUpdateOrderStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiClient<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
