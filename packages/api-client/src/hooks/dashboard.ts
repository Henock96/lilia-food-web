'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  DashboardOverview,
  DashboardOrderStats,
  TopProduct,
  RevenueDataPoint,
  PeakHourData,
  ClientStats,
  RestaurantRankingRow,
} from '@lilia/types';
import { apiClient } from '../client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  overview: () => [...dashboardKeys.all, 'overview'] as const,
  orders: () => [...dashboardKeys.all, 'orders'] as const,
  topProducts: () => [...dashboardKeys.all, 'top-products'] as const,
  revenue: () => [...dashboardKeys.all, 'revenue'] as const,
  clients: () => [...dashboardKeys.all, 'clients'] as const,
  peakHours: () => [...dashboardKeys.all, 'peak-hours'] as const,
  restaurantRanking: (period?: string) =>
    [...dashboardKeys.all, 'restaurant-ranking', period ?? 'all'] as const,
};

export interface RestaurantRankingQuery {
  token: string | null;
  /** La route est `@Roles('ADMIN')` : un vendeur y recevrait un 403. */
  isAdmin: boolean;
  period?: 'today' | 'week' | 'month' | 'year';
  /** Point d'injection des tests : la requête doit être exécutable sans React. */
  fetchRanking?: (path: string) => Promise<RestaurantRankingRow[] | undefined>;
}

/**
 * Classement des vendeurs par revenu, calculé **par le serveur**.
 *
 * ## Le défaut corrigé
 *
 * Le panneau « Revenus par restaurant » agrégeait la page de vingt commandes de
 * l'écran Commandes, groupée par `restaurantId`, et affichait le résultat sous
 * un titre qui promettait le contraire. Deux erreurs superposées : une
 * population arbitraire (les vingt dernières commandes de la plateforme), et
 * **aucun filtre de statut** — les commandes annulées y étaient comptées, seul
 * endroit du tableau de bord dans ce cas.
 *
 * `GET /dashboard/restaurant-ranking` existait, était correct, était réservé
 * ADMIN — et n'était appelé que par l'application Flutter.
 *
 * ⚠️ Reste D-1 : le serveur somme les commandes non annulées, `EN_ATTENTE`
 * comprises — donc des commandes jamais payées. La population est juste, la
 * définition du CA ne l'est pas encore.
 */
export function restaurantRankingQueryOptions({
  token,
  isAdmin,
  period,
  fetchRanking = (path) =>
    apiClient<RestaurantRankingRow[] | undefined>(path, { token }),
}: RestaurantRankingQuery) {
  return {
    queryKey: dashboardKeys.restaurantRanking(period),
    queryFn: async (): Promise<RestaurantRankingRow[]> => {
      const query = period ? `?period=${period}` : '';
      // Le tableau de bord itère directement le résultat : un `undefined` y
      // produirait un écran blanc au lieu d'un « aucune vente ».
      return (await fetchRanking(`/dashboard/restaurant-ranking${query}`)) ?? [];
    },
    enabled: !!token && isAdmin,
    staleTime: 60 * 1000,
  };
}

export function useRestaurantRanking(
  token: string | null,
  isAdmin: boolean,
  period?: 'today' | 'week' | 'month' | 'year',
) {
  return useQuery(restaurantRankingQueryOptions({ token, isAdmin, period }));
}

export function useDashboardOverview(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.overview(),
    queryFn: () => apiClient<DashboardOverview>('/dashboard/overview', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useDashboardOrderStats(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.orders(),
    queryFn: async () => {
      const res = await apiClient<DashboardOrderStats[] | { data: DashboardOrderStats[] }>('/dashboard/orders', { token });
      return Array.isArray(res) ? res : (res as { data: DashboardOrderStats[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useTopProducts(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.topProducts(),
    queryFn: async () => {
      const res = await apiClient<TopProduct[] | { data: TopProduct[] }>('/dashboard/top-products', { token });
      return Array.isArray(res) ? res : (res as { data: TopProduct[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Évolution du chiffre d'affaires — `GET /dashboard/revenue-chart`.
 *
 * ⚠️ Appelait `/dashboard/revenue`, qui n'existe pas : le graphe de revenus du
 * tableau de bord était vide en permanence, sans message d'erreur (React Query
 * garde l'état `error` sans que rien ne l'affiche).
 */
export function useRevenueChart(token: string | null, days = 30) {
  return useQuery({
    queryKey: [...dashboardKeys.revenue(), days] as const,
    queryFn: () =>
      apiClient<RevenueDataPoint[]>(`/dashboard/revenue-chart?days=${days}`, { token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientStats(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.clients(),
    queryFn: () => apiClient<ClientStats>('/dashboard/clients', { token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClientDetail(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: [...dashboardKeys.clients(), clientId] as const,
    queryFn: () => apiClient<unknown>(`/dashboard/clients/${clientId}`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePeakHours(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.peakHours(),
    queryFn: async () => {
      const res = await apiClient<PeakHourData[] | { data: PeakHourData[] }>('/dashboard/peak-hours', { token });
      return Array.isArray(res) ? res : (res as { data: PeakHourData[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
