'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery, useMutation, useQueryClient } from '../session-query';
import type { Cart, AddToCartDto } from '@lilia/types';
import { apiClient, ApiError } from '../client';

export const cartKeys = {
  all: ['cart'] as const,
  detail: () => [...cartKeys.all, 'detail'] as const,
};

export function cartQueryOptions(token: AuthCredential | null) {
  return {
    queryKey: cartKeys.detail(),
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}) => {
      const cart = await apiClient<Cart>('/cart', { signal, token });
      if (!cart || !Array.isArray(cart.items)) {
        throw new ApiError(502, 'Le panier reçu est incomplet. Réessayez.', 'INVALID_CART');
      }
      return cart;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  };
}

export function useCart(token: AuthCredential | null) {
  return useQuery(cartQueryOptions(token));
}

export function useAddToCart(token: AuthCredential | null) {
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
export function useAddMenuToCart(token: AuthCredential | null) {
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

export function useUpdateCartItem(token: AuthCredential | null) {
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

export function useRemoveCartItem(token: AuthCredential | null) {
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

export function useClearCart(token: AuthCredential | null) {
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
