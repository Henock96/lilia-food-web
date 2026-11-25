'use client';
import type { AuthCredential } from '../auth-session';

import { useMutation, useQuery, useQueryClient } from '../session-query';
import type {
  AdminSubscriptionPayment,
  SubscriptionOffer,
  SubscriptionPayment,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  VendorSubscription,
  VendorSubscriptionsOverview,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const vendorSubscriptionKeys = {
  all: ['admin', 'vendor-subscriptions'] as const,
  vendor: (vendorId: string) =>
    ['admin', 'vendor-subscriptions', vendorId] as const,
  // Premium S1 — côté vendeur, et file admin des paiements.
  offer: ['vendor', 'subscription-offer'] as const,
  payment: (paymentId: string) =>
    ['vendor', 'subscription-payment', paymentId] as const,
  adminPayments: (filter: AdminSubscriptionPaymentsFilter) =>
    ['admin', 'subscription-payments', filter] as const,
};

export interface AdminSubscriptionPaymentsFilter {
  status?: SubscriptionPaymentStatus;
  restaurantId?: string;
  page?: number;
  limit?: number;
}

/**
 * Premium S1 — offre du vendeur connecté (statut, prix, durées et montants,
 * paiement en cours). Tout est calculé par le serveur.
 */
export function useSubscriptionOffer(token: AuthCredential | null) {
  return useQuery({
    queryKey: vendorSubscriptionKeys.offer,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<SubscriptionOffer>('/vendors/me/subscription/offer', {
        signal,
        token,
      }),
    enabled: Boolean(token),
  });
}

/**
 * Premium S1 — lance un dépôt pawaPay pour N mois. Ni montant ni prix : le
 * serveur les lit et les fige. Les mois ne s'ouvrent qu'au `SUCCESS` du
 * prestataire.
 */
export function useStartSubscriptionPayment(token: AuthCredential | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      months: number;
      phoneNumber: string;
      method: 'MTN_MOMO' | 'AIRTEL_MONEY';
    }) =>
      apiClient<SubscriptionPayment>('/vendors/me/subscription/payments', {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: vendorSubscriptionKeys.offer });
    },
  });
}

/**
 * Premium S1 — suit une tentative tant qu'elle est `PENDING` (le serveur
 * interroge pawaPay lui-même au-delà de 15 s). Cadence de
 * `subscriptionPaymentPollMs`.
 */
export function useSubscriptionPayment(
  paymentId: string | null,
  token: AuthCredential | null,
) {
  return useQuery({
    queryKey: vendorSubscriptionKeys.payment(paymentId ?? ''),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<SubscriptionPayment>(
        `/vendors/me/subscription/payments/${paymentId}`,
        { signal, token },
      ),
    enabled: Boolean(paymentId && token),
    refetchInterval: (query) =>
      subscriptionPaymentPollMs(
        query.state.data as SubscriptionPayment | undefined,
      ),
  });
}

/**
 * Cadence de suivi : 3 s la première minute, 5 s jusqu'à 3 min, puis 30 s
 * tant que le paiement reste `PENDING` — le serveur le tranche au plus tard à
 * la réconciliation (15 min). Arrêt dès qu'il n'est plus en attente.
 */
export function subscriptionPaymentPollMs(
  payment: Pick<SubscriptionPayment, 'status' | 'createdAt'> | undefined,
  now: number = Date.now(),
): number | false {
  if (!payment || payment.status !== 'PENDING') return false;
  const created = Date.parse(payment.createdAt);
  if (!Number.isFinite(created)) return false;
  const age = now - created;
  if (age < 60_000) return 3_000;
  if (age < 180_000) return 5_000;
  return 30_000;
}

/** Premium S1 — paiements d'abonnement, lecture admin. */
export function useAdminSubscriptionPayments(
  filter: AdminSubscriptionPaymentsFilter,
  token: AuthCredential | null,
) {
  return useQuery({
    queryKey: vendorSubscriptionKeys.adminPayments(filter),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.restaurantId) params.set('restaurantId', filter.restaurantId);
      params.set('page', String(filter.page ?? 1));
      params.set('limit', String(filter.limit ?? 20));
      return apiClientRaw<{
        data: AdminSubscriptionPayment[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      }>(`/admin/subscription-payments?${params.toString()}`, {
        signal,
        token,
      });
    },
    enabled: Boolean(token),
  });
}

/** Historique, statut Premium et prix courant d'un vendeur (ADMIN). */
export function useVendorSubscriptions(vendorId: string, token: AuthCredential | null) {
  return useQuery({
    queryKey: vendorSubscriptionKeys.vendor(vendorId),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      apiClient<VendorSubscriptionsOverview>(
        `/admin/vendors/${vendorId}/subscriptions`,
        { signal, token },
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
  token: AuthCredential | null,
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
  token: AuthCredential | null,
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
