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
    queryFn: () => apiClient<DashboardOrderStats[]>('/dashboard/orders', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useTopProducts(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.topProducts(),
    queryFn: () => apiClient<TopProduct[]>('/dashboard/top-products', { token }),
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

export function usePeakHours(token: string | null) {
  return useQuery({
    queryKey: dashboardKeys.peakHours(),
    queryFn: () => apiClient<PeakHourData[]>('/dashboard/peak-hours', { token }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
