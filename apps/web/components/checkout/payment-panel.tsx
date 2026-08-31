'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Phone,
  RefreshCw,
  Smartphone,
  XCircle,
} from 'lucide-react';
import {
  useCreatePayment,
  useOrderPayment,
  usePaymentProviders,
} from '@lilia/api-client';
import type {
  ManualPaymentInstructions,
  OrderStatus,
  PaymentMethod,
  PaymentStatusView,
} from '@lilia/types';
import { formatCurrency, formatDateTime, cn, isValidCongoPhone } from '@lilia/utils';
import { toast } from 'sonner';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  AIRTEL_MONEY: 'Airtel Money',
  CASH_ON_DELIVERY: 'À la livraison',
};

/** Code USSD de secours quand la demande automatique n'arrive pas. */
const USSD: Partial<Record<PaymentMethod, string>> = {
  MTN_MOMO: '*105#',
  AIRTEL_MONEY: '*555#',
};

/**
 * Bloc de paiement du détail d'une commande.
 *
 * C'est **la seule** surface de paiement du site : le checkout ouvre la
 * tentative puis renvoie ici, et cette page reprend la main sur tous les
 * chemins de retour — rechargement, retour depuis l'historique, reprise après
 * un échec. Un second écran dédié dupliquerait ces états et finirait par en
 * oublier un.
 *
 * Trois principes :
 *
 *  1. **Le serveur décide.** Rien ici ne déclare un paiement réussi : l'état
 *     affiché vient de `GET /payments/…`, alimenté par le prestataire via le
 *     webhook, l'interrogation et le cron de réconciliation.
 *  2. **Aucun montant n'est recalculé.** On affiche `payment.amount`, qui est
 *     ce que le serveur a réellement demandé à l'opérateur.
 *  3. **L'absence de réponse n'est pas un échec.** Passé trois minutes on cesse
 *     d'interroger et on le dit — dire « raté » inviterait à payer deux fois.
 */
export function PaymentPanel({
  orderId,
  orderStatus,
  orderTotal,
  orderMethod,
  contactPhone,
  token,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  orderTotal: number;
  orderMethod: PaymentMethod;
  contactPhone?: string | null;
  token: string | null;
}) {
  // Une commande annulée n'a plus rien à encaisser, et au-delà de PAYER le
  // paiement est acquis : on n'affiche alors qu'un récapitulatif.
  const isCancelled = orderStatus === 'ANNULER';
  const isPayable = orderStatus === 'EN_ATTENTE';

  const { data: payment, isLoading, refetch, isFetching } = useOrderPayment(
    orderId,
    token,
    { enabled: !isCancelled },
  );

  // Instructions de virement (mode MANUAL) — connues seulement à l'ouverture de
  // la tentative. Elles ne sont pas persistées : au rechargement on retombe sur
  // un message générique, ce qui reste juste.
  const [instructions, setInstructions] = useState<ManualPaymentInstructions | null>(null);

  if (isCancelled) return null;

  if (isLoading) {
    return <div className="skeleton h-32 rounded-2xl mb-4" />;
  }

  const settled = payment?.status === 'SUCCESS';
  const failed = payment?.status === 'FAILED' || payment?.status === 'CANCELLED';

  if (settled) {
    return <PaymentSuccessCard payment={payment} />;
  }

  if (!isPayable) {
    // La commande a avancé sans qu'un encaissement `SUCCESS` soit visible :
    // total réglé en points, ou confirmation manuelle. On n'invente rien.
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="w-4 h-4 text-tomato-700" />
        <h3 className="font-semibold text-ink-900 text-sm">Paiement</h3>
      </div>

      <AnimatePresence mode="wait">
        {payment?.status === 'PENDING' ? (
          <PendingState
            key="pending"
            payment={payment}
            instructions={instructions}
            onCheckNow={() => void refetch()}
            checking={isFetching}
          />
        ) : (
          <PaymentForm
            key="form"
            orderId={orderId}
            orderTotal={orderTotal}
            orderMethod={orderMethod}
            contactPhone={contactPhone}
            token={token}
            previous={failed ? payment : null}
            onOpened={(intent) => setInstructions(intent ?? null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────── Succès ─────────────────────────────────── */

function PaymentSuccessCard({ payment }: { payment: PaymentStatusView }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="font-semibold text-emerald-800 text-sm">Paiement confirmé</p>
      </div>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-emerald-700/80">Montant payé</dt>
        <dd className="text-right font-semibold text-emerald-900">
          {formatCurrency(payment.amount)}
        </dd>
        <dt className="text-emerald-700/80">Moyen de paiement</dt>
        <dd className="text-right text-emerald-900">
          {payment.method ? METHOD_LABELS[payment.method] : 'Mobile Money'}
        </dd>
        <dt className="text-emerald-700/80">Date</dt>
        <dd className="text-right text-emerald-900">
          {formatDateTime(payment.completedAt ?? payment.createdAt)}
        </dd>
        <dt className="text-emerald-700/80">Référence</dt>
        <dd className="text-right font-mono text-xs text-emerald-900 self-center">
          {payment.paymentId.slice(-8).toUpperCase()}
        </dd>
      </dl>
    </div>
  );
}

/* ────────────────────────────── En attente ─────────────────────────────── */

function PendingState({
  payment,
  instructions,
  onCheckNow,
  checking,
}: {
  payment: PaymentStatusView;
  instructions: ManualPaymentInstructions | null;
  onCheckNow: () => void;
  checking: boolean;
}) {
  const elapsed = useElapsed(payment.createdAt);
  const isManual = payment.provider === 'MANUAL';
  const ussd = payment.method ? USSD[payment.method] : undefined;
  // Au-delà de trois minutes le suivi s'arrête (cf. `useOrderPayment`) : on le
  // dit plutôt que de laisser tourner une animation qui ne mène nulle part.
  const givenUp = elapsed > 3 * 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-3 mt-3"
    >
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        {givenUp ? (
          <Smartphone className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <Loader2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-spin" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-amber-800 text-sm">
            {givenUp ? 'Paiement toujours en cours' : 'Paiement en attente'}
          </p>
          <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
            {givenUp
              ? 'Nous n’avons pas encore reçu la confirmation de l’opérateur. Si vous avez validé, votre commande sera confirmée d’ici quelques minutes. Ne payez pas une seconde fois.'
              : isManual
                ? instructions?.message ??
                  'Effectuez le virement sur le numéro communiqué, puis patientez : un agent Lilia Food confirme votre paiement.'
                : `Une demande de paiement a été envoyée sur votre téléphone. Saisissez votre code secret ${
                    payment.method ? METHOD_LABELS[payment.method] : 'Mobile Money'
                  } pour confirmer.`}
          </p>
        </div>
      </div>

      {isManual && instructions && (
        <div className="p-3 bg-cream-100 border border-cream-300 rounded-xl text-xs text-ink-700 flex flex-col gap-1">
          <div className="flex justify-between gap-3">
            <span>Numéro</span>
            <span className="font-mono font-semibold text-ink-900">{instructions.phone}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Montant</span>
            <span className="font-semibold text-ink-900">{formatCurrency(instructions.amount)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Référence</span>
            <span className="font-mono text-ink-900">{instructions.reference}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-500 tabular-nums">
          {formatElapsed(elapsed)} · {formatCurrency(payment.amount)}
        </span>
        <button
          onClick={onCheckNow}
          disabled={checking}
          className="flex items-center gap-1.5 text-xs font-medium text-tomato-700 hover:text-ink-900 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', checking && 'animate-spin')} />
          Vérifier maintenant
        </button>
      </div>

      {/* Le rappel USSD n'apparaît qu'après 20 s : l'afficher tout de suite
          suggérerait que la demande automatique ne fonctionne pas. */}
      {!isManual && ussd && elapsed >= 20 && (
        <p className="text-xs text-ink-500 leading-relaxed">
          Vous n’avez rien reçu ? Composez{' '}
          <span className="font-mono font-semibold text-ink-900">{ussd}</span> sur votre
          téléphone et validez le paiement en attente.
        </p>
      )}
    </motion.div>
  );
}

/* ──────────────────────── Formulaire / reprise ─────────────────────────── */

function PaymentForm({
  orderId,
  orderTotal,
  orderMethod,
  contactPhone,
  token,
  previous,
  onOpened,
}: {
  orderId: string;
  orderTotal: number;
  orderMethod: PaymentMethod;
  contactPhone?: string | null;
  token: string | null;
  previous: PaymentStatusView | null;
  onOpened: (instructions: ManualPaymentInstructions | undefined) => void;
}) {
  const { data: providers } = usePaymentProviders();
  const createPayment = useCreatePayment(token);

  const [method, setMethod] = useState<PaymentMethod>(
    orderMethod === 'CASH_ON_DELIVERY' ? 'MTN_MOMO' : orderMethod,
  );
  // On redemande le numéro plutôt que de reprendre celui de la commande : le
  // téléphone donné au livreur n'est pas forcément celui qui paie, et une
  // seconde tentative vise souvent un autre compte — c'est précisément parce
  // que le premier n'avait pas de solde qu'on en est là.
  const [phone, setPhone] = useState(contactPhone ?? '');
  const [touched, setTouched] = useState(false);
  const phoneValid = isValidCongoPhone(phone);

  const operators = providers?.operators ?? [
    { code: 'MTN_MOMO' as const, label: METHOD_LABELS.MTN_MOMO, available: true },
    { code: 'AIRTEL_MONEY' as const, label: METHOD_LABELS.AIRTEL_MONEY, available: true },
  ];

  async function handleSubmit() {
    if (!phoneValid) {
      setTouched(true);
      toast.error('Numéro Mobile Money invalide');
      return;
    }
    try {
      const intent = await createPayment.mutateAsync({
        orderId,
        phoneNumber: phone.trim(),
        method,
        payerMessage: `Commande ${orderId.slice(-6).toUpperCase()}`,
      });
      onOpened(intent.instructions);
      if (intent.status === 'SUCCESS') {
        toast.success('Commande déjà réglée.');
      } else {
        toast.success('Demande de paiement envoyée sur votre téléphone');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Paiement impossible pour le moment');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-3 mt-3"
    >
      {previous && (
        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-rose-800 text-sm">Le paiement a échoué</p>
            <p className="text-xs text-rose-600 mt-0.5 leading-relaxed">
              {previous.failureMessage ??
                'L’opérateur n’a pas confirmé le paiement. Votre commande est conservée : vous pouvez réessayer.'}
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-500">
        Montant dû : <span className="font-semibold text-ink-900">{formatCurrency(orderTotal)}</span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {operators.map((op) => (
          <button
            key={op.code}
            onClick={() => op.available && setMethod(op.code)}
            disabled={!op.available}
            className={cn(
              'flex items-center gap-2 p-3 rounded-xl border text-sm transition-all text-left',
              method === op.code
                ? 'border-tomato-500 bg-tomato-100 text-tomato-700'
                : 'border-cream-300 text-ink-700 hover:border-ink-300',
              !op.available && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full shrink-0',
                op.code === 'MTN_MOMO' ? 'bg-yellow-400' : 'bg-red-500',
              )}
            />
            <span className="min-w-0 truncate">{op.label}</span>
          </button>
        ))}
      </div>
      {operators.some((op) => !op.available) && (
        <p className="text-xs text-amber-600">
          Un opérateur est momentanément indisponible — choisissez l’autre.
        </p>
      )}

      <label className="block">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-700 mb-1.5">
          <Phone className="w-3.5 h-3.5" />
          Numéro Mobile Money à débiter
        </span>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="+242 06 XXX XX XX"
          aria-invalid={touched && !phoneValid}
          className={cn(
            'w-full text-sm border bg-white text-ink-900 placeholder:text-ink-500 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 transition-all',
            touched && !phoneValid
              ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-400'
              : 'border-cream-300 focus:ring-tomato-500/20 focus:border-tomato-500',
          )}
        />
        {touched && !phoneValid && (
          <p className="text-xs text-rose-600 mt-1.5">
            Format invalide — utilisez +242 06 XX XX XX XX (MTN/Airtel Congo)
          </p>
        )}
      </label>

      <button
        onClick={handleSubmit}
        // Le verrou local n'est qu'un confort : la vraie garantie contre le
        // double débit est l'index unique partiel côté base.
        disabled={createPayment.isPending || !phoneValid}
        className="w-full flex items-center justify-center gap-2 py-3 bg-tomato-600 hover:bg-tomato-700 text-white font-semibold text-sm rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {createPayment.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Initialisation du paiement…
          </>
        ) : previous ? (
          'Réessayer le paiement'
        ) : (
          'Procéder au paiement'
        )}
      </button>
    </motion.div>
  );
}

/* ────────────────────────────── Helpers ────────────────────────────────── */

/** Secondes écoulées depuis l'ouverture de la tentative, rafraîchies chaque seconde. */
function useElapsed(since: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
