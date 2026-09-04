'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '@lilia/types';
import { apiClient, apiClientRaw, MAX_PAGE_SIZE } from '../client';

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

/**
 * Nombre de pages que le back-office accepte d'enchaîner sur un catalogue.
 *
 * Une boucle « tant qu'il reste des pages » sur une réponse serveur est une
 * boucle pilotée de l'extérieur : un `totalPages` aberrant y suffirait à figer
 * l'onglet. Le plafond la rend finie, et il est assez haut (5 000 produits)
 * pour qu'aucun vendeur de Brazzaville ne le rencontre.
 */
const MAX_CATALOG_PAGES = 50;

/**
 * Catalogue **du gestionnaire** — `GET /products/manage`, authentifié.
 *
 * Il lisait auparavant `GET /products?restaurantId=…&limit=200`, c'est-à-dire
 * le catalogue **client**. Deux défauts distincts en découlaient :
 *
 * 1. `limit=200` dépasse la borne de pagination du serveur (100) : la requête
 *    répondait **400 sur chaque vendeur**, et le `?? []` traduisait ce refus en
 *    « aucun produit ». La page produits, l'étape catalogue de l'onboarding et
 *    le composeur de menus étaient vides quoi qu'il y ait en base ;
 * 2. même sous la borne, la route publique masque ce qu'un gestionnaire doit
 *    précisément voir : produits indisponibles, hors fenêtre horaire, et tout
 *    le catalogue d'un vendeur suspendu ou encore en `DRAFT`.
 *
 * On pagine jusqu'au bout plutôt que de demander une grande page : un catalogue
 * tronqué en silence est ce qui a produit ce bug, pas ce qui le corrige.
 */
type ProductPage = { data: Product[]; meta?: { totalPages?: number } };

/**
 * Options React Query du catalogue gestionnaire.
 *
 * Extraites du hook pour être **exécutables sans React** : le défaut corrigé ici
 * était une URL — un `limit` hors bornes — et rien dans le dépôt ne pouvait
 * l'attraper tant que la requête vivait dans une closure de `useQuery`.
 * `products.contract.test.ts` appelle directement `queryFn`.
 */
export function ownerCatalogQueryOptions(
  restaurantId: string | undefined,
  token: string | null,
  fetchPage: (path: string) => Promise<ProductPage> = (path) =>
    apiClientRaw<ProductPage>(path, { token }),
) {
  return {
    queryKey: productKeys.list(restaurantId),
    queryFn: async (): Promise<Product[]> => {
      const all: Product[] = [];
      for (let page = 1; page <= MAX_CATALOG_PAGES; page++) {
        const res = await fetchPage(
          `/products/manage?restaurantId=${restaurantId}&page=${page}&limit=${MAX_PAGE_SIZE}`,
        );
        all.push(...(res.data ?? []));
        // Pas de `meta` → une seule page. Un backend antérieur à la route ne
        // doit pas faire boucler un client à jour.
        if (page >= (res.meta?.totalPages ?? 1)) break;
      }
      return all;
    },
    enabled: !!restaurantId && !!token,
    staleTime: 60 * 1000,
  };
}

export function useProducts(restaurantId: string | undefined, token: string | null) {
  return useQuery(ownerCatalogQueryOptions(restaurantId, token));
}

// `useCategories` vivait ici, sans jeton et sur l'ancien contrat global. Il est
// désormais dans `hooks/categories.ts` : la route est authentifiée (une section
// appartient à un vendeur, il faut savoir lequel demande) et deux définitions
// du même hook exportées par le même paquet finissaient par diverger.

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

/**
 * Retire ou remet un produit à la vente (`PATCH /products/:id/availability`).
 *
 * La route existe côté serveur depuis le fix M2 d'août 2026 et **aucun client
 * ne l'appelait** : `isAvailable` n'était modifiable par personne. Le seul
 * levier restant était `stockQuotidien = 0`, qui affiche « épuisé » — ce qui
 * n'est pas la même information qu'« indisponible » pour le client.
 *
 * ⚠️ Ce bouton n'a de sens que sur la vue back-office (`/products/manage`) :
 * sur le catalogue public, le produit disparaît dès qu'il est marqué
 * indisponible, emportant avec lui le bouton qui le réactive.
 */
export function useSetProductAvailability(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      apiClient<Product>(`/products/${id}/availability`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isAvailable }),
      }),
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
