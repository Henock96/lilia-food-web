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
 * Contrat v2 : backend renvoie `{ data, total }` normalisé en
 * `{ data, meta: { total } }` (interceptor règle 3b). `apiClientRaw` préserve
 * l'enveloppe.
 */
export function useAdminPendingVendors(token: string | null) {
  return useQuery({
    queryKey: adminVendorKeys.pending(),
    queryFn: () =>
      apiClientRaw<{ data: AdminVendor[]; meta: { total: number } }>(
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
/**
 * Lève une suspension (`isActive = true`).
 *
 * La route est passée de `/activate` à `/unsuspend` : `POST .../activate`
 * publie désormais une boutique dont l'onboarding est terminé. Annuler une
 * sanction et mettre en ligne sont deux gestes distincts, ils ne pouvaient pas
 * garder le même nom.
 */
export function useUnsuspendVendor(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vendorId: string) =>
      apiClient<Restaurant>(`/admin/vendors/${vendorId}/unsuspend`, {
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

// ─── Classement et mise en avant (septembre 2026) ────────────────────────────
//
// Deux mutations distinctes pour deux notions indépendantes : `displayOrder`
// dit OÙ le vendeur apparaît, `isFeatured` s'il porte un badge. Les fondre
// obligerait à envoyer l'une pour changer l'autre.
//
// ⚠️ Ni l'une ni l'autre ne publie quoi que ce soit : la visibilité reste
// `useApproveVendor` + l'activation d'onboarding.

/** Range le vendeur dans les listes publiques (1 = premier). */
export function useSetVendorDisplayOrder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, displayOrder }: { id: string; displayOrder: number }) =>
      apiClient<Restaurant>(`/admin/vendors/${id}/display-order`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ displayOrder }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      // Le catalogue public change d'ordre : son cache doit tomber aussi.
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/** Met le vendeur en avant, ou l'en retire. */
export function useSetVendorFeatured(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) =>
      apiClient<Restaurant>(`/admin/vendors/${id}/feature`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isFeatured }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}
