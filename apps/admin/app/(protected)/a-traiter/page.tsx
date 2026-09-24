'use client';

import Link from 'next/link';
import { useOpsQueue } from '@lilia/api-client';
import type { OpsBucket } from '@lilia/types';
import { CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { ageLabel, opsItemHref } from '@/lib/ops-links';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card';

/**
 * Cockpit ops « À traiter » (F3-04) : ce qui doit être fait maintenant.
 *
 * Tout est calculé par le serveur ; rien ne se coche ici. Une carte disparaît
 * quand sa cause disparaît — c'est le geste fait dans l'écran d'origine
 * (accepter, assigner, rembourser…) qui la fait partir.
 */
export default function ATraiterPage() {
  const { token } = useAuthStore();
  const query = useOpsQueue(token);

  if (query.isLoading) {
    return (
      <div className="max-w-4xl space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} max-w-4xl p-6 text-center text-sm`}>
        <p className="text-red-500">
          {apiMessage(query.error, 'Impossible de charger la file « À traiter ».')}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 dark:border-zinc-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const { buckets, total, generatedAt } = query.data;
  const active = buckets.filter((b) => b.count > 0);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {total === 0 ? 'Rien à traiter.' : `${total} élément${total > 1 ? 's' : ''} à traiter`} ·
          mis à jour à {new Date(generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <RefreshCw size={12} className={query.isFetching ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {active.length === 0 ? (
        <div className={`${cardCls} flex flex-col items-center gap-2 p-10 text-center`}>
          <CheckCircle2 size={32} className="text-emerald-500" />
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Aucune commande en retard, aucun remboursement ni reversement en souffrance.
          </p>
        </div>
      ) : (
        active.map((bucket) => <BucketCard key={bucket.key} bucket={bucket} />)
      )}
    </div>
  );
}

function BucketCard({ bucket }: { bucket: OpsBucket }) {
  const high = bucket.severity === 'HIGH';
  return (
    <section className={cardCls}>
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-dark-border">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <span className={`h-2 w-2 rounded-full ${high ? 'bg-red-500' : 'bg-amber-500'}`} />
          {bucket.label}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            high
              ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
        >
          {bucket.count}
        </span>
      </header>
      <ul className="divide-y divide-zinc-100 dark:divide-dark-border">
        {bucket.items.map((item) => {
          const href = opsItemHref(bucket.key, item);
          const body = (
            <>
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">{item.title}</p>
                {item.detail && (
                  <p className="truncate text-xs text-zinc-500">{item.detail}</p>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                {ageLabel(item.since)}
                {href && <ChevronRight size={14} />}
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {href ? (
                <Link
                  href={href}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {body}
                </Link>
              ) : (
                <div className="flex items-center justify-between gap-3 px-5 py-3">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {bucket.count > bucket.items.length && (
        <p className="px-5 py-2 text-xs text-zinc-400">
          et {bucket.count - bucket.items.length} de plus — les plus anciennes sont affichées.
        </p>
      )}
    </section>
  );
}
