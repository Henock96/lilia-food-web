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
  /**
   * Forfait de points gagné par commande livrée. A remplacé
   * `loyaltyPointsPer100Xaf` : le gain n'est plus proportionnel au montant.
   */
  loyaltyPointsPerOrder: number;
  /**
   * Valeur d'un point, en FCFA. **Seule** source autorisée pour convertir des
   * points en argent à l'écran — aucun `* 5` ni `* 50` ne doit subsister dans
   * une page.
   */
  loyaltyPointValueXaf: number;
  loyaltyMinRedemption: number;
  /** Points versés au parrain à la première commande livrée de son filleul. */
  referrerBonusPoints: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
}

/**
 * Repli utilisé tant que `GET /platform-settings` n'a pas répondu.
 *
 * Aligné sur les `@default` du modèle Prisma, jamais une constante inventée
 * côté web. Il ne facture rien : le montant dû est celui de la commande créée
 * par le serveur.
 */
export const PUBLIC_PLATFORM_SETTINGS_FALLBACK: PublicPlatformSettings = {
  serviceFeePercent: 8,
  loyaltyPointsPerOrder: 1,
  loyaltyPointValueXaf: 50,
  loyaltyMinRedemption: 1,
  referrerBonusPoints: 1,
  maintenanceMode: false,
  maintenanceMessage: null,
};

/**
 * Convertit un nombre de points en FCFA. Point de passage **unique** côté web :
 * c'est ce qui garantit qu'un changement de barème serveur se voit partout
 * sans redéploiement.
 */
export function pointsToXaf(
  points: number,
  settings: Pick<PublicPlatformSettings, 'loyaltyPointValueXaf'> | undefined,
): number {
  return (
    points *
    (settings?.loyaltyPointValueXaf ??
      PUBLIC_PLATFORM_SETTINGS_FALLBACK.loyaltyPointValueXaf)
  );
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
