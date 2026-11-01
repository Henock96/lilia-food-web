'use client';

import { useDriverCourses } from '@lilia/api-client';
import type { DriverCourseSituation } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

const formatXaf = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const SITUATION: Record<DriverCourseSituation, { label: string; cls: string }> = {
  PAYABLE: { label: 'À recevoir', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' },
  SETTLED: { label: 'Réglée', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  RETAINED: { label: 'Retenue (échec imputé)', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  DISPUTED: { label: 'En litige', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400' },
  UNKNOWN_PAY: { label: 'Montant inconnu', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-400' },
  IN_PROGRESS: { label: 'En cours', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
};

/**
 * Lot 3 (point 5) — courses d'un livreur et leur situation de paie.
 *
 * Tout vient du serveur : le montant figé à la course, la situation (mêmes
 * règles que ce qu'un règlement peut couvrir) et la référence du règlement.
 * Rien n'est recalculé ici. Vue d'administration seule : le livreur ne voit
 * jamais sa paie (D-PAY).
 */
export function DriverCoursesCard({ driverId }: { driverId: string }) {
  const { token } = useAuthStore();
  const query = useDriverCourses(driverId, token);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card dark:border-dark-border dark:bg-dark-card">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Courses et paie (100 dernières)
      </h2>
      {query.isLoading ? (
        <Skeleton className="mt-3 h-24 rounded-xl" />
      ) : query.isError || !query.data ? (
        <p className="mt-3 text-xs text-red-500">
          {apiMessage(query.error, 'Courses indisponibles.')}
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            À recevoir {formatXaf(query.data.meta.totals.payableXaf)} FCFA · réglé{' '}
            {formatXaf(query.data.meta.totals.settledXaf)} FCFA · retenues{' '}
            {query.data.meta.totals.retainedCount} · en litige{' '}
            {query.data.meta.totals.disputedCount} · montant inconnu{' '}
            {query.data.meta.totals.unknownPayCount}
          </p>
          {query.data.data.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">Aucune course.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 text-xs dark:divide-zinc-800">
              {query.data.data.map((c) => {
                const s = SITUATION[c.situation];
                return (
                  <li key={c.deliveryId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">
                        #{c.orderId.slice(-6).toUpperCase()} · {formatDate(c.deliveredAt ?? c.failedAt ?? c.createdAt)}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {c.driverPayXaf == null
                          ? 'Paie non figée'
                          : `${formatXaf(c.driverPayXaf)} FCFA`}
                        {c.driverSharePercent != null && c.driverBaseXaf != null
                          ? ` (${c.driverSharePercent} % de ${formatXaf(c.driverBaseXaf)})`
                          : ''}
                        {c.settlement
                          ? ` · réglée le ${formatDate(c.settlement.paidAt)}${c.settlement.reference ? ` — réf. ${c.settlement.reference}` : ''}`
                          : ''}
                        {c.failureLiability ? ` · échec imputé : ${c.failureLiability}` : ''}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
