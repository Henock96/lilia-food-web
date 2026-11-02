'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '../session-query';
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
  UpdatePlatformSettingsPayload,
} from '@lilia/types';
import { ApiError, apiClient, apiClientRaw } from '../client';
import { pricingKeys } from './pricing';

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
export function useAdminPayments(token: AuthCredential | null, page: number, status: string) {
  return useQuery({
    queryKey: adminOpsKeys.payments(page, status),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      // Contrat v2 : backend renvoie `{ data, meta }` (interceptor règle 3b).
      // `apiClientRaw` préserve l'enveloppe (liste dans `data`, pagination
      // dans `meta`).
      return apiClientRaw<Paginated<AdminPayment>>(`/admin/payments?${params.toString()}`, { signal, token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** KPI paiements (GET /admin/payments/stats). */
export function usePaymentsStats(token: AuthCredential | null) {
  return useQuery({
    queryKey: adminOpsKeys.paymentsStats,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<PaymentsStats>('/admin/payments/stats', { signal, token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/**
 * Confirmation manuelle d'un paiement (POST /payments/:id/confirm).
 *
 * ⚠️ **Réservée aux encaissements dont le provider est `MANUAL`** — un virement
 * que le client a effectué lui-même et que l'administrateur vient de retrouver.
 * Le serveur refuse en 409 `PAYMENT_NOT_MANUAL` sur tout autre rail : confirmer
 * un dépôt pawaPay encore en vol déclarerait payée une commande pour laquelle
 * rien n'a été débité, et le refus qui arriverait ensuite ne pourrait plus rien
 * défaire. Sur ces paiements-là, le geste est {@link useReconcilePayment}.
 */
export function useConfirmPayment(token: AuthCredential | null) {
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

/**
 * Force une interrogation du prestataire et applique son verdict
 * (POST /payments/:id/reconcile).
 *
 * C'est le geste de rattrapage sur un encaissement confié à un opérateur :
 * quand un callback s'est perdu et que le cron n'a pas encore tranché.
 * L'administrateur ne décide de rien — il demande à l'opérateur, qui seul sait
 * si l'argent est arrivé.
 */
export function useReconcilePayment(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      apiClient<{ status: string }>(`/payments/${paymentId}/reconcile`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      void queryClient.invalidateQueries({ queryKey: adminOpsKeys.paymentsStats });
    },
  });
}

/**
 * Rejet manuel d'un paiement (POST /payments/:id/reject).
 * La commande reste EN_ATTENTE côté backend : le client peut réessayer.
 * `reason` optionnel (virement non retrouvé par défaut).
 *
 * ⚠️ Même restriction que {@link useConfirmPayment} : refusé sur un
 * encaissement confié à un prestataire. Le figer en `CANCELLED` ferait compter
 * comme doublon le `COMPLETED` qui arriverait ensuite — client débité, commande
 * jamais confirmée.
 */
export function useRejectPayment(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason?: string }) =>
      apiClient<unknown>(`/payments/${paymentId}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
      void queryClient.invalidateQueries({ queryKey: adminOpsKeys.paymentsStats });
    },
  });
}

/** Livreurs paginés (GET /admin/deliverers). */
export function useAdminDeliverers(token: AuthCredential | null, page: number) {
  return useQuery({
    queryKey: adminOpsKeys.deliverers(page),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      // Contrat v2 : `{ data, meta }` préservé via apiClientRaw.
      return apiClientRaw<Paginated<AdminDeliverer>>(`/admin/deliverers?${params.toString()}`, { signal, token });
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
export function useDelivererStats(token: AuthCredential | null, id: string) {
  return useQuery({
    queryKey: adminOpsKeys.delivererStats(id),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<DelivererStats>(`/admin/deliverers/${id}/stats`, { signal, token }),
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
  token: AuthCredential | null,
  id: string,
  options: { status?: DeliveryStatus | ''; page: number; limit?: number } = { page: 1 },
) {
  const { status = '', page, limit = 20 } = options;
  return useQuery({
    queryKey: adminOpsKeys.delivererMissions(id, page, status),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (status) params.set('status', status);
      return apiClientRaw<PaginatedDelivererMissions>(
        `/admin/deliverers/${id}/missions?${params.toString()}`,
        { signal, token },
      );
    },
    enabled: !!token && !!id,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/** Référentiel des quartiers (GET /quartiers). */
export function useAdminQuartiers(token: AuthCredential | null) {
  return useQuery({
    queryKey: adminOpsKeys.quartiers,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<Quartier[]>('/quartiers', { signal, token }),
    enabled: !!token,
    staleTime: 10 * 60 * 1000,
  });
}

/** Configuration plateforme (GET /admin/platform-settings). */
export function usePlatformSettings(token: AuthCredential | null) {
  return useQuery({
    queryKey: adminOpsKeys.platformSettings,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<PlatformSettings>('/admin/platform-settings', { signal, token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Mise à jour de la configuration plateforme (PATCH /admin/platform-settings). */
export function useUpdatePlatformSettings(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdatePlatformSettingsPayload) =>
      apiClient<PlatformSettings>('/admin/platform-settings', {
        method: 'PATCH',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(adminOpsKeys.platformSettings, data);
      // Les écrans qui lisent la vue publique (fidélité, parrainage) dans ce
      // même back-office doivent voir la nouvelle valeur sans attendre 5 min.
      void queryClient.invalidateQueries({ queryKey: pricingKeys.platformSettings });
    },
    onError: (error) => {
      // 409 : la configuration a bougé depuis le chargement. Relire tout de
      // suite, pour que « Recharger » montre les valeurs de l'autre admin.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminOpsKeys.platformSettings });
      }
    },
  });
}
