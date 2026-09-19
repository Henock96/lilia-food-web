'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DriverOutstanding,
  DriverSettlement,
  DriverSettlementMethod,
  PaginatedDriverSettlements,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const driverSettlementKeys = {
  all: ['admin', 'driver-settlements'] as const,
  outstanding: (driverId: string) =>
    ['admin', 'driver-settlements', 'outstanding', driverId] as const,
  list: (driverId: string, page: number) =>
    ['admin', 'driver-settlements', driverId, page] as const,
};

/**
 * Ce qui reste dû à un livreur — **lecture pure**.
 *
 * ⚠️ Ne verrouille aucune course, contrairement à un « compte arrêté ». Elle
 * peut être rejouée sans effet de bord, et c'est ce qui permet de l'afficher
 * en continu sans risquer d'immobiliser la dette d'un livreur si personne ne
 * revient confirmer.
 *
 * `coveredUntil` rendu dans la réponse doit être **repassé tel quel** à
 * `useRecordDriverSettlement` : c'est lui qui garantit que le versement couvre
 * exactement les courses affichées.
 */
export function useDriverOutstanding(driverId: string, token: string | null) {
  return useQuery({
    queryKey: driverSettlementKeys.outstanding(driverId),
    queryFn: () =>
      apiClient<DriverOutstanding>(
        `/admin/driver-settlements/outstanding/${driverId}`,
        { token },
      ),
    enabled: Boolean(driverId && token),
  });
}

/** Historique des règlements d'un livreur. */
export function useDriverSettlements(
  driverId: string,
  token: string | null,
  page = 1,
) {
  return useQuery({
    queryKey: driverSettlementKeys.list(driverId, page),
    queryFn: () =>
      apiClientRaw<PaginatedDriverSettlements>(
        `/admin/driver-settlements?driverId=${driverId}&page=${page}&limit=20`,
        { token },
      ),
    enabled: Boolean(driverId && token),
  });
}

/**
 * Enregistre un versement **déjà effectué**.
 *
 * ⚠️ `coveredUntil` n'est pas optionnel et ne doit jamais être `new Date()`
 * calculé ici : on repasse celui de l'aperçu consulté. Sinon les courses
 * terminées entre l'affichage et le clic seraient absorbées dans un montant
 * déjà remis, et le livreur sous-payé sans que rien ne le signale.
 */
export function useRecordDriverSettlement(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      driverId: string;
      coveredUntil: string;
      method: DriverSettlementMethod;
      paidAt?: string;
      reference?: string;
      note?: string;
    }) =>
      apiClient<DriverSettlement>('/admin/driver-settlements', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      }),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: driverSettlementKeys.all });
      void qc.invalidateQueries({
        queryKey: driverSettlementKeys.outstanding(variables.driverId),
      });
    },
  });
}

/** Annule une saisie erronée — les courses redeviennent réglables. */
export function useCancelDriverSettlement(token: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<DriverSettlement>(`/admin/driver-settlements/${id}/cancel`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: driverSettlementKeys.all });
    },
  });
}
