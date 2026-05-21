'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type {
  Paginated,
  AdminClientListItem,
  AdminClientLoyalty,
  AdminClientReferral,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

export const adminClientKeys = {
  all: ['admin', 'clients'] as const,
  list: (page: number, search: string) =>
    [...adminClientKeys.all, 'list', page, search] as const,
  loyalty: (clientId: string | null) =>
    [...adminClientKeys.all, clientId, 'loyalty'] as const,
  referral: (clientId: string | null) =>
    [...adminClientKeys.all, clientId, 'referral'] as const,
};

/** Liste clients paginée + recherche (GET /admin/clients). */
export function useAdminClients(
  token: string | null,
  page: number,
  search: string,
) {
  return useQuery({
    queryKey: adminClientKeys.list(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      return apiClientRaw<Paginated<AdminClientListItem>>(
        `/admin/clients?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

/** Solde + historique de fidélité d'un client (GET /admin/clients/:id/loyalty). */
export function useClientLoyalty(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.loyalty(clientId),
    queryFn: () =>
      apiClient<AdminClientLoyalty>(`/admin/clients/${clientId}/loyalty`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}

/** Stats de parrainage d'un client (GET /admin/clients/:id/referral). */
export function useClientReferral(clientId: string | null, token: string | null) {
  return useQuery({
    queryKey: adminClientKeys.referral(clientId),
    queryFn: () =>
      apiClient<AdminClientReferral>(`/admin/clients/${clientId}/referral`, { token }),
    enabled: !!clientId && !!token,
    staleTime: 2 * 60 * 1000,
  });
}
