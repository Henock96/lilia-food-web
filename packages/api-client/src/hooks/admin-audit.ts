'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AdminAuditAction, PaginatedAuditLog } from '@lilia/types';
import { apiClientRaw } from '../client';

export const auditLogKeys = {
  list: (page: number, action: AdminAuditAction | '') => ['admin', 'audit-log', page, action] as const,
};

export const AUDIT_LOG_PAGE_SIZE = 30;

/**
 * Journal d'audit (`GET /admin/audit-log`, ADMIN) — lecture seule.
 *
 * Seul l'Admin Flutter le lisait (ADM-PARITY-001) : depuis le Web, impossible
 * de savoir qui avait posé un blocage de version ou changé la valeur d'un
 * point. La réponse est déjà `{ data, meta }` : `apiClientRaw`.
 */
export function useAuditLog(token: string | null, page: number, action: AdminAuditAction | '') {
  return useQuery({
    queryKey: auditLogKeys.list(page, action),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(AUDIT_LOG_PAGE_SIZE) });
      if (action) params.set('action', action);
      return apiClientRaw<PaginatedAuditLog>(`/admin/audit-log?${params.toString()}`, { token });
    },
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}
