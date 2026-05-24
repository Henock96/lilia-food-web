'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useIncident, useUpdateIncident } from '@lilia/api-client';
import type { IncidentStatus } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { TYPE_LABELS, SEVERITY_STYLES } from '../page';
import { ArrowLeft, Copy, Check, Play, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_LABELS: Record<IncidentStatus, string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Fermé',
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  OPEN: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/30',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  RESOLVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  CLOSED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600',
};

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const { data: incident, isLoading, isError } = useIncident(token, id);
  const update = useUpdateIncident(token, id);

  const [resolution, setResolution] = useState('');

  // Pré-fill une seule fois quand l'incident est chargé (ou mis à jour).
  useEffect(() => {
    if (incident?.resolution) setResolution(incident.resolution);
  }, [incident?.resolution]);

  function handleStatusChange(target: IncidentStatus) {
    const needsResolution = target === 'RESOLVED' || target === 'CLOSED';
    if (needsResolution && !resolution.trim()) {
      toast.error('Ajoutez une note de résolution avant de clôturer');
      return;
    }
    update.mutate(
      {
        status: target,
        ...(needsResolution && { resolution: resolution.trim() }),
      },
      {
        onSuccess: () => toast.success(`Statut mis à jour : ${STATUS_LABELS[target]}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
      },
    );
  }

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div className="max-w-3xl">
        <Link href="/incidents" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4">
          <ArrowLeft size={14} /> Retour aux incidents
        </Link>
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-2" size={28} />
          <p className="text-sm text-red-700 dark:text-red-400">Impossible de charger cet incident.</p>
        </div>
      </div>
    );
  }

  const isTerminal = incident.status === 'RESOLVED' || incident.status === 'CLOSED';
  const dateFmt = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/incidents" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft size={14} /> Retour aux incidents
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <div className="flex items-start gap-3">
          <div className={`w-1.5 self-stretch rounded-full ${severityBarColor(incident.severity)}`} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {incident.title}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{TYPE_LABELS[incident.type]}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${SEVERITY_STYLES[incident.severity]}`}>
                Sévérité {incident.severity}
              </span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[incident.status]}`}>
                {STATUS_LABELS[incident.status]}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-4 leading-relaxed">
          {incident.description}
        </p>
      </div>

      {/* Refs */}
      <Section title="Références">
        <KeyValue label="ID" value={incident.id} onCopy={() => copy('ID', incident.id)} mono />
        {incident.orderId && (
          <KeyValue label="Commande" value={incident.orderId} onCopy={() => copy('Commande', incident.orderId!)} mono />
        )}
        {incident.restaurantId && (
          <KeyValue label="Restaurant" value={incident.restaurantId} onCopy={() => copy('Restaurant', incident.restaurantId!)} mono />
        )}
        {incident.riderId && (
          <KeyValue label="Livreur" value={incident.riderId} onCopy={() => copy('Livreur', incident.riderId!)} mono />
        )}
        {incident.reportedBy && (
          <KeyValue label="Reporté par" value={incident.reportedBy} mono />
        )}
        {incident.resolvedBy && (
          <KeyValue label="Résolu par" value={incident.resolvedBy} mono />
        )}
      </Section>

      <Section title="Chronologie">
        <KeyValue label="Créé le" value={dateFmt.format(new Date(incident.createdAt))} />
        <KeyValue label="Mis à jour" value={dateFmt.format(new Date(incident.updatedAt))} />
        {incident.resolvedAt && (
          <KeyValue label="Résolu le" value={dateFmt.format(new Date(incident.resolvedAt))} />
        )}
      </Section>

      {incident.metadata && Object.keys(incident.metadata).length > 0 && (
        <Section title="Contexte">
          <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(incident.metadata, null, 2)}
          </pre>
        </Section>
      )}

      {/* Resolution */}
      <Section title="Résolution">
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          disabled={isTerminal || update.isPending}
          rows={3}
          placeholder={isTerminal ? 'Incident clôturé' : 'Décrire ce qui a été fait pour résoudre…'}
          className="w-full text-sm border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all disabled:bg-zinc-50 dark:disabled:bg-zinc-800/60 disabled:cursor-not-allowed"
        />

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {incident.status === 'OPEN' && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={update.isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Play size={14} /> Prendre en charge
            </button>
          )}
          {!isTerminal && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={update.isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Check size={14} /> Marquer résolu
            </button>
          )}
          {incident.status === 'RESOLVED' && (
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={update.isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors disabled:opacity-50"
            >
              <Lock size={14} /> Fermer définitivement
            </button>
          )}
          {incident.status === 'CLOSED' && (
            <p className="text-xs text-zinc-400 italic">Incident fermé — plus aucune action possible.</p>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
      <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-28 shrink-0 text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">{label}</span>
      <span className={`flex-1 ${mono ? 'font-mono text-xs' : ''} text-zinc-800 dark:text-zinc-200 break-all`}>
        {value}
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-0.5"
          aria-label={`Copier ${label}`}
        >
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

function severityBarColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500';
    case 'HIGH':     return 'bg-orange-500';
    case 'MEDIUM':   return 'bg-amber-500';
    default:         return 'bg-zinc-400';
  }
}
