'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Cart, AddToCartDto } from '@lilia/types';
import { apiClient } from '../client';

export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
};

export function useCart(token: string | null) {
  return useQuery({
    queryKey: cartKeys.detail(),
    queryFn: async () => {
      const cart = await apiClient<Cart>('/cart', { token });
      return { ...cart, items: cart.items ?? [] };
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useAddToCart(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AddToCartDto) =>
      apiClient<Cart>('/cart/add', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
  });
}

export function useUpdateCartItem(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantite }: { itemId: string; quantite: number }) =>
      apiClient<Cart>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantite }),
        token,
      }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
  });
}

export function useRemoveCartItem(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiClient<Cart>(`/cart/items/${itemId}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: (newCart) => {
      queryClient.setQueryData(cartKeys.detail(), newCart);
    },
  });
}

export function useClearCart(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<void>('/cart/clear', {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}
