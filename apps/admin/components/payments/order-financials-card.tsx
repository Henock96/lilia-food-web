'use client';

import { useState } from 'react';
import { useOrderFinancials, useRequestPayout, useRetryPayout } from '@lilia/api-client';
import type { OrderFinancials, PaymentStatus, PayoutStatus } from '@lilia/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

const formatXaf = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;

const COLLECTION_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'en attente',
  SUCCESS: 'encaissé',
  FAILED: 'échoué',
  CANCELLED: 'annulé',
};

const PAYOUT_LABELS: Record<PayoutStatus, string> = {
  PENDING: 'Virement en cours',
  SUCCESS: 'Vendeur payé',
  FAILED: 'Virement échoué',
  CANCELLED: 'Virement annulé',
};

/**
 * Récapitulatif financier d'une commande, et le geste « Payer le restaurant ».
 *
 * Trois principes, repris de la carte équivalente de l'application
 * d'administration mobile :
 *
 *  1. **Le serveur décide.** Le bouton s'active d'après `eligibility.eligible`,
 *     et le backend rejoue ses neuf contrôles au clic. Afficher le bouton
 *     n'autorise rien — un écran resté ouvert dix minutes peut proposer une
 *     action devenue impossible, et c'est le 409 qui fait foi.
 *  2. **Aucun montant n'est recalculé ici.** Commission, net à reverser et
 *     total client viennent du serveur. Un second calcul finit toujours par
 *     produire un chiffre différent de celui qui part réellement.
 *  3. **Une confirmation explicite avant tout virement.** Envoyer de l'argent à
 *     un tiers ne doit pas tenir à un clic : la modale récapitule le
 *     bénéficiaire, le montant net et le numéro masqué.
 */
export function OrderFinancialsCard({
  orderId,
  token,
}: {
  orderId: string;
  token: string | null;
}) {
  const { data, isLoading, isError } = useOrderFinancials(orderId, token);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (isError || !data) {
    return (
      <p className="text-xs text-red-500">Récapitulatif financier indisponible.</p>
    );
  }

  const { client, restaurant, liliaFood, eligibility, refund } = data;
  const payout = restaurant.payout;
  const canRetry = payout?.status === 'FAILED';

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-dark-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-dark-surface border-b border-zinc-200 dark:border-dark-border">
        <Banknote size={14} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          Argent — commande #{data.orderRef}
        </span>
        <CollectionBadge collection={client.collection} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-dark-border">
        {/* ── Ce que paie le client ─────────────────────────────────────── */}
        <section className="p-3 space-y-1">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
            Le client paie
          </h4>
          <Line label="Produits" value={client.subTotal} />
          <Line label="Livraison" value={client.deliveryFee} />
          <Line label="Frais de service" value={client.serviceFee} />
          {client.discountAmount > 0 && (
            <Line label="Remise" value={-client.discountAmount} tone="emerald" />
          )}
          <Line label="Total" value={client.totalPaid} strong />
          {client.collection ? (
            <p className="text-[11px] text-zinc-400 pt-1">
              {client.collection.provider} ·{' '}
              {COLLECTION_LABELS[client.collection.status]}
              {client.collection.completedAt &&
                ` le ${new Date(client.collection.completedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`}
            </p>
          ) : (
            <p className="text-[11px] text-amber-600 pt-1">Aucun encaissement ouvert</p>
          )}
          {client.collection?.failureMessage && (
            <p className="text-[11px] text-red-500">{client.collection.failureMessage}</p>
          )}
        </section>

        {/* ── Ce que touche le vendeur ──────────────────────────────────── */}
        <section className="p-3 space-y-1">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1.5">
            Le vendeur reçoit
          </h4>
          <Line label="Base (produits)" value={restaurant.grossAmount} />
          <Line
            label={`Commission ${restaurant.commissionPercent}%`}
            value={-restaurant.commissionAmount}
            tone="zinc"
          />
          <Line label="Net à reverser" value={restaurant.payoutAmount} strong />
          <p className="text-[11px] text-zinc-400 pt-1">
            {restaurant.payoutAccount.configured
              ? `${restaurant.payoutAccount.provider} · ${restaurant.payoutAccount.phoneNumber}`
              : 'Compte de reversement non configuré'}
          </p>
          {/* Ni la livraison ni la remise n'entrent dans le reversement : la
              remise est une opération commerciale de Lilia Food, la déduire
              ferait payer au vendeur une campagne qu'il n'a pas décidée. */}
          <p className="text-[10px] text-zinc-400 leading-snug">
            Hors livraison et hors remise, par construction.
          </p>
        </section>
      </div>

      {/* ── Marge Lilia Food ───────────────────────────────────────────── */}
      <div className="px-3 py-2 border-t border-zinc-100 dark:border-dark-border flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span>Frais de service {formatXaf(liliaFood.serviceFee)}</span>
        <span>Commission {formatXaf(liliaFood.restaurantCommission)}</span>
        {liliaFood.collectionFee != null && (
          <span>− encaissement {formatXaf(liliaFood.collectionFee)}</span>
        )}
        {liliaFood.payoutFee != null && (
          <span>− reversement {formatXaf(liliaFood.payoutFee)}</span>
        )}
        <span className="ml-auto font-semibold text-zinc-700 dark:text-zinc-200">
          {liliaFood.netMargin != null
            ? `Marge ${formatXaf(liliaFood.netMargin)}`
            : 'Marge connue après facturation prestataire'}
        </span>
      </div>

      {refund && (
        <div className="px-3 py-2 border-t border-zinc-100 dark:border-dark-border flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle size={13} className="shrink-0" />
          Remboursement {refund.status.toLowerCase()} de {formatXaf(refund.amount)}
        </div>
      )}

      {/* ── Le geste ───────────────────────────────────────────────────── */}
      <div className="px-3 py-3 border-t border-zinc-100 dark:border-dark-border">
        {payout && payout.status !== 'FAILED' ? (
          <PayoutState payout={payout} />
        ) : (
          <>
            {payout?.status === 'FAILED' && (
              <p className="text-xs text-red-500 mb-2">
                {payout.failureMessage ?? 'Le prestataire a refusé le reversement.'}
              </p>
            )}
            <button
              onClick={() => setConfirming(true)}
              disabled={!eligibility.eligible && !canRetry}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {canRetry ? <RotateCcw size={15} /> : <ArrowUpRight size={15} />}
              {canRetry ? 'Réessayer le reversement' : 'Payer le restaurant'}
            </button>
            {!eligibility.eligible && (
              // Le motif vient du serveur : le front ne rejoue aucune règle,
              // deux implémentations d'une même règle finissent par diverger.
              <p className="text-[11px] text-zinc-400 mt-1.5 text-center">
                {eligibility.reason ?? 'Reversement impossible pour le moment.'}
              </p>
            )}
          </>
        )}
      </div>

      {confirming && (
        <PayoutConfirmModal
          financials={data}
          isRetry={canRetry}
          token={token}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────── Sous-vues ──────────────────────────────── */

function CollectionBadge({ collection }: { collection: OrderFinancials['client']['collection'] }) {
  const paid = collection?.status === 'SUCCESS';
  return (
    <span
      className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
        paid
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
      }`}
    >
      {paid ? 'Commande payée' : 'Non encaissée'}
    </span>
  );
}

function PayoutState({ payout }: { payout: NonNullable<OrderFinancials['restaurant']['payout']> }) {
  const done = payout.status === 'SUCCESS';
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
        done
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
      }`}
    >
      {done ? <CheckCircle2 size={14} /> : <Clock size={14} />}
      <span className="font-medium">{PAYOUT_LABELS[payout.status]}</span>
      <span className="ml-auto tabular-nums">{formatXaf(payout.amount)}</span>
    </div>
  );
}

/**
 * Confirmation avant virement.
 *
 * Elle répète le bénéficiaire, le net et le numéro masqué : ce sont les trois
 * choses qu'on regrette de ne pas avoir vérifiées après coup. Un reversement
 * parti ne revient pas.
 */
function PayoutConfirmModal({
  financials,
  isRetry,
  token,
  onClose,
}: {
  financials: OrderFinancials;
  isRetry: boolean;
  token: string | null;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const request = useRequestPayout(token);
  const retry = useRetryPayout(token);
  const mutation = isRetry ? retry : request;

  async function submit() {
    try {
      const result = await mutation.mutateAsync({ orderId: financials.orderId, note });
      toast.success(result.message ?? 'Reversement envoyé au prestataire');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reversement impossible');
      // On ferme quand même : le motif est un état serveur (déjà payé, virement
      // en cours…), pas une saisie à corriger. Garder la modale ouverte
      // inviterait à recliquer.
      onClose();
    }
  }

  const { restaurant } = financials;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {isRetry ? 'Réessayer le reversement' : 'Payer le restaurant'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Commande #{financials.orderRef}. Cette action envoie réellement de l’argent —
              elle est irréversible.
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <dl className="text-sm space-y-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Bénéficiaire</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100 text-right">
              {restaurant.nom}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">Numéro</dt>
            <dd className="font-mono text-zinc-900 dark:text-zinc-100">
              {restaurant.payoutAccount.phoneNumber ?? '—'}
              {restaurant.payoutAccount.provider && (
                <span className="ml-1 text-xs text-zinc-400">
                  {restaurant.payoutAccount.provider}
                </span>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-3 pt-1.5 border-t border-zinc-200 dark:border-zinc-700">
            <dt className="text-zinc-500">Montant net</dt>
            <dd className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatXaf(restaurant.payoutAmount)}
            </dd>
          </div>
        </dl>

        <label className="block">
          <span className="text-xs text-zinc-500 font-medium">Note (optionnel)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Ex : régularisation du 31/08"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </label>

        <div className="flex items-center gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Envoi…' : `Envoyer ${formatXaf(restaurant.payoutAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: number;
  strong?: boolean;
  tone?: 'emerald' | 'zinc';
}) {
  const color = tone === 'emerald' ? 'text-emerald-600' : 'text-zinc-700 dark:text-zinc-300';
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-zinc-900 dark:text-zinc-100' : color}`}>
        {formatXaf(value)}
      </span>
    </div>
  );
}
