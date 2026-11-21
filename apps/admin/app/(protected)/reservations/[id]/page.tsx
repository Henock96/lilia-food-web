'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useAdminCancelReservation, useAdminReservation } from '@lilia/api-client';
import { ArrowLeft, CalendarClock, Phone, Store, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import {
  CANCEL_REASON_MAX,
  cancelConsequence,
  cancelReasonError,
  formatXaf,
  RESERVATION_STATUS_LABELS,
  reservationStatusTone,
  shortRef,
  TONE_STYLES,
} from '@/lib/reservations-view';

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Brazzaville',
      })
    : null;

/**
 * D-6 — détail d'une réservation pour le support : contact complet du client
 * (D6-4), précommande, montant réel et chronologie. « Annuler » n'apparaît
 * que si le serveur le propose (`allowedActions`).
 */
export default function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const { data: r, isLoading, isError, refetch } = useAdminReservation(token, id);
  const cancel = useAdminCancelReservation(token);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const reasonError = cancelReasonError(reason);

  function submitCancel() {
    setTouched(true);
    if (!r || reasonError) return;
    if (!window.confirm(`Annuler la réservation ${shortRef(r.id)} ?\n\n${cancelConsequence(r.payment)}`)) return;
    cancel.mutate(
      { id: r.id, reason },
      {
        onSuccess: (res) => {
          toast.success(
            res.refundXaf !== null
              ? `Réservation annulée. Remboursement de ${formatXaf(res.refundXaf)} FCFA ajouté à la file des remboursements.`
              : 'Réservation annulée.',
          );
          setReason('');
          setTouched(false);
        },
        onError: (e) => {
          toast.error(apiMessage(e, 'Annulation impossible.'));
          // L'état a pu changer (paiement en cours, commande remise) : on
          // relit le verdict du serveur plutôt que de garder un bouton périmé.
          void refetch();
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }
  if (isError || !r) {
    return (
      <div className="max-w-3xl space-y-3">
        <BackLink />
        <p className="text-sm text-red-500">Impossible de charger cette réservation.</p>
      </div>
    );
  }

  const timeline: [string, string | null][] = [
    ['Demandée', formatDateTime(r.createdAt)],
    ['Acceptée', formatDateTime(r.acceptedAt)],
    ['Payée (confirmée)', formatDateTime(r.confirmedAt)],
    ['Refusée', formatDateTime(r.declinedAt)],
    ['Expirée', formatDateTime(r.expiredAt)],
    ['Annulée', formatDateTime(r.cancelledAt)],
    ['Honorée', formatDateTime(r.honoredAt)],
    ['Absence déclarée', formatDateTime(r.noShowAt)],
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <BackLink />

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">{shortRef(r.id)}</span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TONE_STYLES[reservationStatusTone(r.status)]}`}>
            {RESERVATION_STATUS_LABELS[r.status]}
          </span>
          {r.lateCancellation && (
            <span className="text-[11px] text-amber-600">annulation tardive</span>
          )}
        </div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
          <Store size={14} className="text-zinc-400" />
          <Link href={`/reservations?restaurantId=${r.restaurant.id}`} className="hover:underline">
            {r.restaurant.nom}
          </Link>
        </p>
        <div className="grid gap-2 sm:grid-cols-2 text-sm text-zinc-600 dark:text-zinc-300">
          <p className="flex items-center gap-1.5">
            <CalendarClock size={14} className="text-zinc-400" />
            {formatDateTime(r.arrivalAt)} → {formatDateTime(r.endsAt)}
          </p>
          <p className="flex items-center gap-1.5">
            <Users size={14} className="text-zinc-400" />
            {r.partySize} pers. · {r.space.label}
          </p>
          <p className="flex items-center gap-1.5">
            <Phone size={14} className="text-zinc-400" />
            {r.customer.nom ?? 'Client'} ·{' '}
            <a href={`tel:${r.customer.phone}`} className="font-mono hover:underline">{r.customer.phone}</a>
          </p>
        </div>
        {r.note && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-line">Note : {r.note}</p>
        )}
        {(r.declineReason || r.cancelReason) && (
          <p className="text-xs text-zinc-500">Motif : {r.declineReason ?? r.cancelReason}</p>
        )}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Précommande</h2>
        {r.items.length === 0 ? (
          <p className="text-xs text-zinc-400">Aucun plat commandé à l’avance.</p>
        ) : (
          <ul className="text-sm text-zinc-600 dark:text-zinc-300 space-y-1">
            {r.items.map((i, n) => (
              <li key={n} className="flex justify-between gap-3">
                <span>
                  {i.quantite} × {i.menuName ?? i.productName ?? 'Article'}
                  {i.variantLabel ? ` (${i.variantLabel})` : ''}
                  {i.options.length > 0 && (
                    <span className="text-xs text-zinc-400"> — {i.options.map((o) => o.optionName).join(', ')}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {r.payment ? (
          <div className="pt-2 border-t border-zinc-100 dark:border-dark-border text-sm space-y-0.5">
            <p className="flex justify-between"><span className="text-zinc-500">Sous-total</span><span className="tabular-nums">{formatXaf(r.payment.subTotal)} FCFA</span></p>
            <p className="flex justify-between"><span className="text-zinc-500">Frais de service</span><span className="tabular-nums">{formatXaf(r.payment.serviceFee)} FCFA</span></p>
            <p className="flex justify-between font-semibold"><span>Total de la commande liée</span><span className="tabular-nums">{formatXaf(r.payment.total)} FCFA</span></p>
            {r.payment.priceChanged && r.payment.indicativeSubTotal !== null && (
              <p className="text-xs text-amber-600">
                Prix modifié depuis la demande (indicatif : {formatXaf(r.payment.indicativeSubTotal)} FCFA).
              </p>
            )}
            <Link href={`/commandes?q=${r.payment.orderId}`} className="text-xs text-primary-500 hover:underline">
              Voir la commande liée {shortRef(r.payment.orderId)}
            </Link>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">Pas encore de commande : le restaurant n’a pas accepté.</p>
        )}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Chronologie</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
          {timeline
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      {r.allowedActions.includes('cancel') && (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-red-200/70 dark:border-red-500/30 shadow-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
            <XCircle size={15} /> Annuler la réservation (support)
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{cancelConsequence(r.payment)}</p>
          <textarea
            aria-label="Motif d’annulation"
            value={reason}
            maxLength={CANCEL_REASON_MAX}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            placeholder="Motif (visible au journal) — 10 caractères au moins"
            className="w-full text-sm px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border text-zinc-800 dark:text-zinc-200"
          />
          {touched && reasonError && <p className="text-xs text-red-500">{reasonError}</p>}
          <button
            onClick={submitCancel}
            disabled={cancel.isPending}
            className="text-sm font-medium px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {cancel.isPending ? 'Annulation…' : 'Annuler la réservation'}
          </button>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/reservations" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
      <ArrowLeft size={13} /> Réservations
    </Link>
  );
}
