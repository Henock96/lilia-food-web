'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateVendorOnboardingDto,
  CreateVendorResponse,
  OnboardingReport,
  Restaurant,
  UpdateVendorCommerceDto,
  UpdateVendorDeliveryDto,
  UpdateVendorIdentityDto,
  UpdateVendorLocationDto,
} from '@lilia/types';
import { apiClient } from '../client';
import { adminVendorKeys } from './admin-vendors';

export const onboardingKeys = {
  all: ['vendor-onboarding'] as const,
  state: (id: string) => [...onboardingKeys.all, 'state', id] as const,
  preview: (id: string) => [...onboardingKeys.all, 'preview', id] as const,
};

/** Chaque section renvoie le vendeur ET la checklist recalculée. */
interface SectionResponse {
  vendor: Restaurant;
  readiness: OnboardingReport | null;
}

/**
 * Invalide tout ce qui dépend de l'état d'un vendeur.
 *
 * Chaque enregistrement de section peut faire basculer la checklist de DRAFT à
 * READY : sans cette invalidation, le wizard afficherait une progression figée
 * et l'administrateur ne saurait pas qu'il peut activer.
 */
function invalidateVendor(
  queryClient: ReturnType<typeof useQueryClient>,
  vendorId: string,
) {
  void queryClient.invalidateQueries({ queryKey: onboardingKeys.state(vendorId) });
  void queryClient.invalidateQueries({ queryKey: onboardingKeys.preview(vendorId) });
  void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
}

/** Checklist « prêt à vendre » — source de vérité du wizard. */
export function useVendorOnboarding(token: string | null, vendorId: string | null) {
  return useQuery({
    queryKey: onboardingKeys.state(vendorId ?? ''),
    queryFn: () =>
      apiClient<OnboardingReport>(`/vendors/${vendorId}/onboarding`, { token }),
    enabled: !!token && !!vendorId,
    // Pas de `staleTime` : la checklist doit refléter la dernière écriture, y
    // compris celles faites depuis un autre écran (catalogue, photos).
    staleTime: 0,
  });
}

/** Aperçu de la boutique telle que le client la verra. */
export function useVendorPreview(token: string | null, vendorId: string | null) {
  return useQuery({
    queryKey: onboardingKeys.preview(vendorId ?? ''),
    queryFn: () =>
      apiClient<{ vendor: Restaurant; readiness: OnboardingReport | null }>(
        `/vendors/${vendorId}/preview`,
        { token },
      ),
    enabled: !!token && !!vendorId,
    staleTime: 0,
  });
}

/**
 * Étape 1 — crée le vendeur et le compte de son propriétaire.
 *
 * L'`Idempotency-Key` est générée par requête : un double-clic ou un retry
 * réseau rejoue la réponse au lieu de créer un second vendeur avec un second
 * compte Firebase.
 */
export function useCreateVendorOnboarding(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateVendorOnboardingDto) =>
      apiClient<CreateVendorResponse>('/admin/vendors', {
        method: 'POST',
        token,
        body: JSON.stringify(dto),
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminVendorKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/** Fabrique les mutations de section — même forme pour les quatre. */
function useSectionMutation<TDto>(
  token: string | null,
  vendorId: string | null,
  path: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: TDto) =>
      apiClient<SectionResponse>(`/vendors/${vendorId}/${path}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => vendorId && invalidateVendor(queryClient, vendorId),
  });
}

export const useUpdateVendorIdentity = (t: string | null, id: string | null) =>
  useSectionMutation<UpdateVendorIdentityDto>(t, id, 'identity');

export const useUpdateVendorLocation = (t: string | null, id: string | null) =>
  useSectionMutation<UpdateVendorLocationDto>(t, id, 'location');

export const useUpdateVendorDelivery = (t: string | null, id: string | null) =>
  useSectionMutation<UpdateVendorDeliveryDto>(t, id, 'delivery');

export interface VendorHoursInput {
  hours: {
    dayOfWeek: string;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
  }[];
}

export const useUpdateVendorHours = (t: string | null, id: string | null) =>
  useSectionMutation<VendorHoursInput>(t, id, 'hours');

/** Étape 7 — commission et paramètres commerciaux. ADMIN uniquement. */
export function useUpdateVendorCommerce(token: string | null, vendorId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateVendorCommerceDto) =>
      apiClient<SectionResponse>(`/admin/vendors/${vendorId}/commerce`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => vendorId && invalidateVendor(queryClient, vendorId),
  });
}

/**
 * Étape 10 — activation.
 *
 * Le backend refuse (409) si la checklist bloquante est incomplète, et une
 * seconde fois si des éléments recommandés manquent — d'où
 * `skipRecommendations`, que l'interface propose comme confirmation explicite
 * plutôt que d'envoyer d'emblée.
 */
export function useActivateVendorOnboarding(
  token: string | null,
  vendorId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts: { skipRecommendations?: boolean } = {}) =>
      apiClient<Restaurant>(`/admin/vendors/${vendorId}/activate`, {
        method: 'POST',
        token,
        body: JSON.stringify(opts),
      }),
    onSuccess: () => {
      if (vendorId) invalidateVendor(queryClient, vendorId);
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });
}

/** Renvoie l'invitation d'activation au propriétaire. */
export function useResendVendorInvitation(token: string | null) {
  return useMutation({
    mutationFn: (vendorId: string) =>
      apiClient<{ emailSent: boolean; activationLink?: string; detail: string }>(
        `/admin/vendors/${vendorId}/resend-invitation`,
        { method: 'POST', token },
      ),
  });
}
