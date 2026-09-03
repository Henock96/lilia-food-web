'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AdminDriverDetail,
  AdminDriverListItem,
  CreateDriverDto,
  DriverFilters,
  Paginated,
  UpdateDriverDto,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

/**
 * Gestion des livreurs (`/admin/drivers`).
 *
 * Ces routes n'existaient pas avant septembre 2026 : mettre un livreur en
 * service supposait de lui faire créer un compte CLIENT dans l'application
 * grand public, puis d'appeler `PATCH /admin/users/:id/role` depuis Postman.
 * Aucune interface ne le faisait.
 */
export const adminDriverKeys = {
  all: ['admin', 'drivers'] as const,
  list: (filters: DriverFilters) =>
    [...adminDriverKeys.all, 'list', filters] as const,
  detail: (id: string) => [...adminDriverKeys.all, 'detail', id] as const,
};

export function useAdminDrivers(
  token: string | null,
  filters: DriverFilters = {},
) {
  return useQuery({
    queryKey: adminDriverKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.isActive !== undefined)
        params.set('isActive', String(filters.isActive));
      if (filters.driverStatus) params.set('driverStatus', filters.driverStatus);
      if (filters.statusUser) params.set('statusUser', filters.statusUser);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      return apiClientRaw<Paginated<AdminDriverListItem>>(
        `/admin/drivers?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useAdminDriver(token: string | null, id: string | null) {
  return useQuery({
    queryKey: adminDriverKeys.detail(id ?? ''),
    queryFn: () => apiClient<AdminDriverDetail>(`/admin/drivers/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

/**
 * Création d'un livreur.
 *
 * La réponse porte `invitation` : quand l'e-mail n'a pas pu partir, le serveur
 * y remet le lien d'activation pour que l'administrateur le transmette
 * lui-même. C'est un repli assumé — l'alternative serait un livreur sans accès
 * et personne pour le débloquer.
 */
export function useCreateDriver(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDriverDto) =>
      apiClient<
        AdminDriverDetail & {
          invitation?: { emailSent: boolean; activationLink?: string; detail: string };
        }
      >('/admin/drivers', { method: 'POST', token, body: JSON.stringify(dto) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminDriverKeys.all });
    },
  });
}

export function useUpdateDriver(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDriverDto }) =>
      apiClient<AdminDriverDetail>(`/admin/drivers/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: adminDriverKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminDriverKeys.all });
    },
  });
}

/** Met le livreur en service. Refusé par le serveur si son compte est suspendu. */
export function useActivateDriver(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<AdminDriverDetail>(`/admin/drivers/${id}/activate`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: adminDriverKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminDriverKeys.all });
    },
  });
}

/** Retire le livreur de la file d'assignation. Refusé s'il a une course en cours. */
export function useDeactivateDriver(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient<AdminDriverDetail>(`/admin/drivers/${id}/deactivate`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: adminDriverKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminDriverKeys.all });
    },
  });
}

export function useResendDriverInvitation(token: string | null) {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{ emailSent: boolean; activationLink?: string; detail: string }>(
        `/admin/drivers/${id}/resend-invitation`,
        { method: 'POST', token },
      ),
  });
}
