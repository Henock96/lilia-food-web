'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SubscriptionPaymentMethod,
  VendorSubscription,
  VendorSubscriptionsOverview,
} from '@lilia/types';
import { apiClient } from '../client';

export const vendorSubscriptionKeys = {
  all: ['admin', 'vendor-subscriptions'] as const,
  vendor: (vendorId: string) =>
    ['admin', 'vendor-subscriptions', vendorId] as const,
};

/** Historique, statut Premium et prix courant d'un vendeur (ADMIN). */
export function useVendorSubscriptions(vendorId: string, token: string | null) {
  return useQuery({
    queryKey: vendorSubscriptionKeys.vendor(vendorId),
    queryFn: () =>
      apiClient<VendorSubscriptionsOverview>(
        `/admin/vendors/${vendorId}/subscriptions`,
        { token },
      ),
    enabled: Boolean(vendorId && token),
  });
}

/**
 * Enregistre un mois d'abonnement **déjà payé** hors plateforme.
 *
 * Ni montant ni dates : le serveur fixe le prix (réglages) et la période (à la
 * suite de la période en cours). ⚠️ `idempotencyKey` doit être stable pour
 * une même saisie — générée une fois par formulaire, renouvelée seulement
 * après un succès — sinon un double clic enregistrerait deux mois.
 */
export function useGrantVendorSubscription(
  vendorId: string,
  token: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      idempotencyKey,
      ...body
    }: {
      idempotencyKey: string;
      paymentMethod: SubscriptionPaymentMethod;
      paymentReference?: string;
      note?: string;
    }) => {
      if (!idempotencyKey.trim()) {
        throw new Error('Idempotency-Key requise pour enregistrer un mois.');
      }
      return apiClient<VendorSubscription>(
        `/admin/vendors/${vendorId}/subscriptions`,
        {
          method: 'POST',
          token,
          body: JSON.stringify(body),
          headers: { 'Idempotency-Key': idempotencyKey },
        },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: vendorSubscriptionKeys.vendor(vendorId),
      });
    },
  });
}

/** Révoque une période en cours ou à venir — motif obligatoire. */
export function useRevokeVendorSubscription(
  vendorId: string,
  token: string | null,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<VendorSubscription>(
        `/admin/vendors/${vendorId}/subscriptions/${id}/revoke`,
        { method: 'POST', token, body: JSON.stringify({ reason }) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: vendorSubscriptionKeys.vendor(vendorId),
      });
    },
  });
}
