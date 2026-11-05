'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery, useMutation, useQueryClient } from '../session-query';
import type { User, UpdateProfileDto, ReferralStats, LoyaltyTransaction } from '@lilia/types';
import { apiClient } from '../client';

export const profileKeys = {
  me: ['profile', 'me'] as const,
  referral: ['profile', 'referral'] as const,
  loyalty: ['profile', 'loyalty'] as const,
};

export function useProfile(token: AuthCredential | null) {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}) => {
      const res = await apiClient<{ user: User } | User>('/users/me', { signal, token });
      return ('user' in res ? res.user : res) as User;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useReferralStats(token: AuthCredential | null) {
  return useQuery({
    queryKey: profileKeys.referral,
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<ReferralStats>('/users/me/referral-stats', { signal, token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useLoyaltyTransactions(token: AuthCredential | null) {
  return useQuery({
    queryKey: profileKeys.loyalty,
    queryFn: async ({ signal }: { signal?: AbortSignal } = {}) => {
      const res = await apiClient<{ data: LoyaltyTransaction[] } | LoyaltyTransaction[]>('/users/me/loyalty', { signal, token });
      return Array.isArray(res) ? res : (res as { data: LoyaltyTransaction[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useUpdateProfile(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateProfileDto) =>
      apiClient<{ user: User }>('/users/me', {
        method: 'PUT',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}

/**
 * Suppression du compte de l'appelant (anonymisation côté serveur). Le serveur
 * l'identifie par son jeton et refuse en 409 tant qu'une commande, une boutique
 * ou une livraison est en cours.
 */
export async function deleteAccountRequest(
  token: AuthCredential | null,
  request: typeof apiClient = apiClient,
): Promise<void> {
  await request('/users/me', { method: 'DELETE', token });
}

export function useDeleteAccount(token: AuthCredential | null) {
  return useMutation({ mutationFn: () => deleteAccountRequest(token) });
}
