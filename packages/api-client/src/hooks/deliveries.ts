'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailableDeliverer,
  OrderDelivery,
  OrderStatus,
} from '@lilia/types';

import { apiClient, apiClientRaw, ApiError } from '../client';
import { orderKeys } from './orders';

export const deliveryKeys = {
  all: ['deliveries'] as const,
  deliverers: () => [...deliveryKeys.all, 'deliverers'] as const,
  byOrder: (orderId: string) =>
    [...deliveryKeys.all, 'by-order', orderId] as const,
};

/**
 * Statuts de commande sur lesquels le serveur accepte une assignation.
 *
 * Miroir exact d'`assignableStatuses` dans `DeliveryAssignmentService` : ni sur
 * `EN_ATTENTE` (non payée), ni sur une commande terminée. Un bouton que l'API
 * refusera par un 400 n'apprend rien, sinon que l'application est cassée.
 */
const ASSIGNABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  'PAYER',
  'EN_PREPARATION',
  'PRET',
  'EN_ROUTE',
];

/**
 * Peut-on confier cette commande à un livreur ?
 *
 * `isDelivery === false` est un retrait au comptoir : il n'y a pas de course à
 * attribuer. Le serveur ne l'interdit pas explicitement — c'est l'interface qui
 * ne doit pas proposer un geste dénué de sens.
 */
export function canAssignDeliverer(
  orderStatus: OrderStatus,
  isDelivery: boolean,
): boolean {
  return isDelivery && ASSIGNABLE_ORDER_STATUSES.includes(orderStatus);
}

/**
 * Requête d'assignation.
 *
 * On passe par `by-order` et non par `PATCH /deliveries/:id/assign` : ce
 * dernier exige une livraison existante, alors qu'une commande n'en a aucune
 * tant que personne n'a été assigné — c'est-à-dire précisément au moment où
 * l'on assigne. `by-order` la crée au passage.
 */
export function assignDelivererRequest(orderId: string, delivererId: string) {
  return {
    path: `/deliveries/by-order/${orderId}/assign`,
    body: { delivererId },
  };
}

/** Enveloppe rendue par l'assignation : la course, et ce que le serveur en dit. */
export interface AssignDelivererResponse {
  data: OrderDelivery;
  message?: string;
}

/**
 * Message de succès à afficher après une assignation.
 *
 * Le serveur distingue « Livreur assigné avec succès » de « Livreur réassigné —
 * le précédent a été libéré ». La seconde dit à l'opérateur que **quelqu'un
 * vient d'être décroché d'une course** ; la remplacer par un libellé maison la
 * ferait disparaître, exactement comme les toasts « Erreur lors de la
 * création » jetaient les messages d'erreur du backend.
 */
export function assignSuccessMessage(res: AssignDelivererResponse): string {
  return res.message ?? 'Livreur assigné';
}

export interface OrderDeliveryQuery {
  orderId: string;
  token: string | null;
  /** Point d'injection des tests : la requête doit être exécutable sans React. */
  fetchDelivery?: (path: string) => Promise<OrderDelivery>;
}

/**
 * Course d'une commande, ou `null` s'il n'y en a pas encore.
 *
 * ⚠️ Le backend répond **404** tant qu'aucun livreur n'a été assigné. C'est
 * l'état de départ de toute commande, pas une anomalie — on le traduit donc en
 * `null`.
 *
 * Mais **seulement le 404**. `lilia-food-admin` avale ici toutes les erreurs
 * (`catch (_) { return null; }`), ce qui rend un refus d'accès, une panne
 * serveur et une coupure réseau indiscernables d'une commande sans livreur :
 * l'écran affiche « Aucun livreur assigné » sur une commande qui en a
 * peut-être un. C'est le même motif qui a rendu le back-office produits muet
 * en septembre, et on ne le reproduit pas.
 */
export function orderDeliveryQueryOptions({
  orderId,
  token,
  fetchDelivery = (path) => apiClient<OrderDelivery>(path, { token }),
}: OrderDeliveryQuery) {
  return {
    queryKey: deliveryKeys.byOrder(orderId),
    queryFn: async (): Promise<OrderDelivery | null> => {
      try {
        return await fetchDelivery(`/deliveries/by-order/${orderId}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!orderId && !!token,
    staleTime: 15 * 1000,
  };
}

export function useOrderDelivery(orderId: string, token: string | null) {
  return useQuery(orderDeliveryQueryOptions({ orderId, token }));
}

/**
 * Livreurs assignables (`GET /deliveries/deliverers`).
 *
 * La liste est déjà filtrée par le serveur — comptes actifs, profil en service,
 * hors ligne exclus — avec **la même condition** que le contrôle d'écriture.
 * On ne la refiltre donc pas ici : deux implémentations d'une même règle
 * divergent, et l'interface finirait par proposer des livreurs que
 * l'assignation refuse, ou l'inverse, ce qui est pire.
 */
export function useAvailableDeliverers(token: string | null) {
  return useQuery({
    queryKey: deliveryKeys.deliverers(),
    queryFn: () =>
      apiClient<AvailableDeliverer[]>('/deliveries/deliverers', { token }),
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

/**
 * Assigne — ou réassigne — un livreur à une commande.
 *
 * Le serveur libère et prévient l'ancien livreur le cas échéant, et refuse de
 * réassigner celui déjà en place (400). Ses messages nomment la personne et la
 * raison (« X n'est pas en service », « compte BLOCKED ») : l'appelant doit les
 * afficher tels quels.
 */
export function useAssignDeliverer(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      delivererId,
    }: {
      orderId: string;
      delivererId: string;
    }) => {
      const { path, body } = assignDelivererRequest(orderId, delivererId);
      // `apiClientRaw` et non `apiClient` : ce dernier déballe `data` et perd
      // le `message`, qui porte ici une information que rien d'autre ne dit.
      return apiClientRaw<AssignDelivererResponse>(path, {
        method: 'PATCH',
        token,
        body: JSON.stringify(body),
      });
    },
    onSuccess: (_data, { orderId }) => {
      void queryClient.invalidateQueries({
        queryKey: deliveryKeys.byOrder(orderId),
      });
      // La charge courante des livreurs a bougé.
      void queryClient.invalidateQueries({
        queryKey: deliveryKeys.deliverers(),
      });
      // L'assignation peut faire avancer la commande côté serveur.
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
