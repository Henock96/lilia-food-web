'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminNoShows, useRequestNoShowPayout } from '@lilia/api-client';
import type { AdminNoShowSettlement, NoShowPayoutState } from '@lilia/types';
import { ChevronDown, ChevronUp, Clock, ShieldCheck, Store, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { PaymentsTabs } from '@/components/payments/payments-tabs';
import { apiMessage } from '@/lib/api-message';
import {
  bpsLabel,
  canRequestNoShowPayout,
  formatXaf,
  NO_SHOW_STATE_FILTERS,
  NO_SHOW_STATE_LABELS,
  NO_SHOW_STATE_TONES,
  shortRef,
  TONE_STYLES,
} from '@/lib/reservations-view';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Brazzaville',
  });

const PAYOUT_STATUS_LABELS = { PENDING: 'en cours', SUCCESS: 'versé', FAILED: 'échoué' } as const;

/**
 * D-6 — absences aux réservations payées et part due au restaurant.
 *
 * Douze heures après une absence, l'encaissement est partagé entre le
 * restaurant et Lilia (taux en points de base, fixé à la clôture). La part du
 * restaurant ne part **jamais** seule : un administrateur `FINANCE_EXECUTE` la
 * demande ici, depuis la ligne dépliée (réservation, montants, compte et
 * tentatives sous les yeux), et le virement part à la validation d'un second
 * administrateur dans `/approbations`.
 */
export default function AbsencesPage() {
  const { token } = useAuthStore();
  const [state, setState] = useState<NoShowPayoutState | ''>('DUE');
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, isError, isPlaceholderData } = useAdminNoShows(token, state);
  const activeLabel = NO_SHOW_STATE_FILTERS.find((f) => f.value === state)?.label ?? '';

  return (
    <div className="max-w-5xl space-y-4">
      <PaymentsTabs />

      <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <ShieldCheck size={14} className="text-zinc-400 mt-0.5 shrink-0" />
        <p>
          La part d’une absence part sur décision humaine, à{' '}
          <strong className="text-zinc-700 dark:text-zinc-200">deux administrateurs</strong> : la
          demande ouvre une approbation, le virement part quand un second administrateur la valide.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {NO_SHOW_STATE_FILTERS.map((f) => (
          <button
            key={f.value || 'ALL'}
            onClick={() => { setState(f.value); setOpen(null); }}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              state === f.value
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
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-red-500">Impossible de charger les absences.</p>
          </div>
        ) : !data?.length ? (
          <div className="px-5 py-12 text-center">
            <UserX size={28} className="mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-400">
              {state ? `Aucune absence « ${activeLabel} »` : 'Aucune absence clôturée'}
            </p>
          </div>
        ) : (
          <div className={`divide-y divide-zinc-100 dark:divide-dark-border ${isPlaceholderData ? 'opacity-60' : ''}`}>
            {data.map((s) => (
              <NoShowRow
                key={s.settlementId}
                s={s}
                open={open === s.settlementId}
                onToggle={() => setOpen(open === s.settlementId ? null : s.settlementId)}
              />
            ))}
          </div>
        )}
      </div>
      {data && data.length >= 100 && (
        <p className="text-xs text-zinc-400">
          Les 100 plus récentes sont affichées : filtrez par état pour voir les autres.
        </p>
      )}
    </div>
  );
}

function NoShowRow({
  s,
  open,
  onToggle,
}: {
  s: AdminNoShowSettlement;
  open: boolean;
  onToggle: () => void;
}) {
  const { token } = useAuthStore();
  const request = useRequestNoShowPayout(token);

  function submit() {
    if (
      !window.confirm(
        `Demander le versement de ${formatXaf(s.vendorShareXaf)} FCFA à ${s.restaurant.nom} ?\n\n` +
          'Rien ne part maintenant : un second administrateur devra valider la demande dans Approbations.',
      )
    ) {
      return;
    }
    request.mutate(s.settlementId, {
      onSuccess: () =>
        toast.success('Demande envoyée : le virement partira à la validation d’un second administrateur.'),
      onError: (e) => toast.error(apiMessage(e, 'Demande impossible.')),
    });
  }

  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{shortRef(s.reservationId)}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TONE_STYLES[NO_SHOW_STATE_TONES[s.payoutState]]}`}>
              {NO_SHOW_STATE_LABELS[s.payoutState]}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate mt-0.5 flex items-center gap-1.5">
            <Store size={12} className="text-zinc-400 shrink-0" />
            {s.restaurant.nom}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} /> clôturée le {formatDate(s.createdAt)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatXaf(s.vendorShareXaf)} <span className="text-xs font-normal text-zinc-400">FCFA</span>
          </p>
          <p className="text-[10px] text-zinc-400 tabular-nums">sur {formatXaf(s.totalXaf)} encaissés</p>
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-zinc-500">Encaissé</dt>
            <dd className="tabular-nums">{formatXaf(s.totalXaf)} FCFA</dd>
            <dt className="text-zinc-500">Part restaurant ({bpsLabel(s.vendorShareBps)})</dt>
            <dd className="tabular-nums font-medium">{formatXaf(s.vendorShareXaf)} FCFA</dd>
            <dt className="text-zinc-500">Part Lilia</dt>
            <dd className="tabular-nums">{formatXaf(s.platformShareXaf)} FCFA</dd>
            <dt className="text-zinc-500">Réservation</dt>
            <dd>
              <Link href={`/reservations/${s.reservationId}`} className="text-primary-500 hover:underline">
                {shortRef(s.reservationId)}
              </Link>
              {' · commande '}
              <Link href={`/commandes?q=${s.orderId}`} className="text-primary-500 hover:underline">
                {shortRef(s.orderId)}
              </Link>
            </dd>
          </dl>

          {s.payouts.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Tentatives</p>
              {s.payouts.map((p) => (
                <p key={p.id} className="text-xs text-zinc-500">
                  {formatDate(p.createdAt)} — {formatXaf(p.amountXaf)} FCFA vers {p.payoutProvider}{' '}
                  {p.maskedPhone} : <strong>{PAYOUT_STATUS_LABELS[p.status]}</strong>
                  {p.completedAt ? ` le ${formatDate(p.completedAt)}` : ''}
                  {(p.failureMessage || p.failureCode) && (
                    <span className="text-red-500"> — {p.failureMessage ?? p.failureCode}</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {canRequestNoShowPayout(s) && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">
                Le virement partira vers le compte Mobile Money vérifié du restaurant ; le second
                administrateur verra le numéro complet avant de valider.
              </p>
              <button
                onClick={submit}
                disabled={request.isPending}
                className="text-sm font-medium px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
              >
                {request.isPending ? 'Envoi…' : 'Demander le versement'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
