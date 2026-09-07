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
      return { ...cart, items: Array.isArray(cart.items) ? cart.items : [] };
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

/**
 * Ajoute un **menu du jour** au panier — `POST /cart/add-menu`.
 *
 * La route existait côté serveur depuis toujours et n'avait **aucun appelant
 * web** : l'administration savait composer des menus, l'application Flutter
 * savait les afficher, le site les ignorait entièrement. Un vendeur qui
 * composait un COMBO le voyait sur mobile et pas sur son propre site, où il
 * n'était de toute façon pas commandable.
 *
 * ⚠️ Un menu n'est pas un produit : il porte **son** prix (`MenuDuJour.prix`),
 * pas la somme de ses composants, et **son** stock. Ne jamais l'ajouter comme
 * une suite de produits individuels — le sous-total serait faux, et le serveur
 * facture le prix du menu (`OrderCalculatorService`).
 */
export function useAddMenuToCart(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { menuId: string; quantite: number }) =>
      apiClient<Cart>('/cart/add-menu', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
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
