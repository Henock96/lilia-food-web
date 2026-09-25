'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  ClaimDetail,
  ClaimsPage,
  ComposedRefund,
  ComposeRefundInput,
  CreateClaimInput,
  MessageVisibility,
  RefundQuote,
} from '@lilia/types';

import { apiClient, apiClientRaw } from '../client';
import { refundKeys } from './refunds';
import { payoutKeys } from './admin-payouts';

/**
 * Réclamations (F3-06).
 *
 * Une seule ressource pour trois publics : le serveur décide de la portée
 * (le client voit les siennes, le vendeur celles de sa boutique, le support
 * toutes) et des messages visibles. Rien n'est filtré ici.
 */

export const CLAIMS_PAGE_SIZE = 20;

/** Rafraîchissement du fil : pas de WebSocket client (blueprint §6). */
export const CLAIM_THREAD_POLL_MS = 30_000;

export type ClaimStateFilter = 'open' | 'closed' | 'all';

export const claimKeys = {
  all: ['claims'] as const,
  list: (scope: 'mine' | 'all', page: number, state: ClaimStateFilter) =>
    [...claimKeys.all, 'list', scope, page, state] as const,
  detail: (id: string) => [...claimKeys.all, 'detail', id] as const,
  openCount: () => [...claimKeys.all, 'open-count'] as const,
};

/** Chemin de la liste — `mine` = `GET /me/claims` (client). */
export function claimsListPath(
  scope: 'mine' | 'all',
  page: number,
  state: ClaimStateFilter,
): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(CLAIMS_PAGE_SIZE),
  });
  if (state !== 'all') params.set('state', state);
  return `${scope === 'mine' ? '/me/claims' : '/claims'}?${params.toString()}`;
}

export function useClaims(
  token: string | null,
  {
    scope = 'all',
    page = 1,
    state = 'all',
  }: { scope?: 'mine' | 'all'; page?: number; state?: ClaimStateFilter } = {},
) {
  return useQuery({
    queryKey: claimKeys.list(scope, page, state),
    queryFn: () =>
      apiClientRaw<ClaimsPage>(claimsListPath(scope, page, state), { token }),
    enabled: !!token,
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

/** Réclamations ouvertes — badge de navigation (lit `meta.total`). */
export function useOpenClaimsCount(token: string | null) {
  return useQuery({
    queryKey: claimKeys.openCount(),
    queryFn: async () => {
      const res = await apiClientRaw<Partial<ClaimsPage>>(
        '/claims?page=1&limit=1&state=open',
        { token },
      );
      return res.meta?.total ?? 0;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/** Fil d'une réclamation, rafraîchi toutes les 30 s tant qu'elle est ouverte. */
export function useClaim(token: string | null, id: string) {
  return useQuery({
    queryKey: claimKeys.detail(id),
    queryFn: () => apiClient<ClaimDetail>(`/claims/${id}`, { token }),
    enabled: !!token && !!id,
    refetchInterval: (query) =>
      query.state.data?.status === 'CLOSED' ? false : CLAIM_THREAD_POLL_MS,
  });
}

export function useOpenClaim(token: string | null, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClaimInput) =>
      apiClient<ClaimDetail>(`/orders/${orderId}/claims`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

export function usePostClaimMessage(token: string | null, claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      body: string;
      attachments?: string[];
      visibility?: MessageVisibility;
    }) =>
      apiClient<{ id: string }>(`/claims/${claimId}/messages`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

export function useIssueVoucher(token: string | null, claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { amountXaf: number; expiresInDays?: number }) =>
      apiClient<{ code: string; amountXaf: number; expiresAt: string }>(
        `/admin/claims/${claimId}/voucher`,
        { method: 'POST', token, body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

export function useRejectClaim(token: string | null, claimId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiClient<{ id: string }>(`/admin/claims/${claimId}/reject`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys.all });
    },
  });
}

// ─── Composeur de remboursement (ADMIN) ─────────────────────────────────────

/**
 * Aperçu serveur. C'est une mutation (POST, rien d'écrit) déclenchée à chaque
 * changement de sélection : le total affiché est toujours celui du serveur.
 */
export function useRefundQuote(token: string | null, orderId: string) {
  return useMutation({
    mutationFn: (input: Partial<ComposeRefundInput>) =>
      apiClient<RefundQuote>(`/admin/orders/${orderId}/refunds/quote`, {
        method: 'POST',
        token,
        body: JSON.stringify({ lines: [], reasonCode: 'OTHER', ...input }),
      }),
  });
}

export function useComposeRefund(token: string | null, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ComposeRefundInput) =>
      apiClient<ComposedRefund>(`/admin/orders/${orderId}/refunds`, {
        method: 'POST',
        token,
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: claimKeys.all });
      void queryClient.invalidateQueries({ queryKey: refundKeys.all });
      void queryClient.invalidateQueries({
        queryKey: payoutKeys.financials(orderId),
      });
    },
  });
}
