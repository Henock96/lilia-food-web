'use client';

import { useQuery } from '@tanstack/react-query';
import type { OpsQueue } from '@lilia/types';
import { apiClient } from '../client';

export const opsKeys = {
  queue: ['admin', 'ops', 'queue'] as const,
};

/**
 * Cockpit ops « À traiter » (F3-04). Les files sont **calculées** par le
 * serveur : une carte disparaît d'elle-même quand sa condition cesse d'être
 * vraie. Relire chaque minute suffit — c'est aussi la cadence du scan
 * d'alerte côté serveur.
 */
export function useOpsQueue(token: string | null) {
  return useQuery({
    queryKey: opsKeys.queue,
    queryFn: () => apiClient<OpsQueue>('/admin/ops/queue', { token }),
    enabled: !!token,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
