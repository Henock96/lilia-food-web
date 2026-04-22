'use client';

import { useQuery } from '@tanstack/react-query';
import type {
  DashboardOverview,
  DashboardOrderStats,
  TopProduct,
  RevenueDataPoint,
  PeakHourData,
  ClientStats,
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
};

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

export function useRevenueChart(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.revenue(),
    queryFn: () => apiClient<RevenueDataPoint[]>('/dashboard/revenue', { token }),
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
