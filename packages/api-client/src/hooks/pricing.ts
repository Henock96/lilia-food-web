'use client';

import { useQuery } from '@tanstack/react-query';
import type { DeliveryPricingMode } from '@lilia/types';
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
   * F3-02 — qui fixe le prix de la course. En `PLATFORM`, le
   * `fixedDeliveryFee` d'un vendeur ne veut plus rien dire : le prix vient du
   * devis `GET /quartiers/delivery-fee`, jamais d'un calcul local.
   */
  deliveryPricingMode: DeliveryPricingMode;
  /**
   * Prix le plus bas de la grille publiée (« Livraison dès X »). `null` en
   * `VENDOR_LEGACY` ou sans grille.
   */
  deliveryFeeFromXaf: number | null;
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
  // Les champs du canal de mise à jour mobile (`minAppVersion`…) sont aussi
  // servis par cette route ; le site n'a pas de version installée et ne les
  // déclare pas. Source des types admin : `PlatformSettings` (@lilia/types).
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
  // Le `@default` du schéma. Un serveur injoignable en mode plateforme ferait
  // retomber le panier sur le prix du vendeur : le panier le signale par
  // `settingsKnown` et ne présente pas ce montant comme sûr.
  deliveryPricingMode: 'VENDOR_LEGACY',
  deliveryFeeFromXaf: null,
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
  deliveryQuote: (restaurantId: string, quartierId: string, subTotal: number | null) =>
    ['delivery-fee', restaurantId, quartierId, subTotal] as const,
};

export function usePublicPlatformSettings() {
  return useQuery({
    queryKey: pricingKeys.platformSettings,
    queryFn: () => apiClient<PublicPlatformSettings>('/platform-settings'),
    // Le taux change rarement, mais `maintenanceMode` vit ici aussi : une
    // fenêtre de maintenance déclarée doit se voir au panier en une minute, pas
    // en cinq (MAINT-001). 60 s = le cache du serveur lui-même
    // (`PlatformSettingsService.CACHE_TTL_MS`) : relire plus souvent ne
    // rapporterait rien de plus frais.
    staleTime: 60 * 1000,
    // Le `QueryClient` du site coupe la relecture au focus globalement. Pour
    // cette requête minuscule, on la rétablit : revenir sur l'onglet après une
    // pause est le moment où une maintenance a pu commencer — ou finir.
    refetchOnWindowFocus: true,
  });
}

/**
 * Réponse de `GET /quartiers/delivery-fee`.
 *
 * `fee` est **toujours** le prix que paie le client, dans les trois modes :
 * c'est la seule clé à lire pour un montant. Les champs du mode `PLATFORM`
 * (F3-02) servent à l'expliquer — part offerte par le vendeur, seuil de
 * livraison offerte.
 */
export interface DeliveryFeeQuote {
  mode: 'FIXED' | 'ZONE_BASED' | 'PLATFORM';
  fee: number;
  zoneName?: string | null;
  quartierName?: string;
  /** Le quartier n'appartient à aucune zone : le serveur retombe sur le fixe. */
  isDefaultZone?: boolean;
  /** `PLATFORM` — prix de base de la grille, avant la part offerte. */
  baseFee?: number;
  /** `PLATFORM` — part offerte par le vendeur, retenue sur son reversement. */
  vendorSubsidy?: number;
  distanceKm?: number | null;
  tariffVersion?: number;
  /** `PLATFORM` — « livraison offerte dès X FCFA », `null` sinon. */
  freeDeliveryThreshold?: number | null;
}

/**
 * Devis de livraison du serveur pour un vendeur et un quartier
 * (`GET /quartiers/delivery-fee`, public).
 *
 * C'est **la même méthode** que celle appelée au checkout, y compris son repli
 * « quartier hors zone → tarif fixe » et, en mode plateforme, la grille et la
 * part offerte par le vendeur. Le web n'a aucune règle de prix à reproduire.
 *
 * `subTotal` ne sert qu'au seuil « livraison offerte dès X » : le devis ne
 * dépend du panier que par lui.
 */
export function useDeliveryFeeQuote(
  restaurantId: string | null | undefined,
  quartierId: string | null | undefined,
  subTotal?: number | null,
) {
  const sub = subTotal != null ? Math.max(0, Math.round(subTotal)) : null;
  return useQuery({
    queryKey: pricingKeys.deliveryQuote(restaurantId ?? '', quartierId ?? '', sub),
    queryFn: () => {
      const params = new URLSearchParams({
        restaurantId: restaurantId!,
        quartierId: quartierId!,
      });
      if (sub != null) params.set('subTotal', String(sub));
      return apiClient<DeliveryFeeQuote>(
        `/quartiers/delivery-fee?${params.toString()}`,
      );
    },
    enabled: !!restaurantId && !!quartierId,
    staleTime: 5 * 60 * 1000,
    // Changer une quantité change la clé : garder le devis précédent affiché
    // évite de faire clignoter le total à chaque clic. Seulement pour le même
    // vendeur et le même quartier — un autre quartier est un autre prix, et
    // l'afficher le temps de la requête serait annoncer un montant faux.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === (restaurantId ?? '') &&
      previousQuery?.queryKey[2] === (quartierId ?? '')
        ? previous
        : undefined,
  });
}
