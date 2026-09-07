'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type {
  Paginated,
  AdminClientListItem,
  AdminClientLoyalty,
  AdminClientReferral,
  ReferralReward,
  ReferralRewardStatus,
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


// ─── Écritures d'administration sur la fidélité ────────────────────────────

export const referralRewardKeys = {
  all: ['admin', 'referral-rewards'] as const,
  list: (status: ReferralRewardStatus | 'ALL', page: number) =>
    [...referralRewardKeys.all, status, page] as const,
};

/**
 * Ajustement manuel d'un solde de fidélité.
 *
 * Le motif est obligatoire côté serveur (5 caractères minimum) : c'est la seule
 * chose qui rendra l'écriture relisible dans six mois, et un champ facultatif
 * reste vide dans la plupart des cas. Chaque appel écrit une ligne de ledger
 * nominative **et** une entrée au journal d'audit.
 */
export function useAdjustClientLoyalty(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      clientId,
      points,
      reason,
    }: {
      clientId: string;
      points: number;
      reason: string;
    }) =>
      apiClient<{ balance: number; points: number; reason: string }>(
        `/admin/clients/${clientId}/loyalty/adjust`,
        { method: 'POST', token, body: JSON.stringify({ points, reason }) },
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminClientKeys.loyalty(variables.clientId),
      });
      void queryClient.invalidateQueries({ queryKey: adminClientKeys.all });
    },
  });
}

/**
 * File des récompenses de parrainage arbitrées.
 *
 * `status: 'PENDING_REVIEW'` donne les récompenses que le scoring anti-abus a
 * retenues sans les refuser — celles qui attendent une décision humaine.
 */
export function useReferralRewards(
  token: string | null,
  status: ReferralRewardStatus | 'ALL' = 'PENDING_REVIEW',
  page = 1,
) {
  return useQuery({
    queryKey: referralRewardKeys.list(status, page),
    queryFn: () =>
      apiClientRaw<Paginated<ReferralReward>>(
        `/admin/referral-rewards?page=${page}&limit=20${status === 'ALL' ? '' : `&status=${status}`}`,
        { token },
      ),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Arbitrage humain d'une récompense `PENDING_REVIEW`. */
export function useReviewReferralReward(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rewardId,
      decision,
      note,
    }: {
      rewardId: string;
      decision: 'APPROVE' | 'REJECT';
      note?: string;
    }) =>
      apiClient<{ id: string; decision: string; points: number }>(
        `/admin/referral-rewards/${rewardId}/review`,
        { method: 'POST', token, body: JSON.stringify({ decision, note }) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: referralRewardKeys.all });
    },
  });
}
