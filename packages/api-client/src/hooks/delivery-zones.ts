'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateDeliveryZoneDto,
  DeliveryZone,
  UpdateDeliveryZoneDto,
  VendorDeliveryZones,
} from '@lilia/types';
import { apiClient } from '../client';
import { adminVendorKeys } from './admin-vendors';
import { onboardingKeys } from './vendor-onboarding';

/**
 * Grille tarifaire de livraison d'un vendeur — **vue gestionnaire**.
 *
 * ### Quelle route, et pourquoi pas les deux autres
 *
 * Trois routes lisent des zones, et deux d'entre elles sont des pièges pour un
 * back-office :
 *
 * | Route | Ce qu'elle rend | Pourquoi pas ici |
 * |---|---|---|
 * | `GET /quartiers/restaurant-zones` | publique | filtrée sur la frontière marketplace → **404 sur un vendeur en configuration ou suspendu**, c'est-à-dire celui qu'on administre |
 * | `GET /quartiers/my-zones` | le vendeur **du compte connecté** | un ADMIN ne possède aucun vendeur → **403** |
 * | `GET /vendors/:id/delivery-zones` | par identifiant, ADMIN ou propriétaire | ✅ |
 *
 * C'est le même arbitrage que pour le catalogue (`/products/manage`) et les
 * galeries (`/vendor-photos/mine`) : *« qu'y a-t-il à acheter »* et *« qu'ai-je
 * à gérer »* sont deux questions, donc deux requêtes.
 */
export const deliveryZoneKeys = {
  all: ['delivery-zones'] as const,
  vendor: (vendorId: string) => ['delivery-zones', vendorId] as const,
};

export function useVendorDeliveryZones(
  token: string | null,
  vendorId: string | null,
) {
  return useQuery({
    queryKey: deliveryZoneKeys.vendor(vendorId ?? ''),
    queryFn: () =>
      apiClient<VendorDeliveryZones>(`/vendors/${vendorId}/delivery-zones`, {
        token,
      }),
    enabled: !!token && !!vendorId,
    // Pas de `staleTime` : la couverture est recalculée par le serveur à chaque
    // écriture de zone. La lire périmée afficherait un bandeau d'alerte qui ne
    // correspond plus à la grille affichée juste au-dessus.
    staleTime: 0,
  });
}

/**
 * Invalide tout ce qui dépend de la configuration de livraison.
 *
 * `onboardingKeys.state` en fait partie : la checklist « prêt à vendre »
 * contient la règle « ZONE_BASED ⇒ au moins une zone ». Créer la première zone
 * d'un vendeur peut donc le faire passer de `DRAFT` à `READY` — sans cette
 * invalidation, le wizard resterait bloqué sur un manque déjà comblé.
 */
function invalidateDelivery(
  queryClient: ReturnType<typeof useQueryClient>,
  vendorId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: deliveryZoneKeys.vendor(vendorId),
  });
  void queryClient.invalidateQueries({ queryKey: onboardingKeys.state(vendorId) });
  void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
}

/**
 * `POST /quartiers/zones/:restaurantId`.
 *
 * ⚠️ Les écritures restent sous `/quartiers` : elles acceptent déjà l'ADMIN
 * (le contrôle de propriété passe par `verifyOwnership`, qui laisse passer le
 * rôle ADMIN). Seule la **lecture** par identifiant manquait. Créer des routes
 * d'écriture jumelles sous `/vendors` ferait deux portes sur la même chose —
 * exactement le défaut relevé pour `delivery-settings`.
 */
export function useCreateDeliveryZone(token: string | null, vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDeliveryZoneDto) =>
      apiClient<DeliveryZone>(`/quartiers/zones/${vendorId}`, {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => invalidateDelivery(queryClient, vendorId),
  });
}

/** `PATCH /quartiers/zones/:zoneId`. */
export function useUpdateDeliveryZone(token: string | null, vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      zoneId,
      ...dto
    }: UpdateDeliveryZoneDto & { zoneId: string }) =>
      apiClient<DeliveryZone>(`/quartiers/zones/${zoneId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => invalidateDelivery(queryClient, vendorId),
  });
}

/**
 * `DELETE /quartiers/zones/:zoneId`.
 *
 * Le serveur refuse (400) la suppression de la **dernière** zone d'un vendeur
 * qui facture à la zone : sans elle, toutes ses livraisons basculeraient en
 * silence sur le tarif de repli. Le message porte la sortie possible (repasser
 * en tarif fixe) — il faut l'afficher tel quel, pas le remplacer.
 */
export function useDeleteDeliveryZone(token: string | null, vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zoneId: string) =>
      apiClient<void>(`/quartiers/zones/${zoneId}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => invalidateDelivery(queryClient, vendorId),
  });
}
