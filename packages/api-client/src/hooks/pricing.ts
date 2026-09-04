'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

/**
 * Paramètres tarifaires publics — `GET /platform-settings` (route `@Public()`).
 *
 * Distinct de `usePlatformSettings` (`/admin/platform-settings`, ADMIN, objet
 * complet) : c'est la vue destinée aux clients, celle que lit déjà l'app
 * Flutter. Le panier web codait ces valeurs en dur, d'où l'écart de 8 % contre
 * 15 % constaté en production.
 */
export interface PublicPlatformSettings {
  serviceFeePercent: number;
  loyaltyPointsPer100Xaf: number;
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

export const pricingKeys = {
  platformSettings: ['platform-settings'] as const,
  deliveryQuote: (restaurantId: string, quartierId: string) =>
    ['delivery-fee', restaurantId, quartierId] as const,
};

export function usePublicPlatformSettings() {
  return useQuery({
    queryKey: pricingKeys.platformSettings,
    queryFn: () => apiClient<PublicPlatformSettings>('/platform-settings'),
    // Le taux change rarement, mais une version installée ne doit pas garder
    // l'ancien indéfiniment : 5 min borne l'écart entre l'écran et la caisse.
    staleTime: 5 * 60 * 1000,
  });
}

/** Réponse de `GET /quartiers/delivery-fee`. */
export interface DeliveryFeeQuote {
  mode: 'FIXED' | 'ZONE_BASED';
  fee: number;
  zoneName: string | null;
  quartierName?: string;
  /** Le quartier n'appartient à aucune zone : le serveur retombe sur le fixe. */
  isDefaultZone?: boolean;
}

/**
 * Devis de livraison du serveur pour un vendeur et un quartier
 * (`GET /quartiers/delivery-fee`, public).
 *
 * C'est **la même méthode** que celle appelée au checkout
 * (`QuartiersService.calculateDeliveryFee`), y compris son repli « quartier
 * hors zone → tarif fixe ». Le web n'a donc aucune règle de zone à reproduire.
 */
export function useDeliveryFeeQuote(
  restaurantId: string | null | undefined,
  quartierId: string | null | undefined,
) {
  return useQuery({
    queryKey: pricingKeys.deliveryQuote(restaurantId ?? '', quartierId ?? ''),
    queryFn: () => {
      const params = new URLSearchParams({
        restaurantId: restaurantId!,
        quartierId: quartierId!,
      });
      return apiClient<DeliveryFeeQuote>(
        `/quartiers/delivery-fee?${params.toString()}`,
      );
    },
    enabled: !!restaurantId && !!quartierId,
    staleTime: 5 * 60 * 1000,
  });
}
