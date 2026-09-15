'use client';

import { useState } from 'react';
import {
  REFUNDS_PAGE_SIZE,
  nextRefundStatuses,
  refundRequiresNote,
  useRefunds,
  useUpdateRefundStatus,
  type RefundStatusFilter,
} from '@lilia/api-client';
import type { Refund, RefundStatus } from '@lilia/types';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

const STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: 'À traiter',
  PROCESSING: 'Virement en cours',
  COMPLETED: 'Remboursé',
  REJECTED: 'Refusé',
};

const STATUS_STYLES: Record<RefundStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  PROCESSING: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  COMPLETED:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
};

/** Le geste que déclenche chaque transition, dit en clair. */
const ACTION_LABELS: Record<RefundStatus, string> = {
  PENDING: 'Remettre en attente',
  PROCESSING: 'Virement lancé',
  COMPLETED: 'Marquer remboursé',
  REJECTED: 'Refuser',
};

const FILTERS: { value: RefundStatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'À traiter' },
  { value: 'PROCESSING', label: 'En cours' },
  { value: 'COMPLETED', label: 'Remboursés' },
  { value: 'REJECTED', label: 'Refusés' },
  { value: 'ALL', label: 'Tous' },
];

const formatXaf = (n: number) => n.toLocaleString('fr-FR');

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Depuis combien de temps ce client attend son argent. */
function waitingSince(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'depuis 1 jour';
  return `depuis ${days} jours`;
}

function RefundRow({
  refund,
  token,
}: {
  refund: Refund;
  token: string | null;
}) {
  const [notes, setNotes] = useState('');
  const update = useUpdateRefundStatus(token);
  const transitions = nextRefundStatuses(refund.status);
  const isOpen = transitions.length > 0;
  const client = refund.order?.user;
  const phone = client?.phone ?? refund.order?.contactPhone ?? null;

  async function handleAdvance(target: RefundStatus) {
    if (refundRequiresNote(target) && !notes.trim()) {
      toast.error('Un refus doit être motivé — renseignez la note.');
      return;
    }

    // Les deux issues sont définitives : le serveur refuse ensuite tout
    // changement (409). On demande donc confirmation, et on nomme le montant.
    if (
      (target === 'COMPLETED' || target === 'REJECTED') &&
      !window.confirm(
        target === 'COMPLETED'
          ? `Confirmer que ${formatXaf(refund.amount)} FCFA ont bien été envoyés à ` +
            `${client?.nom ?? 'ce client'} ?\n\n` +
            "Lilia Food n'effectue pas ce virement : cette file suit une dette, " +
            'elle ne déplace pas d’argent. Ne validez que si le transfert Mobile ' +
            'Money a réellement été fait.'
          : `Refuser le remboursement de ${formatXaf(refund.amount)} FCFA à ` +
            `${client?.nom ?? 'ce client'} ?\n\nCette décision est définitive.`,
      )
    ) {
      return;
    }

    try {
      await update.mutateAsync({
        refundId: refund.id,
        status: target,
        notes,
      });
      toast.success(`Remboursement : ${STATUS_LABELS[target].toLowerCase()}`);
      setNotes('');
    } catch (e) {
      // Le serveur explique les conflits (« déjà clos », « modifié
      // entre-temps. Rechargez la fiche. ») : ce sont les seuls messages qui
      // disent quoi faire ensuite.
      toast.error(apiMessage(e, 'Impossible de mettre à jour ce remboursement'));
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card dark:border-dark-border dark:bg-dark-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatXaf(refund.amount)} FCFA
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Commande #{refund.orderId.slice(-8).toUpperCase()}
            {refund.order?.restaurant ? ` · ${refund.order.restaurant.nom}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[refund.status]}`}
          >
            {STATUS_LABELS[refund.status]}
          </span>
          <span className="text-[11px] text-zinc-400">
            {formatDate(refund.createdAt)}
            {refund.status === 'PENDING' || refund.status === 'PROCESSING'
              ? ` · ${waitingSince(refund.createdAt)}`
              : ''}
          </span>
        </div>
      </div>

      {/* À qui, et comment le joindre : c'est ce qui manque le plus quand on
          traite une file d'argent dû. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600 dark:border-dark-border dark:text-zinc-300">
        <span className="font-medium">{client?.nom ?? 'Client inconnu'}</span>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
          >
            <Phone size={11} />
            {phone}
          </a>
        )}
        {refund.order?.paymentMethod && (
          <span className="text-zinc-400">
            Payé par{' '}
            {refund.order.paymentMethod === 'MTN_MOMO'
              ? 'MTN MoMo'
              : 'Airtel Money'}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="text-zinc-400">Motif : </span>
        {refund.reason}
      </p>

      {refund.notes && (
        <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">
          Note : {refund.notes}
        </p>
      )}

      {isOpen ? (
        <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-dark-border">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            aria-label="Note interne"
            placeholder="Note interne (obligatoire pour un refus)…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-primary-500 focus:outline-none dark:border-dark-border dark:bg-dark-surface dark:text-zinc-100"
          />
          <div className="flex flex-wrap gap-2">
            {transitions.map((target) => (
              <button
                key={target}
                onClick={() => handleAdvance(target)}
                disabled={update.isPending}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  target === 'REJECTED'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10'
                    : target === 'COMPLETED'
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-dark-border dark:text-zinc-300 dark:hover:bg-dark-surface'
                }`}
              >
                {ACTION_LABELS[target]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-zinc-100 pt-3 text-[11px] text-zinc-400 dark:border-dark-border">
          Dossier clos
          {refund.processedAt ? ` le ${formatDate(refund.processedAt)}` : ''}.
        </p>
      )}
    </div>
  );
}

export default function RemboursementsPage() {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<RefundStatusFilter>('PENDING');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isFetching, isPlaceholderData } =
    useRefunds(token, page, status);

  const refunds = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  // Montant total dû sur cette page. Volontairement pas « total dû » : le
  // serveur ne renvoie pas la somme de la file, et l'inventer à partir d'une
  // page serait un chiffre d'argent faux.
  const pageAmount = refunds.reduce((sum, r) => sum + r.amount, 0);

  function selectStatus(next: RefundStatusFilter) {
    setStatus(next);
    setPage(1);
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Ce que cette file est, et surtout ce qu'elle n'est pas. Sans cette
          phrase, « Marquer remboursé » se lit comme un ordre de virement. */}
      <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
        <Info size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Cette file <strong>suit</strong> les sommes dues aux clients après
          l’annulation d’une commande payée — elle ne déplace pas d’argent. Le
          virement Mobile Money se fait hors de l’application ; ces boutons
          n’enregistrent que ce qui a été fait.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => selectStatus(f.value)}
              aria-pressed={status === f.value}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                status === f.value
                  ? 'bg-primary-500 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 dark:border-dark-border dark:bg-dark-card dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label="Actualiser la file"
          title="Actualiser"
          className="ml-auto text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/30 dark:bg-red-500/10">
          <AlertCircle size={20} className="mx-auto mb-2 text-red-500" />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Impossible de charger les remboursements
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
            {apiMessage(error, 'Erreur inconnue')}
          </p>
          <button
            onClick={() => void refetch()}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : refunds.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-400">
            {status === 'PENDING'
              ? 'Aucun remboursement en attente — personne n’attend son argent.'
              : 'Aucun remboursement dans cette vue.'}
          </p>
        </div>
      ) : (
        <div className={`space-y-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {refunds.map((r) => (
            <RefundRow key={r.id} refund={r} token={token} />
          ))}
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {meta.total.toLocaleString('fr-FR')} remboursement
            {meta.total > 1 ? 's' : ''} · page {meta.page}/{totalPages}
            {refunds.length > 0
              ? ` · ${formatXaf(pageAmount)} FCFA sur cette page`
              : ''}
            {meta.total > REFUNDS_PAGE_SIZE
              ? ` · ${REFUNDS_PAGE_SIZE} par page`
              : ''}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              aria-label="Page précédente"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-dark-border dark:text-zinc-300 dark:hover:bg-dark-surface"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page >= totalPages || isFetching}
              aria-label="Page suivante"
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-40 disabled:hover:bg-transparent dark:border-dark-border dark:text-zinc-300 dark:hover:bg-dark-surface"
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
