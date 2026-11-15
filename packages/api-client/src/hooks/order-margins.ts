'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery } from '../session-query';
import type { OrderMargins } from '@lilia/types';

import { apiClient } from '../client';

/** Filtres de `GET /admin/margins` (bornes ISO 8601, facultatives). */
export interface OrderMarginsQuery {
  from?: string;
  to?: string;
}

export function orderMarginsPath({ from, to }: OrderMarginsQuery): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `/admin/margins?${qs}` : '/admin/margins';
}

/**
 * Marge par commande livrée (durcissement lot 5). **Aucun calcul ici** : le
 * serveur rend chaque montant et sa qualité (`CONFIRMED`, `ESTIMATED`,
 * `UNKNOWN`) ; un `null` est un montant inconnu, jamais 0.
 */
export function useOrderMargins(token: AuthCredential | null, query: OrderMarginsQuery) {
  return useQuery({
    queryKey: ['admin', 'margins', query.from ?? null, query.to ?? null] as const,
    queryFn: () => apiClient<OrderMargins>(orderMarginsPath(query), { token }),
    enabled: !!token,
  });
}
