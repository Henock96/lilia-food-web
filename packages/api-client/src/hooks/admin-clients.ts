'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type {
  Paginated,
  AdminClientListItem,
  AdminClientLoyalty,
  AdminClientReferral,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminClientKeys = {
  all: ['admin', 'clients'] as const,
  list: (page: number, search: string) =>
    [...adminClientKeys.all, 'list', page, search] as const,
  loyalty: (clientId: string | null) =>
    [...adminClientKeys.all, clientId, 'loyalty'] as const,
  referral: (clientId: string | null) =>
    [...adminClientKeys.all, clientId, 'referral'] as const,
};

export const restaurantClientKeys = {
  all: ['restaurant', 'clients'] as const,
  list: (restaurantId: string | undefined) =>
    [...restaurantClientKeys.all, 'list', restaurantId] as const,
  orders: (restaurantId: string | undefined, clientId: string | null) =>
    [...restaurantClientKeys.all, restaurantId, clientId, 'orders'] as const,
};

/** Client distinct d'un restaurant (GET /restaurants/:id/clients). */
export interface RestaurantClient {
  id: string;
  nom: string | null;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  role: string;
  createdAt: string;
}

/** Commande d'un client pour un restaurant donné. */
export interface RestaurantClientOrder {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: { quantite: number; prix: number; product: { nom: string } | null }[];
}

/**
 * Normalise la réponse de `GET /restaurants/:id/clients`.
 *
 * Le service renvoie `{ data: User[], total, page, limit }` (forme legacy non
 * migrée meta). Selon que l'`ApiResponseInterceptor` v2 est actif ou non, on
 * reçoit soit cette forme brute, soit une version double-enveloppée
 * `{ data: { data: User[], total } }`. On tolère les deux.
 */
function normalizeRestaurantClients(res: unknown): {
  clients: RestaurantClient[];
  total: number;
} {
  const r = res as { data?: unknown; total?: number } | undefined;
  const lvl1 = r?.data;
  if (Array.isArray(lvl1)) {
    return { clients: lvl1 as RestaurantClient[], total: r?.total ?? lvl1.length };
  }
  const inner = lvl1 as { data?: unknown; total?: number } | undefined;
  if (Array.isArray(inner?.data)) {
    return {
      clients: inner!.data as RestaurantClient[],
      total: inner!.total ?? inner!.data.length,
    };
  }
  return { clients: [], total: 0 };
}

/**
 * Clients d'un restaurant pour la vue RESTAURATEUR (LIL-107).
 *
 * L'endpoint scoped ne supporte ni `search` ni pagination meta — on charge un
 * lot généreux (limit 200, suffisant à l'échelle MVP Brazzaville) et la
 * recherche + pagination se font côté front. ADMIN passe par `useAdminClients`.
 */
export function useRestaurantClients(
  token: string | null,
  restaurantId: string | undefined,
) {
  return useQuery({
    queryKey: restaurantClientKeys.list(restaurantId),
    queryFn: async () => {
      const res = await apiClientRaw<unknown>(
        `/restaurants/${restaurantId}/clients?page=1&limit=200`,
        { token },
      );
      return normalizeRestaurantClients(res);
    },
    enabled: !!token && !!restaurantId,
    staleTime: 60 * 1000,
  });
}

/** Commandes d'un client pour ce restaurant (GET /restaurants/:id/clients/:userId/orders). */
export function useRestaurantClientOrders(
  restaurantId: string | undefined,
  clientId: string | null,
  token: string | null,
) {
  return useQuery({
    queryKey: restaurantClientKeys.orders(restaurantId, clientId),
    queryFn: () =>
      // `findClientWithOrders` renvoie `{ data, message }` (conforme v2) →
      // `apiClient` déballe le tableau de commandes.
      apiClient<RestaurantClientOrder[]>(
        `/restaurants/${restaurantId}/clients/${clientId}/orders`,
        { token },
      ),
    enabled: !!token && !!restaurantId && !!clientId,
    staleTime: 60 * 1000,
  });
}

/** Liste clients paginée + recherche (GET /admin/clients). */
export function useAdminClients(
  token: string | null,
  page: number,
  search: string,
) {
  return useQuery({
    queryKey: adminClientKeys.list(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      // Contrat v2 : `{ data, meta }` préservé via apiClientRaw.
      return apiClientRaw<Paginated<AdminClientListItem>>(
        `/admin/clients?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Solde + historique de fidélité d'un client (GET /admin/clients/:id/loyalty). */
export function useClientLoyalty(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.loyalty(clientId),
    queryFn: () =>
      apiClient<AdminClientLoyalty>(`/admin/clients/${clientId}/loyalty`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/** Stats de parrainage d'un client (GET /admin/clients/:id/referral). */
export function useClientReferral(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.referral(clientId),
    queryFn: () =>
      apiClient<AdminClientReferral>(`/admin/clients/${clientId}/referral`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}
