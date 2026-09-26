'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminVendorOffer, VendorOfferStatus } from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

/**
 * F3-11 — offres boutique vues par l'administration : liste et arrêt
 * d'urgence (`/admin/offers`). La création appartient au vendeur (app
 * vendeurs) ; l'administration n'en publie pas.
 */
export const vendorOfferKeys = {
  all: ['admin', 'vendor-offers'] as const,
  list: (status: VendorOfferStatus | null, page: number) =>
    [...vendorOfferKeys.all, status, page] as const,
};

export interface AdminVendorOffersPage {
  data: AdminVendorOffer[];
  meta: { page: number; limit: number; total: number };
}

export function useAdminVendorOffers(
  token: string | null,
  status: VendorOfferStatus | null,
  page = 1,
) {
  return useQuery({
    queryKey: vendorOfferKeys.list(status, page),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      return apiClientRaw<AdminVendorOffersPage>(`/admin/offers?${params.toString()}`, {
        token,
      });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useStopVendorOffer(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient<{ message: string }>(`/admin/offers/${id}/stop`, {
        method: 'POST',
        token,
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: vendorOfferKeys.all }),
  });
}
