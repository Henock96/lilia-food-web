'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type {
  Paginated,
  AdminPayment,
  AdminDeliverer,
  DelivererStats,
  DeliveryStatus,
  PaginatedDelivererMissions,
  PaymentsStats,
  Quartier,
  PlatformSettings,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminOpsKeys = {
  payments: (page: number, status: string) => ['admin', 'payments', page, status] as const,
  paymentsStats: ['admin', 'payments', 'stats'] as const,
  deliverers: (page: number) => ['admin', 'deliverers', page] as const,
  delivererStats: (id: string) => ['admin', 'deliverers', id, 'stats'] as const,
  delivererMissions: (id: string, page: number, status: DeliveryStatus | '') =>
    ['admin', 'deliverers', id, 'missions', page, status] as const,
  quartiers: ['admin', 'quartiers'] as const,
  platformSettings: ['admin', 'platform-settings'] as const,
};

/**
 * Paiements paginés (GET /admin/payments).
 * Passer une chaîne vide pour `status` → vue "Tous statuts" côté backend.
 */
export function useAdminPayments(token: string | null, page: number, status: string) {
  return useQuery({
    queryKey: adminOpsKeys.payments(page, status),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      // `{ data, total, page, limit }` → wrap global → `{ data: { ... } }`.
      // `apiClient` déballe le wrap → on récupère le `Paginated` directement.
      return apiClient<Paginated<AdminPayment>>(`/admin/payments?${params.toString()}`, { token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** KPI paiements (GET /admin/payments/stats). */
export function usePaymentsStats(token: string | null) {
  return useQuery({
    queryKey: adminOpsKeys.paymentsStats,
    queryFn: () => apiClient<PaymentsStats>('/admin/payments/stats', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Confirmation manuelle d'un paiement (POST /payments/:id/confirm). */
export function useConfirmPayment(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiClient<unknown>(`/payments/${paymentId}/confirm`, { method: 'POST', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      void queryClient.invalidateQueries({ queryKey: adminOpsKeys.paymentsStats });
    },
  });
}

/** Livreurs paginés (GET /admin/deliverers). */
export function useAdminDeliverers(token: string | null, page: number) {
  return useQuery({
    queryKey: adminOpsKeys.deliverers(page),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      // Idem payments : wrap global → `apiClient` rend le `Paginated`.
      return apiClient<Paginated<AdminDeliverer>>(`/admin/deliverers?${params.toString()}`, { token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/**
 * Stats agrégées d'un livreur (GET /admin/deliverers/:id/stats).
 * Backend renvoie `{ data: DelivererStats }` — `apiClient` unwrap.
 */
export function useDelivererStats(token: string | null, id: string) {
  return useQuery({
    queryKey: adminOpsKeys.delivererStats(id),
    queryFn: () => apiClient<DelivererStats>(`/admin/deliverers/${id}/stats`, { token }),
    enabled: !!token && !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * Historique paginé des missions d'un livreur, filtrable par statut
 * (GET /admin/deliverers/:id/missions).
 *
 * `status` vide → tous statuts. Backend renvoie `{ data, meta }` —
 * `apiClientRaw` préserve les 2 niveaux sans déballer.
 */
export function useDelivererMissions(
  token: string | null,
  id: string,
  options: { status?: DeliveryStatus | ''; page: number; limit?: number } = { page: 1 },
) {
  const { status = '', page, limit = 20 } = options;
  return useQuery({
    queryKey: adminOpsKeys.delivererMissions(id, page, status),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set('status', status);
      return apiClientRaw<PaginatedDelivererMissions>(
        `/admin/deliverers/${id}/missions?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token && !!id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** Référentiel des quartiers (GET /quartiers). */
export function useAdminQuartiers(token: string | null) {
  return useQuery({
    queryKey: adminOpsKeys.quartiers,
    queryFn: () => apiClient<Quartier[]>('/quartiers', { token }),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}

/** Configuration plateforme (GET /admin/platform-settings). */
export function usePlatformSettings(token: string | null) {
  return useQuery({
    queryKey: adminOpsKeys.platformSettings,
    queryFn: () => apiClient<PlatformSettings>('/admin/platform-settings', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Mise à jour de la configuration plateforme (PATCH /admin/platform-settings). */
export function useUpdatePlatformSettings(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<PlatformSettings>) =>
      apiClient<PlatformSettings>('/admin/platform-settings', {
        method: 'PATCH',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(adminOpsKeys.platformSettings, data);
    },
  });
}
