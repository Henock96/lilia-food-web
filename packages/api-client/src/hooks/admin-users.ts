'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AdminUserDetail,
  AdminUserFilters,
  AdminUserListItem,
  PaginatedResponse,
  Role,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

/**
 * Gestion des comptes (`/admin/users`).
 *
 * Ces endpoints existaient, étaient testés et audités — et **n'avaient aucun
 * appelant** dans les trois back-offices. Changer un rôle ou bannir un compte
 * supposait un appel HTTP à la main. Or le bannissement est le seul geste qui
 * révoque une session immédiatement : sans interface, il n'y avait aucune
 * réponse opérationnelle à un compte compromis.
 */
export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  list: (filters: AdminUserFilters) =>
    [...adminUserKeys.all, 'list', filters] as const,
  detail: (id: string) => [...adminUserKeys.all, 'detail', id] as const,
};

export function useAdminUsers(
  token: string | null,
  filters: AdminUserFilters = {},
) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.role) params.set('role', filters.role);
      if (filters.statusUser) params.set('statusUser', filters.statusUser);
      if (filters.search) params.set('search', filters.search);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 20));
      // `GET /admin/users` répond `{ data, total, page, limit }` — forme
      // historique, non encore migrée vers `meta`. D'où `apiClientRaw`.
      return apiClientRaw<PaginatedResponse<AdminUserListItem>>(
        `/admin/users?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useAdminUser(token: string | null, id: string | null) {
  return useQuery({
    queryKey: adminUserKeys.detail(id ?? ''),
    queryFn: () => apiClient<AdminUserDetail>(`/admin/users/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

/**
 * Changement de rôle.
 *
 * Le serveur refuse (409) si le compte tient une boutique ou porte une course
 * en cours — l'interface doit donc **afficher** le message plutôt que de
 * prétendre avoir réussi. Les caches livreurs et vendeurs sont invalidés :
 * un changement de rôle déplace le compte d'une liste à l'autre.
 */
export function useUpdateUserRole(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiClient<{ id: string; role: Role }>(`/admin/users/${id}/role`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role }),
      }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'vendors'] });
    },
  });
}

/**
 * Bannissement : `statusUser = BLOCKED`, compte Firebase désactivé et refresh
 * tokens révoqués. Ce n'est **pas** une suppression — les commandes et
 * paiements du compte restent intacts.
 */
export function useBanUser(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClientRaw<{ message: string }>(`/admin/users/${id}/ban`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });
}

export function useUnbanUser(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClientRaw<{ message: string }>(`/admin/users/${id}/unban`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: adminUserKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: adminUserKeys.all });
      void qc.invalidateQueries({ queryKey: ['admin', 'drivers'] });
    },
  });
}
