'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    queryFn: () => apiClient<PaymentProvidersInfo>('/payments/providers'),
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
export function useCreatePayment(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePaymentDto) =>
      apiClient<PaymentIntent>('/payments', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: (intent) => {
      void queryClient.invalidateQueries({
        queryKey: paymentKeys.forOrder(intent.orderId),
      });
      void queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
      void queryClient.invalidateQueries({
        queryKey: orderKeys.detail(intent.orderId),
      });
    },
  });
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
  token: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: paymentKeys.forOrder(orderId),
    queryFn: async () => {
      const latest = await apiClient<PaymentStatusView | null>(
        `/payments/by-order/${orderId}`,
        { token },
      );
      if (!latest || latest.status !== 'PENDING') return latest;

      // Force une interrogation du prestataire. Un échec réseau ici ne doit pas
      // faire disparaître l'état connu : on retombe sur la lecture précédente.
      return apiClient<PaymentStatusView>(
        `/payments/${latest.paymentId}/status`,
        { token },
      ).catch(() => latest);
    },
    enabled: !!orderId && !!token && options.enabled !== false,
    refetchInterval: (query) =>
      paymentPollIntervalMs(
        query.state.data as PaymentStatusView | null | undefined,
      ),
    refetchOnWindowFocus: true,
  });
}
