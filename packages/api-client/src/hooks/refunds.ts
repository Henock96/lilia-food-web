'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  ApprovalRequested,
  Refund,
  RefundStatus,
  RefundsPage,
} from '@lilia/types';

import { apiClient, apiClientRaw } from '../client';
import { approvalKeys } from './approvals';

const PAGE_SIZE = 20;

export const REFUNDS_PAGE_SIZE = PAGE_SIZE;

/** Onglet « tous » de la file — n'est pas un statut serveur. */
export type RefundStatusFilter = RefundStatus | 'ALL';

export const refundKeys = {
  all: ['refunds'] as const,
  list: (page: number, status: RefundStatusFilter) =>
    [...refundKeys.all, 'list', page, status] as const,
  pendingCount: () => [...refundKeys.all, 'pending-count'] as const,
};

/**
 * Statuts terminaux : le serveur refuse de les faire bouger (409 « Ce
 * remboursement est déjà clos »).
 */
const CLOSED: readonly RefundStatus[] = ['COMPLETED', 'REJECTED'];

/**
 * Ce qu'on peut faire d'un remboursement dans son état courant.
 *
 * Miroir de `RefundsService.updateStatus` : un bouton qui mène à un 409
 * n'apprend rien, sinon que l'application est cassée. `PROCESSING` n'est plus
 * proposé une fois atteint — le virement a déjà été lancé, il ne reste qu'à
 * dire s'il a abouti.
 */
export function nextRefundStatuses(
  current: RefundStatus,
  refund: { providerRefundId?: string | null } = {},
): RefundStatus[] {
  if (CLOSED.includes(current)) return [];
  if (current === 'PROCESSING') {
    // R-01 / D-2 — un virement prestataire en vol se conclut par le
    // prestataire (callback ou réconciliation) ; le serveur refuse toute
    // clôture à la main (409 `REFUND_PROVIDER_IN_FLIGHT`).
    if (refund.providerRefundId) return [];
    return ['COMPLETED', 'REJECTED'];
  }
  return ['PROCESSING', 'COMPLETED', 'REJECTED'];
}

/**
 * R-01 — virement du remboursement par le prestataire, au numéro qui a payé.
 * Au-delà du seuil, le serveur ouvre une demande d'approbation au lieu de
 * virer (`{ approvalRequired: true, approval }`). Pas de corps : la
 * destination n'est jamais un paramètre.
 */
export function refundExecuteRequest(refundId: string) {
  return { path: `/refunds/${refundId}/execute`, method: 'POST' as const };
}

/**
 * Un refus doit être motivé.
 *
 * Le serveur accepte `notes` vide — c'est l'interface qui pose la règle. Un
 * refus sans motif est inexplicable trois mois plus tard, quand le client
 * rappelle pour savoir pourquoi il n'a jamais été remboursé.
 */
export function refundRequiresNote(target: RefundStatus): boolean {
  return target === 'REJECTED';
}

/**
 * Requête de changement de statut.
 *
 * ⚠️ Un `notes` vide est **omis**, pas envoyé : `updateStatus` fait
 * `notes: notes ?? refund.notes`, donc une chaîne vide effacerait le motif
 * écrit à l'étape précédente.
 */
export function refundUpdateRequest(
  refundId: string,
  status: RefundStatus,
  notes?: string,
) {
  const trimmed = notes?.trim();
  return {
    path: `/refunds/${refundId}/status`,
    body: {
      status,
      ...(trimmed ? { notes: trimmed } : {}),
    },
  };
}

export interface RefundsQuery {
  token: string | null;
  page: number;
  status?: RefundStatusFilter;
  /** Point d'injection des tests : la requête doit être exécutable sans React. */
  fetchPage?: (path: string) => Promise<Partial<RefundsPage>>;
}

/**
 * File des remboursements — les plus anciens d'abord.
 *
 * C'est une file d'attente, pas un flux d'actualité : le client qui attend son
 * argent depuis le plus longtemps passe en premier. Le tri vient du serveur.
 *
 * ⚠️ `GET /refunds` renvoie `meta: { page, limit, total }` **sans**
 * `totalPages`. On le dérive ici plutôt que de laisser chaque écran le
 * recalculer différemment — et on plancher à 1, parce que « page 1/0 » se lit
 * comme une erreur là où il n'y a simplement rien à traiter.
 */
export function refundsQueryOptions({
  token,
  page,
  status = 'ALL',
  fetchPage = (path) => apiClientRaw<Partial<RefundsPage>>(path, { token }),
}: RefundsQuery) {
  return {
    queryKey: refundKeys.list(page, status),
    queryFn: async (): Promise<RefundsPage> => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status !== 'ALL') params.set('status', status);

      const res = await fetchPage(`/refunds?${params.toString()}`);
      const data = res.data ?? [];
      const total = res.meta?.total ?? data.length;
      const limit = res.meta?.limit ?? PAGE_SIZE;

      return {
        data,
        meta: {
          total,
          page: res.meta?.page ?? page,
          limit,
          totalPages:
            limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1,
        },
      };
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  };
}

export function useRefunds(
  token: string | null,
  page: number,
  status: RefundStatusFilter = 'ALL',
) {
  return useQuery(refundsQueryOptions({ token, page, status }));
}

/**
 * Nombre de clients qui attendent leur argent — alimente le badge de
 * navigation.
 *
 * Séparé de la liste : le badge doit rester disponible depuis n'importe quel
 * écran, et se rafraîchir sans recharger la file. Il lit `meta.total`, jamais
 * `data.length` — c'est ce qui faisait afficher « 20 » au badge Flutter quand
 * cinquante clients attendaient.
 */
export function usePendingRefundsCount(token: string | null) {
  return useQuery({
    queryKey: refundKeys.pendingCount(),
    queryFn: async () => {
      const res = await apiClientRaw<Partial<RefundsPage>>(
        '/refunds?page=1&limit=1&status=PENDING',
        { token },
      );
      return res.meta?.total ?? 0;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

/**
 * Fait avancer un remboursement dans la file.
 *
 * R-01 — au-delà du seuil, `COMPLETED` / `REJECTED` ne changent rien : le
 * serveur rend `{ approvalRequired: true, approval }` (2xx). L'appelant doit
 * distinguer cette réponse d'un succès.
 */
export function useUpdateRefundStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      refundId,
      status,
      notes,
    }: {
      refundId: string;
      status: RefundStatus;
      notes?: string;
    }) => {
      const { path, body } = refundUpdateRequest(refundId, status, notes);
      return apiClient<Refund | ApprovalRequested>(path, {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      });
    },
    // R-01 — la promesse est RENDUE : la mutation reste « en cours » jusqu'à
    // la relecture de la file, sinon les boutons se réactivent sur une fiche
    // périmée. Une demande d'approbation alimente aussi l'écran Approbations.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: refundKeys.all }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
      ]),
  });
}

/** R-01 — « Virer au client » : la voie canonique d'exécution financière. */
export function useExecuteRefund(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refundId: string) => {
      const { path, method } = refundExecuteRequest(refundId);
      return apiClient<
        { status: RefundStatus; message: string } | ApprovalRequested
      >(path, { method, token });
    },
    // R-01 — la promesse est RENDUE : la mutation reste « en cours » jusqu'à
    // la relecture de la file, sinon les boutons se réactivent sur une fiche
    // périmée. Une demande d'approbation alimente aussi l'écran Approbations.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: refundKeys.all }),
        queryClient.invalidateQueries({ queryKey: approvalKeys.all }),
      ]),
  });
}
