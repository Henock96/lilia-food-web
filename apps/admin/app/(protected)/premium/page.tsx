'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  useAdminSubscriptionPayments,
  useStartSubscriptionPayment,
  useSubscriptionOffer,
  useSubscriptionPayment,
} from '@lilia/api-client';
import type { SubscriptionPayment, SubscriptionPaymentStatus } from '@lilia/types';
import { formatCurrency } from '@lilia/utils';
import { toast } from 'sonner';
import { CheckCircle2, Crown, Loader2, Smartphone, XCircle } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import {
  OPERATORS,
  PREMIUM_BENEFITS,
  blockedReasonLabel,
  durationLabel,
  failureLabel,
  isStalePending,
  paymentStatusLabel,
  paymentTone,
  type Operator,
} from '@/lib/premium-view';
import { formatSubscriptionDate, verdictLabel } from '@/lib/subscription-view';
import { useIsAdmin } from '@/lib/use-role';
import { useAuthStore } from '@/store/auth';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';

/**
 * Premium S1 (25/11/2026).
 *
 * - RESTAURATEUR : voit son statut, choisit une durée et paie dans la
 *   plateforme (dépôt pawaPay). Les mois s'ouvrent au `SUCCESS` du
 *   prestataire, jamais au clic.
 * - ADMIN : suit les paiements d'abonnement (lecture seule). L'attribution
 *   manuelle d'un mois reste sur la fiche du restaurant.
 */
export default function PremiumPage() {
  const isAdmin = useIsAdmin();
  return isAdmin ? <AdminPayments /> : <VendorPremium />;
}

// ─── Restaurateur ────────────────────────────────────────────────────────────

function VendorPremium() {
  const token = useAuthStore((s) => s.token);
  const userPhone = useAuthStore((s) => s.user?.phone ?? '');
  const offerQuery = useSubscriptionOffer(token);
  const start = useStartSubscriptionPayment(token);

  const [months, setMonths] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>('MTN_MOMO');
  // `null` tant que le vendeur n'a rien saisi : on propose alors le numéro
  // de son compte, qui peut arriver après le premier rendu.
  const [typedPhone, setPhone] = useState<string | null>(null);
  const phone = typedPhone ?? userPhone;
  const [trackedId, setTrackedId] = useState<string | null>(null);

  const offer = offerQuery.data;
  // Le paiement suivi : celui qu'on vient de lancer, sinon celui que le
  // serveur dit en cours (rechargement de la page, autre onglet).
  const followId = trackedId ?? offer?.pendingPayment?.id ?? null;

  if (offerQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (offerQuery.isError || !offer) {
    return (
      <div className={`${cardCls} space-y-3`}>
        <p className="text-sm text-red-600">
          {apiMessage(offerQuery.error, 'Impossible de charger votre offre Premium.')}
        </p>
        <button
          type="button"
          onClick={() => void offerQuery.refetch()}
          className="text-sm font-medium px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const selected = offer.durations.find((d) => d.months === months) ?? null;
  const blocked = blockedReasonLabel(offer.blockedReason);

  const pay = () => {
    if (!selected) {
      toast.error('Choisissez une durée.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Indiquez le numéro Mobile Money qui paie.');
      return;
    }
    start.mutate(
      { months: selected.months, phoneNumber: phone.trim(), method: operator },
      {
        onSuccess: (payment) => {
          setTrackedId(payment.id);
          toast.success('Demande envoyée : validez le paiement sur votre téléphone.');
        },
        onError: (error) => {
          toast.error(apiMessage(error, 'Le paiement n’a pas pu être lancé.'));
          // Opérateur injoignable (502) : la tentative existe peut-être côté
          // serveur, en attente. L'offre relue la rend (`pendingPayment`) et
          // l'écran la suit au lieu de laisser repayer à l'aveugle.
          void offerQuery.refetch();
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header className={`${cardCls} flex items-start gap-4`}>
        <div className="rounded-xl bg-amber-100 dark:bg-amber-500/15 p-3">
          <Crown className="h-6 w-6 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Lilia Premium
          </h1>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {verdictLabel(offer.verdict)}
          </p>
          <p className="text-sm text-zinc-500">
            {formatCurrency(offer.unitPriceXaf)} par mois, payé par Mobile Money.
          </p>
        </div>
      </header>

      <section className={cardCls}>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Ce que Premium vous apporte
        </h2>
        <ul className="space-y-2">
          {PREMIUM_BENEFITS.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </section>

      {followId ? (
        <PaymentTracker
          paymentId={followId}
          token={token}
          onSettled={() => {
            void offerQuery.refetch();
          }}
          onRetry={() => {
            setTrackedId(null);
            void offerQuery.refetch();
          }}
        />
      ) : (
        <section className={`${cardCls} space-y-4`}>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {offer.verdict.active ? 'Prolonger mon abonnement' : 'Souscrire'}
          </h2>
          {offer.verdict.active && (
            <p className="text-xs text-zinc-500">
              Les mois payés s’ajoutent à la suite de votre abonnement en cours.
            </p>
          )}

          {blocked ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">{blocked}</p>
          ) : (
            <>
              <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <legend className="sr-only">Durée</legend>
                {offer.durations.map((d) => (
                  <label
                    key={d.months}
                    className={`cursor-pointer rounded-xl border p-3 text-center transition-colors ${
                      months === d.months
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                        : 'border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="duration"
                      className="sr-only"
                      checked={months === d.months}
                      onChange={() => setMonths(d.months)}
                    />
                    <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {durationLabel(d.months)}
                    </span>
                    <span className="block text-xs text-zinc-500">{formatCurrency(d.amountXaf)}</span>
                  </label>
                ))}
              </fieldset>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" htmlFor="premium-operator">
                    Opérateur
                  </label>
                  <select
                    id="premium-operator"
                    className={inputCls}
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as Operator)}
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1" htmlFor="premium-phone">
                    Numéro Mobile Money
                  </label>
                  <input
                    id="premium-phone"
                    className={inputCls}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="06 123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={pay}
                disabled={!selected || start.isPending}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {selected ? `Payer ${formatCurrency(selected.amountXaf)}` : 'Choisissez une durée'}
              </button>
              <p className="text-xs text-zinc-500">
                Vous recevrez une demande de paiement sur ce numéro : validez-la avec votre code
                secret. Premium s’active dès que l’opérateur confirme le paiement.
              </p>
            </>
          )}
        </section>
      )}

      {offer.recentPayments.length > 0 && (
        <section className={cardCls}>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Mes paiements
          </h2>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {offer.recentPayments.map((p) => (
              <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-zinc-700 dark:text-zinc-300">
                  {formatSubscriptionDate(p.createdAt)} · {durationLabel(p.months)} ·{' '}
                  {formatCurrency(p.amountXaf)}
                </span>
                <StatusBadge status={p.status} label={paymentStatusLabel(p)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PaymentTracker({
  paymentId,
  token,
  onSettled,
  onRetry,
}: {
  paymentId: string;
  token: string | null;
  onSettled: () => void;
  onRetry: () => void;
}) {
  const query = useSubscriptionPayment(paymentId, token);
  const payment = query.data;
  const status = payment?.status;

  // `onSettled` relit l'offre : une fois par changement d'issue suffit. Gardé
  // dans une ref pour que l'effet ne dépende que de l'issue.
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });
  useEffect(() => {
    if (status === 'SUCCESS' || status === 'FAILED') onSettledRef.current();
  }, [status]);

  if (!payment) {
    return (
      <section className={`${cardCls} space-y-3`}>
        {query.isError ? (
          <>
            <p className="text-sm text-red-600">
              {apiMessage(query.error, 'Impossible de lire l’état du paiement.')}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              Actualiser
            </button>
          </>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </section>
    );
  }
  const tone = paymentTone(payment);
  return (
    <section className={`${cardCls} space-y-3`} aria-live="polite">
      <div className="flex items-center gap-3">
        {tone === 'pending' && <Smartphone className="h-5 w-5 text-primary-500 animate-pulse" />}
        {tone === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        {tone === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {paymentStatusLabel(payment)}
        </h2>
      </div>
      <PaymentSummary payment={payment} />
      {query.isError && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          État momentanément illisible (réseau) : affiché tel qu’au dernier relevé.{' '}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Actualiser
          </button>
        </p>
      )}
      {tone === 'pending' && (
        <p className="text-xs text-zinc-500">
          {isStalePending(payment)
            ? 'Toujours sans réponse de l’opérateur : le résultat sera mis à jour automatiquement. Ne payez pas une seconde fois.'
            : 'Validez la demande reçue sur votre téléphone. Cette page se met à jour seule.'}
        </p>
      )}
      {tone === 'failed' && (
        <>
          <p className="text-sm text-red-600">
            {failureLabel(payment.failureCode) ?? 'Le paiement n’a pas abouti.'}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
          >
            Réessayer
          </button>
        </>
      )}
      {tone === 'success' && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-primary-600 hover:underline"
        >
          Fermer
        </button>
      )}
    </section>
  );
}

function PaymentSummary({ payment }: { payment: SubscriptionPayment }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <dt className="text-zinc-500">Durée</dt>
      <dd className="text-zinc-900 dark:text-zinc-100">{durationLabel(payment.months)}</dd>
      <dt className="text-zinc-500">Montant</dt>
      <dd className="text-zinc-900 dark:text-zinc-100">{formatCurrency(payment.amountXaf)}</dd>
      <dt className="text-zinc-500">Référence</dt>
      <dd className="font-mono text-zinc-900 dark:text-zinc-100">{payment.reference}</dd>
    </dl>
  );
}

function StatusBadge({ status, label }: { status: SubscriptionPaymentStatus; label: string }) {
  const cls =
    status === 'SUCCESS'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
      : status === 'FAILED'
        ? 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Administration ──────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: SubscriptionPaymentStatus | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'SUCCESS', label: 'Payés' },
  { value: 'FAILED', label: 'Échecs' },
];

function AdminPayments() {
  const token = useAuthStore((s) => s.token);
  const [status, setStatus] = useState<SubscriptionPaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const query = useAdminSubscriptionPayments(
    { status: status || undefined, page, limit: 20 },
    token,
  );
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Abonnements Premium
          </h1>
          <p className="text-sm text-zinc-500">
            Paiements pawaPay des restaurateurs. Les mois s’ouvrent seuls à la confirmation de
            l’opérateur ; l’attribution manuelle reste sur la fiche du restaurant.
          </p>
        </div>
        <select
          className={`${inputCls} w-auto`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubscriptionPaymentStatus | '');
            setPage(1);
          }}
          aria-label="Filtrer par statut"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </header>

      {query.isError ? (
        <p className="text-sm text-red-600">
          {apiMessage(query.error, 'Impossible de charger les paiements d’abonnement.')}
        </p>
      ) : query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : rows.length === 0 ? (
        <p className={`${cardCls} text-sm text-zinc-500`}>Aucun paiement d’abonnement.</p>
      ) : (
        <div className={`${cardCls} overflow-x-auto p-0`}>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Restaurant</th>
                <th className="px-4 py-2">Durée</th>
                <th className="px-4 py-2">Montant</th>
                <th className="px-4 py-2">Numéro</th>
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{formatSubscriptionDate(p.createdAt)}</td>
                  <td className="px-4 py-2">
                    <Link className="text-primary-600 hover:underline" href={`/restaurants/${p.restaurant.id}`}>
                      {p.restaurant.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{durationLabel(p.months)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatCurrency(p.amountXaf)}</td>
                  <td className="px-4 py-2 font-mono">{p.phoneNumber}</td>
                  <td className="px-4 py-2 font-mono">{p.reference}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} label={paymentStatusLabel(p)} />
                    {p.status === 'FAILED' && p.failureCode && (
                      <span className="block text-xs text-zinc-500 mt-0.5">{failureLabel(p.failureCode)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Précédent
          </button>
          <span className="text-zinc-500">
            {page} / {meta.totalPages}
          </span>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-50"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
