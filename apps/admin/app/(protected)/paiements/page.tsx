'use client';

import { useState } from 'react';
import { useAdminPayments, useConfirmPayment } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCard, Check, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'] as const;
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente', SUCCESS: 'Confirmé', FAILED: 'Échoué', CANCELLED: 'Annulé',
};
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  SUCCESS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  FAILED: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  CANCELLED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export default function PaiementsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, isPlaceholderData } = useAdminPayments(token, page, status);
  const confirm = useConfirmPayment(token);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  function handleConfirm(id: string) {
    confirm.mutate(id, {
      onSuccess: () => toast.success('Paiement confirmé'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur lors de la confirmation'),
    });
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Filtres statut */}
      <div className="flex gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              status === s
                ? 'bg-primary-500 text-white'
                : 'bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

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
            <p className="text-sm text-zinc-400">Aucun paiement &laquo; {STATUS_LABELS[status]} &raquo;</p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.data.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-500">
                      #{p.order?.id.slice(-6).toUpperCase() ?? '—'}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[p.status] ?? ''}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5">
                    {p.order?.user?.nom || '—'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Phone size={10} />{p.phoneNumber}</span>
                    <span>{p.provider}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {p.amount.toLocaleString('fr-FR')} <span className="text-xs font-normal text-zinc-400">{p.currency}</span>
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
            ))}
          </div>
        )}

        {data && data.total > data.limit && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-dark-border">
            <span className="text-xs text-zinc-400 tabular-nums">
              {data.total} paiement{data.total > 1 ? 's' : ''} &middot; page {page}/{totalPages}
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
