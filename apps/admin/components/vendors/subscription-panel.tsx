'use client';

import { useState } from 'react';
import {
  useGrantVendorSubscription,
  useRevokeVendorSubscription,
  useVendorSubscriptions,
} from '@lilia/api-client';
import type { SubscriptionPaymentMethod, VendorSubscription } from '@lilia/types';
import { formatCurrency } from '@lilia/utils';
import { toast } from 'sonner';
import { Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import {
  PAYMENT_METHOD_LABELS,
  canOfferRevoke,
  formatSubscriptionDate,
  periodState,
  verdictLabel,
} from '@/lib/subscription-view';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
const btnCls =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50';

/**
 * Premium (Lot 2) — abonnement du vendeur, côté administration.
 *
 * Le vendeur paie hors plateforme ; l'administrateur enregistre le mois reçu.
 * Le montant et les dates viennent du serveur (prix des réglages, période
 * empilée après la période en cours) : rien n'est saisi ici qui fixe de
 * l'argent. Enregistrer et révoquer exigent `FINANCE_EXECUTE` — sans elle, le
 * serveur répond 403 et le message s'affiche.
 */
export function SubscriptionPanel({ vendorId, token }: { vendorId: string; token: string | null }) {
  const query = useVendorSubscriptions(vendorId, token);

  if (query.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} flex flex-col items-center gap-3 text-sm`}>
        <p>{apiMessage(query.error, 'Impossible de charger l’abonnement.')}</p>
        <button type="button" className={btnCls} onClick={() => void query.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }

  const { verdict, priceXaf, periods } = query.data;
  return (
    <div className="space-y-4">
      <section className={cardCls}>
        <div className="flex items-center gap-2">
          <Crown
            className={`h-5 w-5 ${verdict.active ? 'text-amber-500' : 'text-zinc-400'}`}
            aria-hidden
          />
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {verdictLabel(verdict)}
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Prix d’un mois : {formatCurrency(priceXaf)}. Un mois enregistré commence à la fin de la
          période en cours.
        </p>
      </section>

      <GrantForm vendorId={vendorId} token={token} priceXaf={priceXaf} />

      <section className={cardCls}>
        <h3 className="mb-3 font-medium text-zinc-900 dark:text-zinc-100">Historique</h3>
        {periods.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun mois enregistré.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {periods.map((p) => (
              <PeriodRow key={p.id} period={p} vendorId={vendorId} token={token} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GrantForm({
  vendorId,
  token,
  priceXaf,
}: {
  vendorId: string;
  token: string | null;
  priceXaf: number;
}) {
  const grant = useGrantVendorSubscription(vendorId, token);
  // Une clé par saisie : stable tant que l'enregistrement n'a pas réussi (un
  // double clic ou une relance rend la même période), renouvelée ensuite.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>('MOBILE_MONEY');
  const [paymentReference, setPaymentReference] = useState('');
  const [note, setNote] = useState('');

  function submit() {
    grant.mutate(
      {
        idempotencyKey,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Mois d’abonnement enregistré.');
          setIdempotencyKey(crypto.randomUUID());
          setPaymentReference('');
          setNote('');
        },
        onError: (error) =>
          toast.error(apiMessage(error, 'Impossible d’enregistrer le mois.')),
      },
    );
  }

  return (
    <section className={cardCls}>
      <h3 className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">
        Enregistrer un mois payé
      </h3>
      <p className="mb-3 text-sm text-zinc-500">
        À utiliser une fois le paiement de {formatCurrency(priceXaf)} reçu.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-300">Moyen de paiement</span>
          <select
            className={inputCls}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as SubscriptionPaymentMethod)}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-300">Référence (facultatif)</span>
          <input
            className={inputCls}
            value={paymentReference}
            maxLength={120}
            placeholder="N° de transaction Mobile Money…"
            onChange={(e) => setPaymentReference(e.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-zinc-600 dark:text-zinc-300">Note (facultatif)</span>
          <input
            className={inputCls}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className={`${btnCls} mt-3`}
        disabled={grant.isPending}
        onClick={submit}
      >
        {grant.isPending ? 'Enregistrement…' : 'Enregistrer le mois'}
      </button>
    </section>
  );
}

function PeriodRow({
  period,
  vendorId,
  token,
}: {
  period: VendorSubscription;
  vendorId: string;
  token: string | null;
}) {
  const revoke = useRevokeVendorSubscription(vendorId, token);
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const state = periodState(period);

  function submit() {
    revoke.mutate(
      { id: period.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Période révoquée.');
          setConfirming(false);
        },
        onError: (error) => toast.error(apiMessage(error, 'Impossible de révoquer.')),
      },
    );
  }

  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {formatSubscriptionDate(period.startsAt)} → {formatSubscriptionDate(period.endsAt)}
            <span className="ml-2 text-xs font-normal text-zinc-500">({state})</span>
          </p>
          <p className="text-zinc-500">
            {formatCurrency(period.priceXaf)} · {PAYMENT_METHOD_LABELS[period.paymentMethod]}
            {period.paymentReference ? ` · ${period.paymentReference}` : ''}
          </p>
          {period.revokeReason && (
            <p className="text-zinc-500">Révoquée : {period.revokeReason}</p>
          )}
        </div>
        {canOfferRevoke(state) && !confirming && (
          <button type="button" className={btnCls} onClick={() => setConfirming(true)}>
            Révoquer
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className={`${inputCls} flex-1`}
            value={reason}
            maxLength={500}
            placeholder="Motif (obligatoire)"
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            type="button"
            className={btnCls}
            disabled={!reason.trim() || revoke.isPending}
            onClick={submit}
          >
            Confirmer la révocation
          </button>
          <button type="button" className={btnCls} onClick={() => setConfirming(false)}>
            Annuler
          </button>
        </div>
      )}
    </li>
  );
}
