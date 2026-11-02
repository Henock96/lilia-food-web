'use client';
import type { AuthCredential } from '../auth-session';

import { useMutation, useQuery, useQueryClient } from '../session-query';
import type {
  CreateVendorClosureDto,
  PauseVendorDto,
  PublicHoliday,
  VendorOpeningState,
} from '@lilia/types';
import { apiClient } from '../client';
import { adminVendorKeys } from './admin-vendors';
import { restaurantKeys } from './restaurants';

/**
 * Fermetures qui se terminent seules (F3-03) : pause datée, congés, jours
 * fériés. Ouvert ou fermé est **décidé par le serveur** (`reason`, `until`) ;
 * aucun écran ne recompose la règle à partir des horaires.
 */
export const vendorOpeningKeys = {
  all: ['vendor-opening'] as const,
  state: (vendorId: string) => ['vendor-opening', vendorId] as const,
  holidays: ['public-holidays'] as const,
};

export function useVendorOpening(token: AuthCredential | null, vendorId: string | null) {
  return useQuery({
    queryKey: vendorOpeningKeys.state(vendorId ?? ''),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<VendorOpeningState>(`/vendors/${vendorId}/opening`, { signal, token }),
    enabled: !!token && !!vendorId,
    // Une pause se termine seule : relire régulièrement suffit à voir la
    // boutique rouvrir sans recharger la page.
    refetchInterval: 60_000,
  });
}

function useOpeningMutation<TInput, TOutput>(
  token: AuthCredential | null,
  vendorId: string,
  request: (input: TInput) => { path: string; method: string; body?: unknown },
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => {
      const { path, method, body } = request(input);
      return apiClient<TOutput>(path, {
        method,
        token,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorOpeningKeys.state(vendorId) });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
    },
  });
}

/** Réponse d'une pause ou d'un congé : combien de commandes restent à servir. */
export interface ClosureWriteResult {
  isOpen: boolean;
  inFlightOrders?: number;
}

export function usePauseVendor(token: AuthCredential | null, vendorId: string) {
  return useOpeningMutation<PauseVendorDto, ClosureWriteResult>(token, vendorId, (dto) => ({
    path: `/vendors/${vendorId}/pause`,
    method: 'POST',
    body: dto,
  }));
}

export function useResumeVendor(token: AuthCredential | null, vendorId: string) {
  return useOpeningMutation<void, ClosureWriteResult>(token, vendorId, () => ({
    path: `/vendors/${vendorId}/pause`,
    method: 'DELETE',
  }));
}

export function useCreateVendorClosure(token: AuthCredential | null, vendorId: string) {
  return useOpeningMutation<CreateVendorClosureDto, ClosureWriteResult>(
    token,
    vendorId,
    (dto) => ({ path: `/vendors/${vendorId}/closures`, method: 'POST', body: dto }),
  );
}

export function useDeleteVendorClosure(token: AuthCredential | null, vendorId: string) {
  return useOpeningMutation<string, ClosureWriteResult>(token, vendorId, (closureId) => ({
    path: `/vendors/${vendorId}/closures/${closureId}`,
    method: 'DELETE',
  }));
}

export function useSetClosedOnHolidays(token: AuthCredential | null, vendorId: string) {
  return useOpeningMutation<boolean, ClosureWriteResult>(token, vendorId, (closedOnHolidays) => ({
    path: `/vendors/${vendorId}/closed-on-holidays`,
    method: 'PATCH',
    body: { closedOnHolidays },
  }));
}

// ─── Jours fériés (ADMIN) ────────────────────────────────────────────────────

export function usePublicHolidays(token: AuthCredential | null) {
  return useQuery({
    queryKey: vendorOpeningKeys.holidays,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<PublicHoliday[]>('/admin/public-holidays', { signal, token }),
    enabled: !!token,
  });
}

export function useCreatePublicHoliday(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { date: string; label: string }) =>
      apiClient<PublicHoliday>('/admin/public-holidays', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorOpeningKeys.holidays });
      void queryClient.invalidateQueries({ queryKey: vendorOpeningKeys.all });
    },
  });
}

export function useDeletePublicHoliday(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      apiClient<void>(`/admin/public-holidays/${date}`, { method: 'DELETE', token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: vendorOpeningKeys.holidays });
      void queryClient.invalidateQueries({ queryKey: vendorOpeningKeys.all });
    },
  });
}
