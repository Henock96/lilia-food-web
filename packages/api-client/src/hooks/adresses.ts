'use client';
import type { AuthCredential } from '../auth-session';

import { useQuery, useMutation, useQueryClient } from '../session-query';
import type { Adresse, CreateAdresseDto, Quartier } from '@lilia/types';
import { apiClient } from '../client';

export const adresseKeys = {
  all: ['adresses'] as const,
  list: () => [...adresseKeys.all, 'list'] as const,
};

export function useQuartiers() {
  return useQuery({
    queryKey: ['quartiers'],
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<Quartier[]>('/quartiers', { signal }),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAdresses(token: AuthCredential | null) {
  return useQuery({
    queryKey: adresseKeys.list(),
    queryFn: ({ signal }: { signal?: AbortSignal } = {}) => apiClient<Adresse[]>('/adresses', { signal, token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useCreateAdresse(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAdresseDto) =>
      apiClient<Adresse>('/adresses', {
        method: 'POST',
        body: JSON.stringify(dto),
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adresseKeys.list() });
    },
  });
}

export function useSetDefaultAdresse(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<Adresse>(`/adresses/${id}/default`, {
        method: 'PATCH',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adresseKeys.list() });
    },
  });
}

export function useDeleteAdresse(token: AuthCredential | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/adresses/${id}`, {
        method: 'DELETE',
        token,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adresseKeys.list() });
    },
  });
}
