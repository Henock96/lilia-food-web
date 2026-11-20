'use client';
import type { AuthCredential } from '../auth-session';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '../session-query';
import type {
  AdminCancelReservationResult,
  AdminNoShowSettlement,
  AdminReservationDetail,
  AdminReservationList,
  ApprovalRequested,
  NoShowPayoutState,
  ReservationStatus,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';
import { approvalKeys } from './approvals';

/**
 * D-6 — réservations sur place, vues du support.
 *
 * Le serveur décide de tout : `allowedActions` dit si une réservation
 * s'annule, `payoutState` si une part d'absence est due. L'écran n'a aucune
 * règle à rejouer.
 */

export interface AdminReservationFilters {
  restaurantId?: string;
  status?: ReservationStatus | '';
  /** Jour civil de Brazzaville, AAAA-MM-JJ. */
  date?: string;
  page: number;
}

export const adminReservationKeys = {
  all: ['admin', 'reservations'] as const,
  list: (f: AdminReservationFilters) => ['admin', 'reservations', 'list', f] as const,
  detail: (id: string) => ['admin', 'reservations', 'detail', id] as const,
  noShows: (state: string) => ['admin', 'reservation-no-shows', state] as const,
  noShowsAll: ['admin', 'reservation-no-shows'] as const,
};

/** Construit la requête de `GET /admin/reservations` (testée). */
export function adminReservationsPath(f: AdminReservationFilters, limit = 20): string {
  const params = new URLSearchParams({ page: String(f.page), limit: String(limit) });
  if (f.restaurantId) params.set('restaurantId', f.restaurantId);
  if (f.status) params.set('status', f.status);
  if (f.date) params.set('date', f.date);
  return `/admin/reservations?${params.toString()}`;
}

export function useAdminReservations(token: AuthCredential | null, filters: AdminReservationFilters) {
  return useQuery({
    queryKey: adminReservationKeys.list(filters),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClientRaw<AdminReservationList>(adminReservationsPath(filters), { signal, token }),
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useAdminReservation(token: AuthCredential | null, id: string) {
  return useQuery({
    queryKey: adminReservationKeys.detail(id),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<AdminReservationDetail>(`/admin/reservations/${id}`, { signal, token }),
    enabled: !!token && !!id,
    staleTime: 15 * 1000,
  });
}

/**
 * Annulation par le support (`POST /admin/reservations/:id/cancel`).
 *
 * Aucun argent ne part ici : si la réservation était payée, le remboursement
 * intégral est écrit dans la file admin (quatre yeux au-delà du seuil). Second
 * facteur exigé : le dialogue d'identité s'ouvre sur le 403 correspondant.
 */
export function useAdminCancelReservation(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<AdminCancelReservationResult>(`/admin/reservations/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
        token,
      }),
    onSuccess: (_r, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminReservationKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: adminReservationKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReservationKeys.noShowsAll });
    },
  });
}

/** Absences et état de la part restaurant (`GET /admin/reservation-no-shows`). */
export function useAdminNoShows(token: AuthCredential | null, state: NoShowPayoutState | '') {
  return useQuery({
    queryKey: adminReservationKeys.noShows(state),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => {
      const params = new URLSearchParams({ limit: '100' });
      if (state) params.set('state', state);
      return apiClient<AdminNoShowSettlement[]>(
        `/admin/reservation-no-shows?${params.toString()}`,
        { signal, token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * Demande de versement de la part restaurant d'une absence.
 *
 * ⚠️ Rien ne part au clic : la demande ouvre une approbation, et le virement
 * part à la validation d'un **second** administrateur (`/approbations`,
 * `FINANCE_APPROVE` + MFA). Le serveur refuse (409) un compte absent, non
 * vérifié, en cours de changement, ou un versement déjà actif.
 */
export function useRequestNoShowPayout(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settlementId: string) =>
      apiClient<ApprovalRequested>(`/admin/reservation-no-shows/${settlementId}/payout`, {
        method: 'POST',
        body: JSON.stringify({}),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminReservationKeys.noShowsAll });
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
