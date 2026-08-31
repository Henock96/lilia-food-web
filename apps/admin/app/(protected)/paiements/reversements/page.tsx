'use client';

import { useState } from 'react';
import { useAdminPayouts } from '@lilia/api-client';
import type { PayoutStatus } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentsTabs } from '@/components/payments/payments-tabs';
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Clock,
  Store,
} from 'lucide-react';

type StatusFilter = '' | PayoutStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En cours' },
  { value: 'SUCCESS', label: 'Payé' },
  { value: 'FAILED', label: 'Échoué' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: 'En cours',
  SUCCESS: 'Payé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
};

const STATUS_STYLES: Record<PayoutStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  SUCCESS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  FAILED: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const formatXaf = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * File des reversements vendeurs.
 *
 * Écran de **suivi**, pas de décision : on ne déclenche pas un virement depuis
 * une liste. Le geste vit sur la commande concernée, où l'administrateur voit
 * ce que le client a payé, ce que le vendeur doit toucher et pourquoi c'est
 * — ou non — éligible. Envoyer de l'argent depuis une ligne de tableau, sans
 * ce contexte, est précisément la manière de se tromper de destinataire.
 *
 * Le retry est proposé ici sur les échecs, parce que c'est là qu'on les
 * découvre — mais il passe par la même confirmation, sur la commande.
 */
export default function ReversementsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<StatusFilter>('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminPayouts(token, page, status);

  const total = data?.meta.total ?? 0;
  const limit = data?.meta.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeFilterLabel = STATUS_FILTERS.find((f) => f.value === status)?.label ?? '';

  // Un reversement en échec est un vendeur qui attend son argent : il ne doit
  // pas se noyer dans la liste.
  const failedCount = data?.data.filter((p) => p.status === 'FAILED').length ?? 0;

  return (
    <div className="max-w-5xl space-y-4">
      <PaymentsTabs />

      <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Banknote size={14} className="text-zinc-400 mt-0.5 shrink-0" />
        <p>
          Un reversement n’est <strong className="text-zinc-700 dark:text-zinc-200">jamais</strong>{' '}
          automatique. Le passage d’une commande à « Prêt » la rend éligible ; c’est un
          administrateur qui décide d’envoyer l’argent, depuis la commande elle-même.
        </p>
      </div>

      {failedCount > 0 && status !== 'FAILED' && (
        <button
          onClick={() => { setStatus('FAILED'); setPage(1); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200/70 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 text-left"
        >
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {failedCount} reversement{failedCount > 1 ? 's' : ''} en échec sur cette page — des
            vendeurs attendent leur argent.
          </span>
        </button>
      )}

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

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les reversements.</p>
          </div>
        ) : !data?.data.length ? (
          <div className="px-5 py-12 text-center">
            <Banknote size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">
              {status ? `Aucun reversement « ${activeFilterLabel} »` : 'Aucun reversement effectué'}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                      #{p.orderId.slice(-6).toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5 flex items-center gap-1.5">
                    <Store size={12} className="text-zinc-400 shrink-0" />
                    {p.restaurant?.nom ?? 'Vendeur'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(p.requestedAt)}
                    </span>
                    {p.completedAt && <span>→ {formatDate(p.completedAt)}</span>}
                    <span>{p.provider}</span>
                  </div>
                  {(p.failureMessage || p.failureCode) && (
                    <p className="text-xs text-red-500 mt-1 truncate" title={p.failureCode ?? undefined}>
                      {p.failureMessage ?? p.failureCode}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatXaf(p.amount)} <span className="text-xs font-normal text-zinc-400">{p.currency}</span>
                  </p>
                  {/* Le brut et la commission retenue : sans eux, « 4 500 F »
                      ne dit pas d'où vient le chiffre. */}
                  <p className="text-[10px] text-zinc-400 tabular-nums">
                    brut {formatXaf(p.grossAmount)} · −{p.commissionPercent}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {data && total > limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {total} reversement{total > 1 ? 's' : ''} &middot; page {page}/{totalPages}
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
