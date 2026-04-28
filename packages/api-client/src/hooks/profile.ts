'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User, UpdateProfileDto, ReferralStats, LoyaltyTransaction } from '@lilia/types';
import { apiClient } from '../client';

export const profileKeys = {
  me: ['profile', 'me'] as const,
  referral: ['profile', 'referral'] as const,
  loyalty: ['profile', 'loyalty'] as const,
};

export function useProfile(token: string | null) {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: async () => {
      const res = await apiClient<{ user: User } | User>('/users/me', { token });
      return ('user' in res ? res.user : res) as User;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useReferralStats(token: string | null) {
  return useQuery({
    queryKey: profileKeys.referral,
    queryFn: () => apiClient<ReferralStats>('/users/me/referral-stats', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useLoyaltyTransactions(token: string | null) {
  return useQuery({
    queryKey: profileKeys.loyalty,
    queryFn: async () => {
      const res = await apiClient<{ data: LoyaltyTransaction[] } | LoyaltyTransaction[]>('/users/me/loyalty', { token });
      return Array.isArray(res) ? res : (res as { data: LoyaltyTransaction[] }).data ?? [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
}

export function useUpdateProfile(token: string | null) {
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
