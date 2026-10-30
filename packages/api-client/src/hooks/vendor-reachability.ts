'use client';

import { useQuery } from '@tanstack/react-query';
import type { VendorReachabilityRow } from '@lilia/types';
import { apiClient } from '../client';

export const vendorReachabilityKeys = {
  list: ['admin', 'vendors', 'reachability'] as const,
};

/**
 * Joignabilité des boutiques (audit du 28/10/2026, F-03) : qui sera prévenu
 * si une commande payée arrive maintenant. Classée par le serveur, les plus
 * graves en tête ; ni token ni numéro dans la réponse.
 *
 * ⚠️ « Appareil inscrit » ne veut pas dire « notification vue » : FCM ne dit
 * pas ce que le téléphone affiche. Seul le test sur le téléphone le prouve.
 */
export function useVendorReachability(token: string | null) {
  return useQuery({
    queryKey: vendorReachabilityKeys.list,
    queryFn: () =>
      apiClient<VendorReachabilityRow[]>('/admin/vendors/reachability', {
        token,
      }),
    enabled: !!token,
    refetchOnWindowFocus: true,
  });
}
