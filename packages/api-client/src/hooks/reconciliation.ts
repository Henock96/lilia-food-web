'use client';
import type { AuthCredential } from '../auth-session';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '../session-query';
import type {
  ReconciliationItem,
  ReconciliationItemsPage,
  ReconciliationProviderRow,
  ReconciliationResolutionKind,
  ReconciliationRunReport,
  ReconciliationSummary,
} from '@lilia/types';

import { apiClient } from '../client';

export const reconciliationKeys = {
  all: ['admin', 'reconciliation'] as const,
  summary: ['admin', 'reconciliation', 'summary'] as const,
  items: (status: 'OPEN' | 'RESOLVED') =>
    ['admin', 'reconciliation', 'items', status] as const,
  item: (id: string) => ['admin', 'reconciliation', 'item', id] as const,
};

/**
 * Rapprochement Lilia ↔ prestataire (lot 2, 30/10/2026). Le serveur décide
 * de tout : type d'écart, gravité, blocage des versements. Cette surface
 * affiche ses verdicts et transmet les gestes humains (résoudre, noter).
 */
export function useReconciliationSummary(token: AuthCredential | null) {
  return useQuery({
    queryKey: reconciliationKeys.summary,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<ReconciliationSummary>('/admin/reconciliation/summary', { signal,
        token,
      }),
    enabled: !!token,
  });
}

export function useReconciliationItems(
  token: AuthCredential | null,
  status: 'OPEN' | 'RESOLVED',
) {
  return useQuery({
    queryKey: reconciliationKeys.items(status),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<ReconciliationItemsPage>(
        `/admin/reconciliation/items?status=${status}&limit=100`,
        { signal, token },
      ),
    enabled: !!token,
  });
}

export function useReconciliationItem(token: AuthCredential | null, id: string | null) {
  return useQuery({
    queryKey: reconciliationKeys.item(id ?? ''),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<ReconciliationItem>(`/admin/reconciliation/items/${id}`, { signal,
        token,
      }),
    enabled: !!token && !!id,
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: reconciliationKeys.all });
}

export function useResolveReconciliationItem(token: AuthCredential | null) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({
      id,
      kind,
      note,
    }: {
      id: string;
      kind: ReconciliationResolutionKind;
      note: string;
    }) =>
      apiClient<ReconciliationItem>(
        `/admin/reconciliation/items/${id}/resolve`,
        { method: 'POST', token, body: JSON.stringify({ kind, note }) },
      ),
    onSuccess: invalidate,
  });
}

export function useAddReconciliationNote(token: AuthCredential | null) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiClient<unknown>(`/admin/reconciliation/items/${id}/notes`, {
        method: 'POST',
        token,
        body: JSON.stringify({ note }),
      }),
    onSuccess: invalidate,
  });
}

export function useRunReconciliationScan(token: AuthCredential | null) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () =>
      apiClient<ReconciliationRunReport>('/admin/reconciliation/scans', {
        method: 'POST',
        token,
      }),
    onSuccess: invalidate,
  });
}

export function useImportReconciliationExport(token: AuthCredential | null) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: {
      periodStart: string;
      periodEnd: string;
      walletBalanceXaf?: number | null;
      rows: ReconciliationProviderRow[];
    }) =>
      apiClient<ReconciliationRunReport>('/admin/reconciliation/imports', {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}
