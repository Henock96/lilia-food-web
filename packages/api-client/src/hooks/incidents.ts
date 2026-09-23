'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  PaginatedIncidents,
} from '@lilia/types';
import { apiClient, apiClientRaw } from '../client';

const PAGE_SIZE = 20;

export const incidentKeys = {
  all: ['incidents'] as const,
  list: (filters: IncidentsFilters) =>
    [...incidentKeys.all, 'list', filters] as const,
  detail: (id: string) => [...incidentKeys.all, 'detail', id] as const,
};

export interface IncidentsFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  type?: IncidentType;
  page: number;
}

/**
 * Liste paginée des incidents (`GET /incidents`).
 *
 * Le backend renvoie `{ data: Incident[], total: number }` directement (pas
 * de wrapper supplémentaire) — on passe par `apiClientRaw` pour ne pas perdre
 * `total` au déballage.
 */
export function useIncidents(
  token: string | null,
  filters: IncidentsFilters,
) {
  return useQuery({
    queryKey: incidentKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String((filters.page - 1) * PAGE_SIZE));
      if (filters.status) params.set('status', filters.status);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.type) params.set('type', filters.type);
      // Contrat v2 : `{ data, total }` normalisé en `{ data, meta: { total } }`
      // (interceptor règle 3b). `apiClientRaw` préserve l'enveloppe.
      return apiClientRaw<PaginatedIncidents>(
        `/incidents?${params.toString()}`,
        { token },
      );
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });
}

/** Détail d'un incident (`GET /incidents/:id`). */
export function useIncident(token: string | null, id: string) {
  return useQuery({
    queryKey: incidentKeys.detail(id),
    queryFn: () => apiClient<Incident>(`/incidents/${id}`, { token }),
    enabled: !!token && !!id,
  });
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  resolution?: string;
}

/**
 * Met à jour le status / resolution (`PATCH /incidents/:id`).
 * Le backend stamp `resolvedBy` et `resolvedAt` automatiquement quand le
 * status passe à RESOLVED ou CLOSED.
 */
export function useUpdateIncident(token: string | null, id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateIncidentDto) =>
      apiClient<Incident>(`/incidents/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: incidentKeys.all });
    },
  });
}

export const INCIDENTS_PAGE_SIZE = PAGE_SIZE;

// ─── Signalement client (Master Audit v1, F-06) ─────────────────────────────

/** Motifs qu'un client peut signaler — même liste fermée que le serveur. */
export const ORDER_ISSUE_KINDS = [
  { kind: 'NOT_RECEIVED', label: 'Je n’ai pas reçu ma commande' },
  { kind: 'WRONG_ORDER', label: 'Commande erronée ou incomplète' },
  { kind: 'LATE', label: 'Ma commande est très en retard' },
  { kind: 'OTHER', label: 'Autre problème' },
] as const;

export type OrderIssueKind = (typeof ORDER_ISSUE_KINDS)[number]['kind'];

/** Requête de signalement, exécutable sans React (tests de contrat). */
export function reportOrderIssueRequest(
  orderId: string,
  kind: OrderIssueKind,
  message?: string,
) {
  const trimmed = message?.trim();
  return {
    path: `/incidents/orders/${orderId}/report`,
    body: { kind, ...(trimmed ? { message: trimmed } : {}) },
  };
}

/**
 * Le client signale un problème sur SA commande. Le serveur ouvre un incident
 * (un seul ouvert par commande) et prévient l'équipe.
 */
export function useReportOrderIssue(token: string | null) {
  return useMutation({
    mutationFn: ({
      orderId,
      kind,
      message,
    }: {
      orderId: string;
      kind: OrderIssueKind;
      message?: string;
    }) => {
      const { path, body } = reportOrderIssueRequest(orderId, kind, message);
      return apiClientRaw<{ message?: string }>(path, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      });
    },
  });
}
