'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CurrentDeliveryTariff,
  DeliverySubsidySimulation,
  DeliveryTariff,
  DeliveryTariffDraftDto,
  DeliveryTariffSimulation,
  UpdateDeliverySubsidyDto,
} from '@lilia/types';
import { apiClient } from '../client';
import { adminVendorKeys } from './admin-vendors';
import { pricingKeys } from './pricing';
import { restaurantKeys } from './restaurants';
import { onboardingKeys } from './vendor-onboarding';

/**
 * Grille de livraison plateforme (F3-02).
 *
 * Le prix de la course n'appartient plus au vendeur : l'administration publie
 * une grille versionnée (brouillon → publiée → retirée), le vendeur peut
 * seulement offrir une part de la livraison à ses clients. **Aucun prix n'est
 * calculé ici** : tout montant affiché vient d'une réponse serveur.
 */
export const deliveryTariffKeys = {
  all: ['delivery-tariffs'] as const,
  list: ['delivery-tariffs', 'list'] as const,
  current: ['delivery-tariffs', 'current'] as const,
  subsidySimulation: (vendorId: string, dto: UpdateDeliverySubsidyDto) =>
    ['delivery-tariffs', 'subsidy-simulation', vendorId, dto] as const,
};

/** `GET /admin/delivery-tariffs` — toutes les versions, la plus récente d'abord. */
export function useDeliveryTariffs(token: string | null) {
  return useQuery({
    queryKey: deliveryTariffKeys.list,
    queryFn: () => apiClient<DeliveryTariff[]>('/admin/delivery-tariffs', { token }),
    enabled: !!token,
  });
}

/** `GET /delivery-tariffs/current` — mode et grille en vigueur (vendeur, admin). */
export function useCurrentDeliveryTariff(token: string | null) {
  return useQuery({
    queryKey: deliveryTariffKeys.current,
    queryFn: () =>
      apiClient<CurrentDeliveryTariff>('/delivery-tariffs/current', { token }),
    enabled: !!token,
  });
}

/**
 * Tout ce qui lit un prix dépend de la grille : la liste, la vue vendeur, et
 * le plancher « dès X » servi par `GET /platform-settings`.
 */
function invalidateTariffs(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: deliveryTariffKeys.all });
  void queryClient.invalidateQueries({ queryKey: pricingKeys.platformSettings });
}

export function useCreateDeliveryTariff(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: DeliveryTariffDraftDto) =>
      apiClient<DeliveryTariff>('/admin/delivery-tariffs', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => invalidateTariffs(queryClient),
  });
}

/** Remplace un brouillon. 409 s'il a été publié entre-temps. */
export function useUpdateDeliveryTariff(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: DeliveryTariffDraftDto & { id: string }) =>
      apiClient<DeliveryTariff>(`/admin/delivery-tariffs/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => invalidateTariffs(queryClient),
  });
}

export function useDeleteDeliveryTariff(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/admin/delivery-tariffs/${id}`, { method: 'DELETE', token }),
    onSuccess: () => invalidateTariffs(queryClient),
  });
}

/**
 * Publication : la grille en vigueur passe `RETIRED` dans la même transaction.
 * Elle s'applique aux **prochaines** commandes ; les commandes passées gardent
 * la version figée à leur création.
 */
export function usePublishDeliveryTariff(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<DeliveryTariff>(`/admin/delivery-tariffs/${id}/publish`, {
        method: 'POST',
        token,
      }),
    onSuccess: () => invalidateTariffs(queryClient),
  });
}

/** Lecture seule côté serveur, mais déclenchée à la demande : une mutation. */
export function useSimulateDeliveryTariff(token: string | null) {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<DeliveryTariffSimulation>(`/admin/delivery-tariffs/${id}/simulate`, {
        method: 'POST',
        token,
      }),
  });
}

/** `PATCH /vendors/:id/delivery-subsidy` — propriétaire ou admin. */
export function useUpdateDeliverySubsidy(token: string | null, vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateDeliverySubsidyDto) =>
      apiClient<{
        id: string;
        deliverySubsidyMode: UpdateDeliverySubsidyDto['mode'];
        deliverySubsidyXaf: number | null;
        freeDeliveryThresholdXaf: number | null;
      }>(`/vendors/${vendorId}/delivery-subsidy`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.all });
    },
  });
}

/**
 * « Sur vos 30 dernières commandes livrées, ce réglage vous aurait coûté X ».
 * Désactivé tant que le réglage n'est pas complet (montant ou seuil manquant).
 */
export function useDeliverySubsidySimulation(
  token: string | null,
  vendorId: string | null,
  dto: UpdateDeliverySubsidyDto | null,
) {
  return useQuery({
    queryKey: deliveryTariffKeys.subsidySimulation(vendorId ?? '', dto ?? { mode: 'NONE' }),
    queryFn: () => {
      const params = new URLSearchParams({ mode: dto!.mode });
      if (dto!.amountXaf != null) params.set('amountXaf', String(dto!.amountXaf));
      if (dto!.thresholdXaf != null) params.set('thresholdXaf', String(dto!.thresholdXaf));
      return apiClient<DeliverySubsidySimulation>(
        `/vendors/${vendorId}/delivery-subsidy/simulate?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token && !!vendorId && !!dto,
  });
}
