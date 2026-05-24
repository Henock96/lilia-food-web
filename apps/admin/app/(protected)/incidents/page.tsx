'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useIncidents, INCIDENTS_PAGE_SIZE } from '@lilia/api-client';
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
} from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowIcon,
} from 'lucide-react';

const STATUSES: IncidentStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const TYPES: IncidentType[] = [
  'ORDER_CANCELLED',
  'ORDER_DELAYED',
  'PAYMENT_FAILED',
  'DRIVER_NO_SHOW',
  'DRIVER_ACCIDENT',
  'CUSTOMER_COMPLAINT',
  'RESTAURANT_CLOSED',
  'STOCK_ISSUE',
  'WRONG_DELIVERY',
  'REFUND_REQUEST',
  'OTHER',
];

const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export const TYPE_LABELS: Record<IncidentType, string> = {
  ORDER_CANCELLED: 'Commande annulée',
  ORDER_DELAYED: 'Retard de livraison',
  PAYMENT_FAILED: 'Échec paiement',
  DRIVER_NO_SHOW: 'Livreur absent',
  DRIVER_ACCIDENT: 'Accident livreur',
  CUSTOMER_COMPLAINT: 'Plainte client',
  RESTAURANT_CLOSED: 'Restaurant fermé',
  STOCK_ISSUE: 'Problème de stock',
  WRONG_DELIVERY: 'Mauvaise livraison',
  REFUND_REQUEST: 'Demande de remboursement',
  OTHER: 'Autre',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  RESOLVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  CLOSED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400 border-red-300/60 dark:border-red-500/40',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 border-orange-300/60 dark:border-orange-500/40',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border-amber-300/60 dark:border-amber-500/40',
  LOW: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300/60 dark:border-zinc-600/40',
};

export default function IncidentsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<IncidentStatus | undefined>('OPEN');
  const [severity, setSeverity] = useState<IncidentSeverity | undefined>();
  const [type, setType] = useState<IncidentType | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, isPlaceholderData } = useIncidents(token, {
    status,
    severity,
    type,
    page,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / INCIDENTS_PAGE_SIZE));

  function reset<T>(setter: (v: T | undefined) => void, value: T | undefined) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="max-w-5xl space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-1.5">
        <FilterButton
          active={status === undefined}
          onClick={() => reset(setStatus, undefined)}
          label="Tous statuts"
        />
        {STATUSES.map((s) => (
          <FilterButton
            key={s}
            active={status === s}
            onClick={() => reset(setStatus, s)}
            label={STATUS_LABELS[s]}
          />
        ))}
      </div>

      {/* Severity + Type filters */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <FilterButton
          active={severity === undefined}
          onClick={() => reset(setSeverity, undefined)}
          label="Toute sévérité"
        />
        {SEVERITIES.map((s) => (
          <FilterButton
            key={s}
            active={severity === s}
            onClick={() => reset(setSeverity, s)}
            label={SEVERITY_LABELS[s]}
          />
        ))}
        <span className="mx-2 h-5 w-px bg-zinc-200 dark:bg-dark-border" />
        <select
          value={type ?? ''}
          onChange={(e) => reset(setType, (e.target.value || undefined) as IncidentType | undefined)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
        >
          <option value="">Tous types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les incidents.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <AlertTriangle size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">Aucun incident pour ces filtres</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((incident) => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        )}

        {total > INCIDENTS_PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {total} incident{total > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                aria-label="Page précédente"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                aria-label="Page suivante"
                onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <Link
      href={`/incidents/${incident.id}`}
      className="flex items-center gap-4 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
    >
      {/* Severity bar */}
      <div className={`w-1 self-stretch rounded-full ${severityBarColor(incident.severity)}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {incident.title}
          </p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${SEVERITY_STYLES[incident.severity]}`}>
            {SEVERITY_LABELS[incident.severity]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{TYPE_LABELS[incident.type]}</span>
          <span>·</span>
          <span>{new Date(incident.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          {incident.orderId && (
            <>
              <span>·</span>
              <span className="font-mono">#{incident.orderId.slice(-6).toUpperCase()}</span>
            </>
          )}
        </div>
      </div>

      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[incident.status]}`}>
        {STATUS_LABELS[incident.status]}
      </span>
      <ArrowIcon size={14} className="text-zinc-300 group-hover:text-zinc-500 transition-colors shrink-0" />
    </Link>
  );
}

function severityBarColor(severity: IncidentSeverity): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500';
    case 'HIGH':     return 'bg-orange-500';
    case 'MEDIUM':   return 'bg-amber-500';
    case 'LOW':      return 'bg-zinc-400';
  }
}
