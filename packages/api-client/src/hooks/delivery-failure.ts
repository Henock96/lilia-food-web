'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DeliveryFailureReport,
  FailureConclusion,
  FailureLiability,
} from '@lilia/types';
import { apiClient } from '../client';
import { orderKeys } from './orders';
import { opsKeys } from './ops';
import { refundKeys } from './refunds';

/**
 * Arbitrage d'un échec de livraison (F3-05) — ADMIN.
 *
 * Les montants (remboursement, paie livreur, reversement vendeur) sont
 * calculés par le serveur, en `dryRun` pour l'aperçu puis pour de bon. Aucune
 * règle d'argent ne vit ici.
 */
export function useFailureEvidence(token: string | null, orderId: string | null) {
  return useQuery({
    queryKey: ['admin', 'orders', orderId ?? '', 'failure-evidence'] as const,
    queryFn: () =>
      apiClient<DeliveryFailureReport[]>(`/admin/orders/${orderId}/failure-evidence`, {
        token,
      }),
    enabled: !!token && !!orderId,
  });
}

export function useConcludeFailure(token: string | null, orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { liability: FailureLiability; dryRun: boolean }) =>
      apiClient<FailureConclusion>(`/admin/orders/${orderId}/conclude-failure`, {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: (result) => {
      if (result.dryRun) return;
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: opsKeys.queue });
      void queryClient.invalidateQueries({ queryKey: refundKeys.all });
    },
  });
}
