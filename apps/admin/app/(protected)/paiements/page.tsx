'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminPayments, useConfirmPayment, usePaymentsStats } from '@lilia/api-client';
import type { PaymentMethod, PaymentStatus } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

type StatusFilter = '' | PaymentStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '',          label: 'Tous' },
  { value: 'PENDING',   label: 'En attente' },
  { value: 'SUCCESS',   label: 'Confirmé' },
  { value: 'FAILED',    label: 'Échoué' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  SUCCESS: 'Confirmé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  SUCCESS:   'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  FAILED:    'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOMO:         'MTN Mobile Money',
  AIRTEL_MONEY:     'Airtel Money',
  CASH_ON_DELIVERY: 'À la livraison',
};

const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  MTN_MOMO:         'bg-yellow-400',
  AIRTEL_MONEY:     'bg-red-500',
  CASH_ON_DELIVERY: 'bg-zinc-400',
};

const formatXaf = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export default function PaiementsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminPayments(token, page, status);
  const { data: stats, isLoading: statsLoading } = usePaymentsStats(token);
  const confirm = useConfirmPayment(token);

  const totalPages = data ? data.meta.totalPages : 1;
  const activeFilterLabel = STATUS_FILTERS.find((f) => f.value === status)?.label ?? '';

  function handleConfirm(id: string) {
    confirm.mutate(id, {
      onSuccess: () => toast.success('Paiement confirmé'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de la confirmation'),
    });
  }

  return (
    <div className="max-w-5xl space-y-4">
      {/* Stats agrégées */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Clock size={16} className="text-amber-500" />}
          label="À confirmer"
          value={stats ? formatXaf(stats.pending.totalXaf) : '—'}
          unit="XAF"
          sub={stats ? `${stats.pending.count} paiement${stats.pending.count > 1 ? 's' : ''}` : ''}
          loading={statsLoading}
          accent="amber"
        />
        <StatCard
          icon={<Calendar size={16} className="text-emerald-500" />}
          label="Encaissé ce mois"
          value={stats ? formatXaf(stats.monthSuccess.totalXaf) : '—'}
          unit="XAF"
          sub={stats ? `${stats.monthSuccess.count} paiement${stats.monthSuccess.count > 1 ? 's' : ''}` : ''}
          loading={statsLoading}
          accent="emerald"
        />
        <StatCard
          icon={<TrendingUp size={16} className="text-blue-500" />}
          label="7 derniers jours"
          value={stats ? formatXaf(stats.last7DaysSuccess.totalXaf) : '—'}
          unit="XAF"
          sub={stats ? `${stats.last7DaysSuccess.count} paiement${stats.last7DaysSuccess.count > 1 ? 's' : ''}` : ''}
          loading={statsLoading}
          accent="blue"
        />
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || 'ALL'}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              status === f.value
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les paiements.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <CreditCard size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">
              {status ? `Aucun paiement « ${activeFilterLabel} »` : 'Aucun paiement enregistré'}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((p) => {
              const orderRef = p.order?.id.slice(-6).toUpperCase() ?? '—';
              const method = p.order?.paymentMethod;
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.order?.id ? (
                        <Link
                          href={`/commandes`}
                          className="text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:text-primary-600 hover:underline"
                          title="Voir les commandes"
                        >
                          #{orderRef}
                        </Link>
                      ) : (
                        <span className="text-xs font-mono text-zinc-500">#{orderRef}</span>
                      )}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      {method && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <span className={`w-1.5 h-1.5 rounded-full ${PAYMENT_METHOD_COLORS[method]}`} />
                          {PAYMENT_METHOD_LABELS[method]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                      {p.order?.user?.nom || '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 flex-wrap">
                      <span className="flex items-center gap-1"><Phone size={10} />{p.phoneNumber}</span>
                      <span>{p.provider === 'MANUAL' ? 'Virement manuel' : p.provider}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatXaf(p.amount)} <span className="text-xs font-normal text-zinc-400">{p.currency}</span>
                    </p>
                  </div>
                  {p.status === 'PENDING' && (
                    <button
                      onClick={() => handleConfirm(p.id)}
                      disabled={confirm.isPending && confirm.variables === p.id}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shrink-0"
                    >
                      <Check size={13} /> Confirmer
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data && data.meta.total > data.meta.limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {data.meta.total} paiement{data.meta.total > 1 ? 's' : ''} &middot; page {page}/{totalPages}
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

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  loading,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  loading: boolean;
  accent: 'amber' | 'emerald' | 'blue';
}) {
  const accentBorder = {
    amber:   'border-amber-200/60 dark:border-amber-500/30',
    emerald: 'border-emerald-200/60 dark:border-emerald-500/30',
    blue:    'border-blue-200/60 dark:border-blue-500/30',
  }[accent];

  return (
    <div className={`bg-white dark:bg-dark-card rounded-2xl border ${accentBorder} shadow-card p-4`}>
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-32 mt-2" />
      ) : (
        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-1">
          {value} <span className="text-xs font-normal text-zinc-400">{unit}</span>
        </p>
      )}
      <p className="text-xs text-zinc-400 mt-0.5">{loading ? '—' : sub}</p>
    </div>
  );
}
