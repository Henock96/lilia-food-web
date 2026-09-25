'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminAccount,
  AdminCapability,
  ApprovalRequested,
  ApprovalStatus,
  FinancialApproval,
} from '@lilia/types';
import { apiClient } from '../client';

export const approvalKeys = {
  all: ['admin', 'approvals'] as const,
  list: (status: ApprovalStatus | 'ALL') =>
    [...approvalKeys.all, 'list', status] as const,
  admins: ['admin', 'admins'] as const,
};

/**
 * Gestes financiers à deux administrateurs (F3-08). La file est relue chaque
 * minute : une demande non traitée expire au bout de 24 h.
 */
export function useApprovals(
  token: string | null,
  status: ApprovalStatus | 'ALL' = 'PENDING',
) {
  return useQuery({
    queryKey: approvalKeys.list(status),
    queryFn: () =>
      apiClient<FinancialApproval[]>(
        status === 'ALL' ? '/admin/approvals' : `/admin/approvals?status=${status}`,
        { token },
      ),
    enabled: !!token,
    refetchInterval: 60_000,
  });
}

/** Approuver EXÉCUTE le geste (numéro appliqué, remboursement envoyé…). */
export function useApproveApproval(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<unknown>(`/admin/approvals/${id}/approve`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

/** Refuser (autre admin) ou retirer sa propre demande. Motif obligatoire. */
export function useRejectApproval(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<unknown>(`/admin/approvals/${id}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

export function useAdminAccounts(token: string | null) {
  return useQuery({
    queryKey: approvalKeys.admins,
    queryFn: () => apiClient<AdminAccount[]>('/admin/admins', { token }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

/** Demander un changement de capacités : rien ne change avant un second admin. */
export function useRequestCapabilities(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      capabilities,
    }: {
      userId: string;
      capabilities: AdminCapability[];
    }) =>
      apiClient<ApprovalRequested>(`/admin/users/${userId}/capabilities`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ capabilities }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
