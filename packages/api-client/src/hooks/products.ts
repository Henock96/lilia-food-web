'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product, Category } from '@lilia/types';
import { apiClient } from '../client';

export const productKeys = {
  all:    ['products'] as const,
  list:   (restaurantId?: string) => [...productKeys.all, 'list', restaurantId] as const,
  detail: (id: string)            => [...productKeys.all, 'detail', id] as const,
};

export function useMyRestaurant(token: string | null) {
  return useQuery({
    queryKey: ['restaurants', 'mine'],
    queryFn:  async () => {
      const res = await apiClient<unknown>('/restaurants/mine', { token });
      return (res as { data?: unknown })?.data ?? res;
    },
    enabled:    !!token,
    staleTime:  5 * 60 * 1000,
    retry:      false,         // ne pas boucler si 404 (compte ADMIN sans restaurant)
  });
}

export function useProducts(restaurantId: string | undefined) {
  return useQuery({
    queryKey: productKeys.list(restaurantId),
    queryFn:  async () => {
      const res = await apiClient<Product[] | { data: Product[] }>(
        `/products?restaurantId=${restaurantId}&limit=200`,
      );
      return Array.isArray(res) ? res : (res as { data: Product[] }).data ?? [];
    },
    enabled:   !!restaurantId,
    staleTime: 60 * 1000,
  });
}

export function useCategories(restaurantId?: string) {
  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn:  async () => {
      const res = await apiClient<Category[] | { data: Category[] }>(
        `/categories${restaurantId ? `?restaurantId=${restaurantId}` : ''}`,
      );
      return Array.isArray(res) ? res : (res as { data: Category[] }).data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateProduct(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiClient<Product>('/products', { method: 'POST', token, body: JSON.stringify(data) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient<Product>(`/products/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useDeleteProduct(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/products/${id}`, { method: 'DELETE', token }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProductStock(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stockQuotidien }: { id: string; stockQuotidien: number | null }) =>
      apiClient<Product>(`/products/${id}/stock`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ stockQuotidien }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}
