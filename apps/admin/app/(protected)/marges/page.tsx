'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrderMargins } from '@lilia/api-client';
import type { MarginCost, MarginQuality } from '@lilia/types';
import { formatCurrency } from '@lilia/utils';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const inputCls =
  'text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100';

const QUALITY: Record<MarginQuality, { text: string; cls: string }> = {
  CONFIRMED: {
    text: 'Confirmée',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  ESTIMATED: {
    text: 'Estimée',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  UNKNOWN: { text: 'Inconnue', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300' },
};

/** Un montant inconnu s'écrit « — », jamais 0. */
const amount = (xaf: number | null) => (xaf === null ? '—' : formatCurrency(xaf));

function Fee({ cost }: { cost: MarginCost }) {
  return (
    <span title={QUALITY[cost.quality].text}>
      {amount(cost.amountXaf)}
      {cost.quality === 'ESTIMATED' && <span className="text-zinc-400"> ≈</span>}
    </span>
  );
}

/**
 * Marge par commande livrée (durcissement lot 5). Tout vient du serveur : cette
 * page n'additionne rien. Une marge n'est « confirmée » que si tous ses postes
 * sont réels ; une estimation repose sur les taux du contrat
 * (`PlatformSettings.estimated*FeeBps`) et n'entre jamais au grand livre.
 */
export default function MargesPage() {
  const { token } = useAuthStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const margins = useOrderMargins(token, {
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  });
  const data = margins.data;

  return (
    <div className="max-w-5xl space-y-4">
      <div className={`${cardCls} flex flex-wrap items-end gap-3`}>
        <label className="text-sm">
          <span className="block text-zinc-600 dark:text-zinc-400">Du</span>
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="block text-zinc-600 dark:text-zinc-400">Au</span>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      {margins.isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : margins.isError ? (
        <div className={`${cardCls} text-center text-sm`}>
          <p className="text-red-500">{apiMessage(margins.error, 'Impossible de charger les marges.')}</p>
          <button type="button" className="mt-3 underline" onClick={() => void margins.refetch()}>
            Réessayer
          </button>
        </div>
      ) : data ? (
        <>
          <div className={`${cardCls} space-y-1 text-sm`}>
            {/* Lot 6 — sans « Du », le serveur lit les 30 derniers jours. */}
            {data.period && (
              <p className="text-zinc-500 dark:text-zinc-400">
                Période : du {new Date(data.period.from).toLocaleDateString('fr-FR')} au{' '}
                {new Date(data.period.to).toLocaleDateString('fr-FR')}
                {!from && ' (30 derniers jours par défaut)'}.
              </p>
            )}
            <p className="text-zinc-900 dark:text-zinc-100">
              <strong>{formatCurrency(data.summary.knownMarginXaf)}</strong> de marge connue sur{' '}
              {data.summary.orders} commande{data.summary.orders > 1 ? 's' : ''} livrée
              {data.summary.orders > 1 ? 's' : ''}.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              {data.summary.byQuality.CONFIRMED} confirmée(s) et {data.summary.byQuality.ESTIMATED}{' '}
              estimée(s), comptées dans la somme ; {data.summary.byQuality.UNKNOWN} inconnue(s),
              exclues de la somme.
            </p>
            {data.rates.collectionFeeBps === null && data.rates.payoutFeeBps === null && (
              <p className="text-amber-700 dark:text-amber-400">
                Aucun taux de frais du contrat n’est renseigné : sans frais réels, les marges restent
                inconnues.
              </p>
            )}
            {data.truncated && (
              <p className="text-amber-700 dark:text-amber-400">
                Période trop large : seules les commandes les plus récentes sont comptées. Réduisez-la.
              </p>
            )}
          </div>

          {data.rows.length === 0 ? (
            <div className={`${cardCls} text-center text-sm text-zinc-500`}>
              Aucune commande livrée sur cette période.
            </div>
          ) : (
            <div className={`${cardCls} overflow-x-auto`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="py-1 font-medium">Commande</th>
                    <th className="py-1 font-medium">Vendeur</th>
                    <th className="py-1 text-right font-medium">Encaissé</th>
                    <th className="py-1 text-right font-medium">Avant frais</th>
                    <th className="py-1 text-right font-medium">Encaissement</th>
                    <th className="py-1 text-right font-medium">Versement</th>
                    <th className="py-1 text-right font-medium">Marge</th>
                    <th className="py-1 font-medium">Qualité</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.orderId} className="border-t border-zinc-100 dark:border-dark-border">
                      <td className="py-1.5">
                        <Link
                          href={`/commandes?q=${encodeURIComponent(r.orderRef)}`}
                          className="text-primary-600 hover:underline dark:text-primary-400"
                        >
                          {r.orderRef}
                        </Link>
                      </td>
                      <td className="py-1.5">{r.vendor}</td>
                      <td className="py-1.5 text-right">{formatCurrency(r.totalPaidXaf)}</td>
                      <td className="py-1.5 text-right">{amount(r.marginBeforeProviderFeesXaf)}</td>
                      <td className="py-1.5 text-right"><Fee cost={r.collectionFee} /></td>
                      <td className="py-1.5 text-right"><Fee cost={r.payoutFee} /></td>
                      <td className="py-1.5 text-right font-medium">{amount(r.marginXaf)}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${QUALITY[r.quality].cls}`}>
                          {QUALITY[r.quality].text}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
