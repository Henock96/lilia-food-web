'use client';

import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AdminOrder,
  AdminOrdersPage,
  CreateOrderDto,
  Order,
  OrderStatus,
  StuckOrders,
} from '@lilia/types';
import { apiClient, apiClientRaw, API_URL, ApiError } from '../client';

/**
 * Taille de page de l'écran Commandes.
 *
 * 20 est aussi le défaut du serveur — mais c'est une coïncidence, pas un
 * contrat : c'est précisément parce que le client ne demandait rien que ce
 * défaut s'appliquait, et que le back-office n'a jamais montré plus de vingt
 * commandes. On le déclare donc explicitement.
 */
const PAGE_SIZE = 20;

export const ORDERS_PAGE_SIZE = PAGE_SIZE;

/** Onglet « toutes » de l'écran Commandes — n'est pas un statut serveur. */
export type OrderStatusFilter = OrderStatus | 'ALL';

export const orderKeys = {
  all: ['orders'] as const,
  mine: () => [...orderKeys.all, 'mine'] as const,
  detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
  admin: (
    role: string,
    page: number,
    status: OrderStatusFilter,
    search: string,
  ) => [...orderKeys.all, 'admin', role, page, status, search] as const,
};

export function useMyOrders(token: string | null) {
  return useQuery({
    queryKey: orderKeys.mine(),
    queryFn: async () => {
      const res = await apiClient<Order[] | { data: Order[] }>('/orders/my', { token });
      return Array.isArray(res) ? res : (res as { data: Order[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    retry: 3,
  });
}

export function useOrder(id: string, token: string | null) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => apiClient<Order>(`/orders/${id}`, { token }),
    enabled: !!id && !!token,
    refetchInterval: (query) => {
      const data = query.state.data as Order | undefined;
      const activeStatuses = ['EN_ATTENTE', 'PAYER', 'EN_PREPARATION', 'PRET', 'EN_ROUTE'];
      if (data && activeStatuses.includes(data.status)) return 15 * 1000;
      return false;
    },
  });
}

/**
 * Hook de création de commande.
 *
 * `idempotencyKey` (UUID v4) doit être stable pour toute la session de
 * checkout — le composant le génère une fois via `useState(() => crypto.randomUUID())`.
 * Si l'utilisateur relance le checkout après un échec réseau (4G faible à
 * Brazzaville), la même clé est renvoyée : le backend détecte le doublon et
 * retourne la réponse mise en cache au lieu de créer une 2ᵉ commande.
 */
export function useCreateOrder(token: string | null, idempotencyKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateOrderDto) =>
      apiClient<Order>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.mine() });
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useCancelOrder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient<Order>(`/orders/${orderId}/cancel`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

/** Décompte à zéro — sert de repli quand le serveur ne renvoie rien d'exploitable. */
const NO_STUCK_ORDERS: StuckOrders = {
  thresholdMinutes: 0,
  total: 0,
  byStatus: { PAYER: 0, EN_PREPARATION: 0, PRET: 0 },
  oldestMinutes: null,
};

export interface StuckOrdersQuery {
  token: string | null;
  minutes: number;
  /** Point d'injection des tests : la requête doit être exécutable sans React. */
  fetchStuck?: (path: string) => Promise<StuckOrders | undefined>;
}

/**
 * Commandes payées que personne n'a fait avancer.
 *
 * ## Le défaut corrigé
 *
 * L'alerte du tableau de bord filtrait **les vingt commandes reçues** : une
 * commande bloquée depuis trois heures en sortait dès que vingt plus récentes
 * arrivaient. Elle s'éteignait donc au moment précis où le problème
 * s'aggravait. Son horloge, figée au montage, ne détectait pas non plus une
 * commande devenue tardive pendant qu'on regardait l'écran.
 *
 * Le décompte vient maintenant du serveur, qui compte la population entière —
 * et qui exclut les paniers abandonnés (`EN_ATTENTE`, fermés seuls par le cron)
 * ainsi que les précommandes dont l'échéance n'est pas venue.
 *
 * La route sert **les deux rôles** et borne le vendeur à sa boutique :
 * réserver l'alerte à l'admin priverait du signal celui qui peut agir dessus
 * tout de suite.
 */
export function stuckOrdersQueryOptions({
  token,
  minutes,
  fetchStuck = (path) => apiClient<StuckOrders | undefined>(path, { token }),
}: StuckOrdersQuery) {
  return {
    queryKey: [...orderKeys.all, 'stuck', minutes] as const,
    queryFn: async (): Promise<StuckOrders> => {
      const res = await fetchStuck(`/orders/restaurant/stuck?minutes=${minutes}`);
      return res ?? { ...NO_STUCK_ORDERS, thresholdMinutes: minutes };
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    // L'alerte doit se rafraîchir toute seule : une commande devient tardive
    // pendant qu'on regarde l'écran.
    refetchInterval: 60 * 1000,
  };
}

export function useStuckOrders(token: string | null, minutes = 30) {
  return useQuery(stuckOrdersQueryOptions({ token, minutes }));
}

export interface AdminOrdersQuery {
  token: string | null;
  /** Rôle du compte connecté — il décide de la route, pas des droits. */
  role: string | undefined;
  page: number;
  status?: OrderStatusFilter;
  /**
   * Recherche libre — identifiant (tronqué ou complet), nom du client,
   * téléphone, nom du vendeur. Appliquée **par le serveur** : chercher dans la
   * page reçue ne fouillerait que vingt commandes.
   */
  search?: string;
  /** Point d'injection des tests : la requête doit être exécutable sans React. */
  fetchPage?: (path: string) => Promise<Partial<AdminOrdersPage>>;
}

/**
 * Options React Query de l'écran Commandes.
 *
 * ## Le défaut qu'elles corrigent
 *
 * `useRestaurantOrders` appelait `/orders/restaurant` **sans transmettre de
 * pagination**. Le serveur appliquait donc son `limit = 20` par défaut, et le
 * back-office affichait les vingt dernières commandes de toute la plateforme —
 * sans page suivante, sans recherche, avec des compteurs d'onglets calculés sur
 * ces vingt lignes et un export CSV qui exportait vingt lignes en se présentant
 * comme l'export des commandes. Une commande plus ancienne était inatteignable.
 *
 * ## Deux routes, un seul contrat
 *
 * `/admin/orders` est ADMIN-only ; y envoyer un vendeur produirait un 403 sur
 * l'écran le plus consulté de son back-office. Les deux routes acceptent
 * désormais `page`, `limit` et `status`, et rendent la même enveloppe
 * `{ data, meta: { total, page, limit, totalPages, statusCounts } }` — c'est ce
 * qui permet à l'écran de n'avoir qu'un seul comportement quel que soit le rôle.
 *
 * ⚠️ Le filtre de statut part **dans l'URL**. Filtrer une page déjà tronquée ne
 * rendrait que les commandes de cette page, en annonçant avec aplomb qu'il n'y
 * en a pas d'autres.
 *
 * Extraites du hook pour être exécutables sans React : le défaut corrigé ici
 * était une URL, et rien ne pouvait l'attraper tant que la requête vivait dans
 * une closure de `useQuery` (`orders.contract.test.ts`).
 */
export function adminOrdersQueryOptions({
  token,
  role,
  page,
  status = 'ALL',
  search = '',
  fetchPage = (path) => apiClientRaw<Partial<AdminOrdersPage>>(path, { token }),
}: AdminOrdersQuery) {
  const path = role === 'ADMIN' ? '/admin/orders' : '/orders/restaurant';
  const term = search.trim();

  return {
    queryKey: orderKeys.admin(role ?? 'INCONNU', page, status, term),
    queryFn: async (): Promise<AdminOrdersPage> => {
      // `URLSearchParams` encode `#` en `%23` : sans cela, tout ce qui suit un
      // dièse recopié depuis l'écran deviendrait un fragment d'URL, jamais
      // transmis au serveur — la commande cherchée ne remonterait pas, et
      // aucune erreur ne l'expliquerait.
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status !== 'ALL') params.set('status', status);
      if (term) params.set('search', term);

      const res = await fetchPage(`${path}?${params.toString()}`);
      const data = res.data ?? [];

      // Repli sur ce qu'on a **réellement reçu** plutôt que sur zéro : un
      // backend antérieur à `meta` ne doit pas faire afficher « 0 commande »
      // sous une liste qui en montre vingt.
      return {
        data,
        meta: {
          total: res.meta?.total ?? data.length,
          page: res.meta?.page ?? page,
          limit: res.meta?.limit ?? PAGE_SIZE,
          totalPages: res.meta?.totalPages ?? 1,
          statusCounts: res.meta?.statusCounts ?? {},
        },
      };
    },
    enabled: !!token,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    // Tourner la page ne doit pas vider l'écran le temps de la requête.
    placeholderData: keepPreviousData,
  };
}

/**
 * Commandes du back-office, paginées et filtrées **par le serveur**.
 *
 * Remplace `useRestaurantOrders`, qui plafonnait silencieusement à vingt
 * commandes (cf. `adminOrdersQueryOptions`).
 */
export function useAdminOrders(query: AdminOrdersQuery) {
  return useQuery(adminOrdersQueryOptions(query));
}

/**
 * @deprecated Plafonne à la première page du serveur (20 commandes) et ne sait
 * pas filtrer. Utiliser `useAdminOrders`, qui transmet `page`, `limit` et
 * `status`. Conservé le temps que les tableaux de bord migrent.
 */
export function useRestaurantOrders(token: string | null) {
  return useQuery({
    queryKey: [...orderKeys.all, 'restaurant'] as const,
    queryFn: async () => {
      const res = await apiClient<AdminOrder[] | { data: AdminOrder[] }>(
        '/orders/restaurant',
        { token },
      );
      return Array.isArray(res)
        ? res
        : ((res as { data: AdminOrder[] }).data ?? []);
    },
    enabled: !!token,
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useReorder(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) =>
      apiClient<unknown>(`/orders/${orderId}/reorder`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/**
 * Récupère le reçu PDF d'une commande payée sous forme de Blob.
 * Endpoint binaire (`StreamableFile`) → on ne passe PAS par `apiClient`
 * (qui suppose du JSON). Le backend autorise le propriétaire et les ADMIN.
 */
export async function fetchReceiptBlob(orderId: string, token: string | null): Promise<Blob> {
  const res = await fetch(`${API_URL}/orders/${orderId}/receipt`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
    throw new ApiError(res.status, err.message ?? `HTTP ${res.status}`);
  }
  return res.blob();
}

/**
 * Télécharge le reçu PDF dans le navigateur (déclenche le download).
 * Mutation pour exposer un état `isPending` côté bouton.
 */
export function useDownloadReceipt(token: string | null) {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const blob = await fetchReceiptBlob(orderId, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${orderId.slice(-6).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useUpdateOrderStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiClient<Order>(`/orders/${orderId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
