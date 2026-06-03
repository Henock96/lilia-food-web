'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type {
  AdminVendor,
  AdminVendorFilters,
  AdminVendorsPage,
  CreateRestaurantWithOwnerDto,
  Restaurant,
  VendorStats,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminVendorKeys = {
  all: ['admin', 'vendors'] as const,
  list: (filters: AdminVendorFilters) =>
    [...adminVendorKeys.all, 'list', filters] as const,
  pending: () => [...adminVendorKeys.all, 'pending'] as const,
  stats: () => ['dashboard', 'vendors', 'stats'] as const,
};

/**
 * Vue admin complète des vendeurs (GET /admin/vendors).
 * Inclut les non approuvés et suspendus — distincte du marketplace
 * public (`useRestaurants()`) qui filtre déjà sur approuvés + actifs.
 *
 * Backend renvoie `{ data, meta }` — on garde l'enveloppe via apiClientRaw.
 */
export function useAdminVendors(
  token: string | null,
  filters: AdminVendorFilters = {},
) {
  return useQuery({
    queryKey: adminVendorKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.vendorType) params.set('vendorType', filters.vendorType);
      if (filters.adminApproved !== undefined)
        params.set('adminApproved', String(filters.adminApproved));
      if (filters.isActive !== undefined)
        params.set('isActive', String(filters.isActive));
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      return apiClientRaw<AdminVendorsPage>(
        `/admin/vendors?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * Raccourci pour le badge "à valider" (GET /admin/vendors/pending).
 * Backend renvoie `{ data, total }` → wrap global → `{ data: { data, total } }`.
 * `apiClient` déballe le wrap → on récupère `{ data, total }`.
 */
export function useAdminPendingVendors(token: string | null) {
  return useQuery({
    queryKey: adminVendorKeys.pending(),
    queryFn: () =>
      apiClient<{ data: AdminVendor[]; total: number }>(
        '/admin/vendors/pending',
        { token },
      ),
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

/** Approuve un vendeur en attente (PATCH /admin/vendors/:id/approve). */
export function useApproveVendor(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) =>
      apiClient<Restaurant>(`/admin/vendors/${vendorId}/approve`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.stats() });
    },
  });
}

/**
 * Suspend un vendeur (PATCH /admin/vendors/:id/suspend).
 * `reason` requis côté backend (min 5 chars).
 */
export function useSuspendVendor(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, reason }: { vendorId: string; reason: string }) =>
      apiClient<Restaurant>(`/admin/vendors/${vendorId}/suspend`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.stats() });
    },
  });
}

/**
 * Réactive un vendeur suspendu (PATCH /admin/vendors/:id/activate).
 * Inverse de `useSuspendVendor` — remet `isActive=true`.
 */
export function useActivateVendor(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) =>
      apiClient<Restaurant>(`/admin/vendors/${vendorId}/activate`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.stats() });
    },
  });
}

/**
 * Crée un restaurant + son owner en une seule requête
 * (POST /admin/restaurants). Avec vendorType non-RESTAURANT le vendeur
 * est créé adminApproved=false, à valider via useApproveVendor.
 */
export function useCreateRestaurantWithOwner(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRestaurantWithOwnerDto) =>
      apiClient<Restaurant>('/admin/restaurants', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/** Stats marketplace pour l'admin dashboard (GET /dashboard/vendors). */
export function useVendorStats(token: string | null) {
  return useQuery({
    queryKey: adminVendorKeys.stats(),
    queryFn: () => apiClient<VendorStats>('/dashboard/vendors', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}
