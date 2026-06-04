'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  useAdminDeliverers,
  useDelivererStats,
  useDelivererMissions,
} from '@lilia/api-client';
import type { AdminDeliverer, DeliveryStatus } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Bike,
  Copy,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  Package,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_FILTERS: { value: DeliveryStatus | ''; label: string }[] = [
  { value: '',            label: 'Toutes' },
  { value: 'EN_ATTENTE',  label: 'En attente' },
  { value: 'ASSIGNER',    label: 'Assignée' },
  { value: 'EN_TRANSIT',  label: 'En transit' },
  { value: 'LIVRER',      label: 'Livrée' },
  { value: 'ECHEC',       label: 'Échec' },
];

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  EN_ATTENTE: 'En attente',
  ASSIGNER:   'Assignée',
  EN_TRANSIT: 'En transit',
  LIVRER:     'Livrée',
  ECHEC:      'Échec',
};

const STATUS_STYLES: Record<DeliveryStatus, string> = {
  EN_ATTENTE: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  ASSIGNER:   'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  EN_TRANSIT: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  LIVRER:     'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  ECHEC:      'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

const formatXaf = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const dateTimeFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFmt = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function DelivererDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const [status, setStatus] = useState<DeliveryStatus | ''>('');
  const [page, setPage] = useState(1);

  const deliverer = useDelivererLookup(token, id);
  const { data: stats, isLoading: statsLoading } = useDelivererStats(token, id);
  const {
    data: missions,
    isLoading: missionsLoading,
    isError: missionsError,
    isPlaceholderData,
  } = useDelivererMissions(token, id, { status, page });

  const missionsList = missions?.data ?? [];
  const meta = missions?.meta;

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  }

  if (deliverer.isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (deliverer.isError || !deliverer.data) {
    return (
      <div className="max-w-4xl">
        <Link href="/livreurs" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-4">
          <ArrowLeft size={14} /> Retour aux livreurs
        </Link>
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-2" size={28} />
          <p className="text-sm text-red-700 dark:text-red-400">
            Livreur introuvable ou inaccessible.
          </p>
        </div>
      </div>
    );
  }

  const d = deliverer.data;
  const displayName = d.nom || d.email || 'Livreur';
  const initial = displayName.charAt(0).toUpperCase();
  const completedDeliveries = d._count?.deliveries ?? 0;

  return (
    <div className="max-w-5xl space-y-5">
      <Link
        href="/livreurs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={14} /> Retour aux livreurs
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
            {d.imageUrl ? (
              <Image
                src={d.imageUrl}
                alt={displayName}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-zinc-500">{initial}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {d.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={11} /> {d.email}
                </span>
              )}
              {d.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={11} /> {d.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar size={11} /> Inscrit le {longDateFmt.format(new Date(d.createdAt))}
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {d.phone && (
                <>
                  <a
                    href={`tel:${d.phone}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors"
                  >
                    <Phone size={12} /> Appeler
                  </a>
                  <a
                    href={`sms:${d.phone}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <MessageSquare size={12} /> SMS
                  </a>
                  <button
                    onClick={() => copy('Téléphone', d.phone!)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Copy size={12} /> Copier
                  </button>
                </>
              )}
              <button
                disabled
                title="Disponible quand le tracking web sera implémenté (LIL-100)"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 cursor-not-allowed"
              >
                <Map size={12} /> Tracker sur carte
              </button>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-zinc-400">
              <Package size={12} />
              <span>Historique</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">
              {completedDeliveries}
            </p>
            <p className="text-xs text-zinc-400">livraisons</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<CheckCircle2 size={14} className="text-emerald-500" />}
          label="Taux de succès"
          value={statsLoading ? '—' : `${stats?.successRate.toFixed(1) ?? 0}%`}
          sub={
            statsLoading
              ? '—'
              : `${stats?.deliveredCount ?? 0} livrées · ${stats?.failedCount ?? 0} échecs`
          }
          loading={statsLoading}
        />
        <StatCard
          icon={<TrendingUp size={14} className="text-amber-500" />}
          label="Revenu généré"
          value={statsLoading ? '—' : `${formatXaf(stats?.totalRevenueXAF ?? 0)}`}
          unit="XAF"
          sub={statsLoading ? '—' : 'Total cumulé'}
          loading={statsLoading}
        />
        <StatCard
          icon={<Clock size={14} className="text-blue-500" />}
          label="Temps moyen"
          value={
            statsLoading
              ? '—'
              : stats?.avgDeliveryMinutes != null
              ? `${stats.avgDeliveryMinutes.toFixed(0)}`
              : '—'
          }
          unit={stats?.avgDeliveryMinutes != null ? 'min' : ''}
          sub={statsLoading ? '—' : 'Par livraison réussie'}
          loading={statsLoading}
        />
        <StatCard
          icon={<Bike size={14} className="text-violet-500" />}
          label="30 derniers jours"
          value={statsLoading ? '—' : `${stats?.last30dDeliveries ?? 0}`}
          sub={
            statsLoading
              ? '—'
              : stats?.lastDeliveryAt
              ? `Dernière : ${dateTimeFmt.format(new Date(stats.lastDeliveryAt))}`
              : 'Aucune livraison'
          }
          loading={statsLoading}
        />
      </div>

      {/* In progress banner si stats indique des livraisons en cours */}
      {!statsLoading && stats && stats.inProgressCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Bike className="text-blue-600 shrink-0" size={18} />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              {stats.inProgressCount} livraison{stats.inProgressCount > 1 ? 's' : ''} en cours
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
              Filtre la liste sur « En transit » ou « Assignée » pour voir le détail
            </p>
          </div>
        </div>
      )}

      {/* Missions list */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Historique des missions
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value || 'ALL'}
                onClick={() => {
                  setStatus(f.value);
                  setPage(1);
                }}
                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  status === f.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
          {missionsLoading ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : missionsError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-red-500">Impossible de charger l'historique.</p>
            </div>
          ) : missionsList.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Package size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-400">
                {status ? `Aucune mission « ${STATUS_LABELS[status]} »` : 'Aucune mission pour ce livreur'}
              </p>
            </div>
          ) : (
            <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
              {missionsList.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                        #{m.orderId.slice(-6).toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[m.status]}`}>
                        {STATUS_LABELS[m.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {m.restaurantName || '—'} <span className="text-zinc-400">→</span> {m.clientName || '—'}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {dateTimeFmt.format(new Date(m.createdAt))}
                      {m.deliveredAt && ` · livrée à ${dateTimeFmt.format(new Date(m.deliveredAt))}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatXaf(m.totalXAF)} <span className="text-xs font-normal text-zinc-400">XAF</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {meta && meta.total > meta.limit && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
              <span className="text-xs text-zinc-400 tabular-nums">
                {meta.total} mission{meta.total > 1 ? 's' : ''} · page {meta.page}/{meta.totalPages}
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
                  onClick={() => setPage((p) => (p < meta.totalPages ? p + 1 : p))}
                  disabled={page >= meta.totalPages}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-dark-border text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Le backend n'a pas de `GET /admin/deliverers/:id` — on scanne la liste
 * paginée jusqu'à trouver le bon id. Même pattern que le mobile Flutter
 * (`AdminOperationsRepository._findDelivererInList`).
 *
 * TODO : créer un endpoint backend dédié si la liste dépasse ~500 livreurs.
 */
function useDelivererLookup(token: string | null, id: string) {
  const [page, setPage] = useState(1);
  const query = useAdminDeliverers(token, page);

  const data = query.data?.data.find((d) => d.id === id);
  const hasMorePages = query.data
    ? query.data.meta.page * query.data.meta.limit < query.data.meta.total
    : false;

  // Avance à la page suivante si pas trouvé et que des pages restent —
  // dans useEffect pour éviter setState pendant le render.
  useEffect(() => {
    if (query.data && !data && hasMorePages && !query.isFetching) {
      setPage((p) => p + 1);
    }
  }, [query.data, data, hasMorePages, query.isFetching]);

  const stillScanning =
    query.isLoading ||
    query.isFetching ||
    (query.data && !data && hasMorePages);

  return {
    data: data as AdminDeliverer | undefined,
    isLoading: stillScanning && !data,
    isError: query.isError,
  };
}

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24 mt-2" />
      ) : (
        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-1">
          {value}{unit && <span className="text-xs font-normal text-zinc-400 ml-1">{unit}</span>}
        </p>
      )}
      <p className="text-xs text-zinc-400 mt-0.5 truncate">{loading ? '—' : sub}</p>
    </div>
  );
}
