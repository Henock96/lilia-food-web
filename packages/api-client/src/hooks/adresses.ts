'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Adresse, CreateAdresseDto, Quartier } from '@lilia/types';
import { apiClient } from '../client';

export const adresseKeys = {
  all: ['adresses'] as const,
  list: () => [...adresseKeys.all, 'list'] as const,
};

export function useQuartiers() {
  return useQuery({
    queryKey: ['quartiers'],
    queryFn: () => apiClient<Quartier[]>('/quartiers'),
    staleTime: 60 * 60 * 1000,
  });
}

export function useAdresses(token: string | null) {
  return useQuery({
    queryKey: adresseKeys.list(),
    queryFn: () => apiClient<Adresse[]>('/adresses', { token }),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
}

export function useCreateAdresse(token: string | null) {
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

export function useSetDefaultAdresse(token: string | null) {
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

export function useDeleteAdresse(token: string | null) {
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
