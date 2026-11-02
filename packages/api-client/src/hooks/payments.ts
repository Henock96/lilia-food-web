'use client';
import { assertCurrentSession, type AuthCredential } from '../auth-session';

import { useMutation, useQuery, useQueryClient, type QueryClient, type UseMutationOptions } from '../session-query';
import type {
  PaymentIntent,
  PaymentMethod,
  PaymentProvidersInfo,
  PaymentStatusView,
} from '@lilia/types';
import { apiClient } from '../client';
import { orderKeys } from './orders';

export const paymentKeys = {
  all: ['payments'] as const,
  providers: ['payments', 'providers'] as const,
  forOrder: (orderId: string) => ['payments', 'by-order', orderId] as const,
};

export interface CreatePaymentDto {
  orderId: string;
  phoneNumber: string;
  /**
   * Opérateur visé pour **cette** tentative. Facultatif : à défaut le serveur
   * reprend celui choisi au checkout.
   *
   * Le champ existe parce qu'une seconde tentative vise souvent un autre
   * opérateur — le client n'a plus de solde MTN et paie en Airtel. Sans lui, il
   * faudrait repasser la commande.
   */
  method?: PaymentMethod;
  payerMessage?: string;
}

/**
 * Rail d'encaissement en service et disponibilité des opérateurs.
 *
 * Route **publique** : l'écran de paiement doit pouvoir l'appeler avant même
 * que la commande existe. Elle permet de griser un opérateur en panne sans
 * publier de déploiement — sans elle, une indisponibilité MTN se traduit par
 * des échecs en série que le client ne comprend pas.
 */
export function usePaymentProviders() {
  return useQuery({
    queryKey: paymentKeys.providers,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<PaymentProvidersInfo>('/payments/providers', { signal }),
    // Le serveur met déjà la configuration prestataire en cache 15 min ; on ne
    // la redemande pas à chaque montage d'écran.
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Ouvre — ou reprend — un encaissement pour une commande déjà créée.
 *
 * ⚠️ **Le montant n'est jamais transmis.** Il vient de `order.total` côté
 * serveur ; `amount` a été retiré du contrat pour que rien ne suggère l'inverse.
 *
 * L'appel est **sûr à rejouer** : le serveur réutilise la tentative `PENDING`
 * existante grâce à un index unique partiel `payments(orderId) WHERE
 * status='PENDING'`, et ne renvoie une seconde demande au prestataire que si la
 * précédente ne lui a jamais été soumise. C'est la base qui arbitre le double
 * clic, pas cette fonction.
 */
export function useCreatePayment(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation(createPaymentMutationOptions(token, queryClient));
}

export function createPaymentMutationOptions(
  token: AuthCredential | null,
  queryClient: QueryClient,
): UseMutationOptions<PaymentIntent, Error, CreatePaymentDto> {
  return {
    mutationFn: (dto: CreatePaymentDto) =>
      apiClient<PaymentIntent>('/payments', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    // A lost POST response can still mean a pending collection exists.
    onSettled: (_intent, _error, dto) => Promise.all([
      queryClient.invalidateQueries({ queryKey: paymentKeys.forOrder(dto.orderId) }),
      queryClient.invalidateQueries({ queryKey: orderKeys.mine() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(dto.orderId) }),
    ]).then(() => undefined),
  };
}

/**
 * Cadence d'interrogation, en millisecondes — ou `false` pour cesser.
 *
 * Extraite du hook pour être **vérifiable** : c'est une garantie annoncée
 * (3 s la première minute, 5 s ensuite, arrêt à 3 min) et une garantie qui vit
 * dans une closure ne se teste pas. Elle est alignée sur
 * `payment_status_controller.dart` côté mobile ; les deux doivent bouger
 * ensemble.
 *
 * ⚠️ L'arrêt n'est **pas** un échec. Le webhook et le cron de réconciliation
 * continuent de trancher côté serveur : cesser d'interroger n'affecte aucun
 * statut, ça économise la data d'un client qui attend déjà depuis trois
 * minutes.
 */
export function paymentPollIntervalMs(
  payment: Pick<PaymentStatusView, 'status' | 'createdAt'> | null | undefined,
  now: number = Date.now(),
): number | false {
  if (!payment || payment.status !== 'PENDING') return false;

  const elapsed = now - new Date(payment.createdAt).getTime();
  if (Number.isNaN(elapsed)) return false;
  if (elapsed > 3 * 60 * 1000) return false;
  return elapsed < 60 * 1000 ? 3000 : 5000;
}

/**
 * Suit l'encaissement d'une commande jusqu'à son issue.
 *
 * Deux routes, une seule vue :
 *  1. `GET /payments/by-order/:orderId` **retrouve** la tentative en cours —
 *     c'est ce qui rend un rechargement de page inoffensif. Sans elle, il
 *     faudrait rejouer `POST /payments`, c'est-à-dire une écriture pouvant
 *     relancer une demande chez l'opérateur, pour une simple lecture ;
 *  2. tant que la tentative est `PENDING`, `GET /payments/:id/status` la
 *     rafraîchit — cette route-là interroge le prestataire et applique son
 *     verdict par le **même** point de transition que le webhook.
 *
 * Cadence : 3 s la première minute (le client compose son code), puis 5 s, et
 * on cesse d'interroger au-delà de trois minutes. Continuer consommerait sa
 * data sans rien apprendre : le webhook et le cron de réconciliation
 * trancheront de leur côté, et le statut sera là au prochain affichage.
 *
 * ⚠️ Un arrêt d'interrogation **n'est pas un échec**. Un paiement peut aboutir
 * après coup ; l'afficher comme raté inviterait le client à payer deux fois.
 */
export function useOrderPayment(
  orderId: string,
  token: AuthCredential | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: paymentKeys.forOrder(orderId),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) =>
      readOrderPayment(orderId, token, signal),
    staleTime: 0,
    retry: false,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    enabled: !!orderId && !!token && options.enabled !== false,
    refetchInterval: (query) =>
      paymentReadPollIntervalMs(query.state.data as PaymentStatusView | null | undefined, query.state.error),
    refetchOnWindowFocus: true,
  });
}

/** A failed refresh is an error, even when the preceding read found PENDING. */
export class PaymentStatusReadError extends Error {
  constructor(public readonly pending: PaymentStatusView) {
    super('Le statut du paiement ne peut pas être vérifié. Ne payez pas une seconde fois.');
    this.name = 'PaymentStatusReadError';
  }
}

export function parseOrderPayment(value: unknown, orderId: string): PaymentStatusView | null {
  if (value === null) return null;
  if (!value || typeof value !== 'object') throw new Error('Réponse de paiement invalide.');
  const p = value as Partial<PaymentStatusView>;
  if (p.orderId !== orderId || typeof p.paymentId !== 'string' || !p.paymentId ||
      !['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'].includes(String(p.status)) ||
      !Number.isSafeInteger(p.amount) || (p.amount ?? -1) < 0 || p.currency !== 'XAF' ||
      typeof p.provider !== 'string' || !p.provider ||
      typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt))) {
    throw new Error('Réponse de paiement invalide.');
  }
  return p as PaymentStatusView;
}

export async function readOrderPayment(orderId: string, token: AuthCredential | null, signal?: AbortSignal): Promise<PaymentStatusView | null> {
  const latest = parseOrderPayment(await apiClient<unknown>(`/payments/by-order/${orderId}`, { token, signal }), orderId);
  if (!latest || latest.status !== 'PENDING') return latest;
  try {
    const current = parseOrderPayment(await apiClient<unknown>(`/payments/${latest.paymentId}/status`, { token, signal }), orderId);
    if (!current || current.paymentId !== latest.paymentId) throw new Error('Réponse de paiement incohérente.');
    return current;
  } catch (error) {
    assertCurrentSession(token);
    if (signal?.aborted) throw error;
    throw new PaymentStatusReadError(latest);
  }
}

/** Pending evidence survives a failed status GET, with the original deadline. */
export function paymentReadPollIntervalMs(
  payment: PaymentStatusView | null | undefined,
  error: unknown,
  now: number = Date.now(),
): number | false {
  return paymentPollIntervalMs(error instanceof PaymentStatusReadError ? error.pending : payment, now);
}
