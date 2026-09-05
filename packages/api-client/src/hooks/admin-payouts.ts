'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  OrderFinancials,
  PaginatedPayouts,
  PayoutProvider,
  PayoutRequestResult,
  PayoutStatus,
  VendorPayoutAccount,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';
import { adminVendorKeys } from './admin-vendors';
import { onboardingKeys } from './vendor-onboarding';

export const payoutKeys = {
  all: ['admin', 'payouts'] as const,
  list: (page: number, status: string) => ['admin', 'payouts', page, status] as const,
  financials: (orderId: string) => ['admin', 'financials', orderId] as const,
};

/**
 * Récapitulatif financier d'une commande (`GET /admin/orders/:id/financials`).
 *
 * C'est la **seule** source des montants affichés dans l'administration :
 * ce que paie le client, ce que touche le vendeur, ce que garde Lilia Food, ce
 * que coûte le prestataire. Elle porte aussi l'éligibilité au reversement et
 * son motif — le front n'a aucune règle à rejouer, il affiche ce que le serveur
 * a décidé.
 */
export function useOrderFinancials(orderId: string, token: string | null, enabled = true) {
  return useQuery({
    queryKey: payoutKeys.financials(orderId),
    queryFn: () =>
      apiClient<OrderFinancials>(`/admin/orders/${orderId}/financials`, { token }),
    enabled: !!orderId && !!token && enabled,
    staleTime: 15 * 1000,
  });
}

/**
 * Déclenche le reversement du vendeur.
 *
 * ⚠️ **Seul geste du système qui envoie de l'argent à un vendeur.** Aucun
 * événement métier ne le provoque : ni la confirmation du paiement, ni le
 * passage à `PRET` — ce dernier rend seulement la commande éligible.
 *
 * Le serveur rejoue ses neuf contrôles d'éligibilité au moment du clic : un
 * écran resté ouvert dix minutes peut proposer une action devenue impossible,
 * et c'est le 409 qui fait foi. Deux administrateurs simultanés n'obtiennent
 * qu'un seul virement — la contrainte d'unicité en base arbitre, pas l'écran.
 */
export function useRequestPayout(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note?: string }) =>
      apiClient<PayoutRequestResult>(`/admin/orders/${orderId}/payout`, {
        method: 'POST',
        body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}),
        token,
      }),
    onSuccess: (_result, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: payoutKeys.financials(orderId) });
      void queryClient.invalidateQueries({ queryKey: payoutKeys.all });
    },
  });
}

/**
 * Nouvelle tentative après un échec.
 *
 * Refusée par le serveur tant que le reversement est `PENDING` ou `SUCCESS` :
 * réessayer un virement peut-être déjà parti est le seul moyen de payer deux
 * fois un vendeur, et cet argent-là ne revient pas.
 */
export function useRetryPayout(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note?: string }) =>
      apiClient<PayoutRequestResult>(`/admin/orders/${orderId}/payout/retry`, {
        method: 'POST',
        body: JSON.stringify(note?.trim() ? { note: note.trim() } : {}),
        token,
      }),
    onSuccess: (_result, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: payoutKeys.financials(orderId) });
      void queryClient.invalidateQueries({ queryKey: payoutKeys.all });
    },
  });
}

/** File des reversements (`GET /admin/payouts`), filtrable par statut. */
export function useAdminPayouts(
  token: string | null,
  page: number,
  status: PayoutStatus | '',
) {
  return useQuery({
    queryKey: payoutKeys.list(page, status),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      return apiClientRaw<PaginatedPayouts>(`/admin/payouts?${params.toString()}`, {
        token,
      });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

/**
 * Compte Mobile Money sur lequel le vendeur sera payé
 * (`PATCH /admin/vendors/:id/payout-account`).
 *
 * Distinct de `Restaurant.phone` et du téléphone du propriétaire : la commission
 * est négociable, ce numéro est la **destination de l'argent**. Réservé à
 * l'ADMIN — jamais dans `UpdateRestaurantDto`, ouvert au RESTAURATEUR : un
 * compte compromis détournerait tous les reversements suivants.
 *
 * ⚠️ Le serveur ne renvoie **jamais** le numéro en clair : la réponse le rend
 * masqué. Pour en changer, on le saisit en entier — il n'y a pas de
 * pré-remplissage possible, et c'est voulu.
 *
 * `payout` est une case **bloquante** de la checklist d'activation. Cet
 * assistant ne la proposait pas : un administrateur qui configurait un vendeur
 * depuis le web ne pouvait donc pas l'activer, sans qu'aucun écran ne dise ni
 * pourquoi ni où corriger. Seule l'application Flutter portait le champ.
 */
export function useUpdateVendorPayoutAccount(
  token: string | null,
  vendorId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      payoutPhoneNumber: string;
      payoutProvider: PayoutProvider;
      payoutAccountName?: string;
    }) =>
      apiClient<VendorPayoutAccount>(
        `/admin/vendors/${vendorId}/payout-account`,
        { method: 'PATCH', token, body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      // La checklist bascule : `payout` passe de bloquant-en-défaut à coché.
      // Sans cette invalidation, l'assistant continuerait d'afficher un manque
      // que l'administrateur vient de combler.
      if (vendorId) {
        void queryClient.invalidateQueries({
          queryKey: onboardingKeys.state(vendorId),
        });
        void queryClient.invalidateQueries({
          queryKey: onboardingKeys.preview(vendorId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: payoutKeys.all });
    },
  });
}
