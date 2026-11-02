'use client';
import type { AuthCredential } from '../auth-session';

import { useMutation, useQuery, useQueryClient } from '../session-query';
import type {
  AdminAccount,
  AdminCapability,
  ApprovalRequested,
  ApprovalStatus,
  FinancialApproval,
  FinancialSettingsChangePayload,
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
  token: AuthCredential | null,
  status: ApprovalStatus | 'ALL' = 'PENDING',
) {
  return useQuery({
    queryKey: approvalKeys.list(status),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<FinancialApproval[]>(
        status === 'ALL' ? '/admin/approvals' : `/admin/approvals?status=${status}`,
        { signal, token },
      ),
    enabled: !!token,
    refetchInterval: 60_000,
  });
}

/** Approuver EXÉCUTE le geste (numéro appliqué, remboursement envoyé…). */
export function useApproveApproval(token: AuthCredential | null) {
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
export function useRejectApproval(token: AuthCredential | null) {
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

export function useAdminAccounts(token: AuthCredential | null) {
  return useQuery({
    queryKey: approvalKeys.admins,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<AdminAccount[]>('/admin/admins', { signal, token }),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

/** Demander un changement de capacités : rien ne change avant un second admin. */
export function useRequestCapabilities(token: AuthCredential | null) {
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

/**
 * R-09 — demander un changement des réglages qui fixent de l'argent (frais,
 * commission par défaut, points, versements, tarification). Rien ne change
 * avant l'approbation d'un second administrateur.
 */
export function useRequestFinancialSettingsChange(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: FinancialSettingsChangePayload) =>
      apiClient<ApprovalRequested>('/admin/platform-settings/financial-change', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}

/** R-09 — demander une nouvelle commission pour un vendeur (`null` = taux plateforme). */
export function useRequestVendorCommissionChange(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      vendorId,
      commissionPercent,
    }: {
      vendorId: string;
      commissionPercent: number | null;
    }) =>
      apiClient<ApprovalRequested>(`/admin/vendors/${vendorId}/commission-change`, {
        method: 'POST',
        token,
        body: JSON.stringify({ commissionPercent }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
    },
  });
}
