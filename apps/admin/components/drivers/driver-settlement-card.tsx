'use client';

import { useState } from 'react';
import { Banknote, Check, RotateCcw, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCancelDriverSettlement,
  useDriverOutstanding,
  useDriverSettlements,
  useRecordDriverSettlement,
} from '@lilia/api-client';
import type { DriverSettlementMethod } from '@lilia/types';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';

// Le formatage vit déjà à l'identique dans `order-financials-card` : deux
// définitions d'un même format finissent par diverger, mais les extraire
// dépasse le périmètre de ce lot. À factoriser avec elle.
const formatXaf = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const METHOD_LABELS: Record<DriverSettlementMethod, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  OTHER: 'Autre',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Règlement d'un livreur — ce qu'on lui doit, et ce qu'on lui a versé.
 *
 * ## Ce que cet écran n'est pas
 *
 * Un bouton « payer ». Aucun virement n'est déclenché : l'argent est remis hors
 * application (espèces, Mobile Money passé à la main). Cet écran **enregistre**
 * un versement déjà fait. Le libellé du bouton le dit — « J'ai versé ce
 * montant » et non « Payer » — parce qu'un bouton qui semble payer serait
 * cliqué en croyant payer.
 *
 * ## Le piège que `coveredUntil` ferme
 *
 * Le montant dû est une lecture prise à un instant. Entre son affichage et le
 * clic, le livreur peut terminer une course. Si l'enregistrement couvrait
 * « tout ce qui est non réglé maintenant », cette course serait absorbée dans
 * un montant déjà convenu et déjà remis — le livreur serait sous-payé sans que
 * rien ne le signale.
 *
 * On renvoie donc **le `coveredUntil` de l'aperçu affiché**, jamais une date
 * calculée au moment du clic. C'est la raison d'être de ce champ, et la seule
 * chose à ne pas « simplifier » dans ce composant.
 */
export function DriverSettlementCard({ driverId }: { driverId: string }) {
  const { token } = useAuthStore();
  const outstanding = useDriverOutstanding(driverId, token);
  const history = useDriverSettlements(driverId, token);
  const record = useRecordDriverSettlement(token);
  const cancel = useCancelDriverSettlement(token);

  const [method, setMethod] = useState<DriverSettlementMethod>('CASH');
  const [reference, setReference] = useState('');
  const [confirming, setConfirming] = useState(false);

  if (outstanding.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (outstanding.isError || !outstanding.data) {
    return (
      <p className="text-xs text-red-500">
        Impossible de charger le décompte de ce livreur.
      </p>
    );
  }

  const due = outstanding.data;
  const nothingDue = due.courseCount === 0;

  function submit() {
    if (!due) return;
    record.mutate(
      {
        driverId,
        // ⚠️ Celui de l'aperçu affiché. Ne JAMAIS remplacer par une date
        // calculée ici : voir le commentaire de tête.
        coveredUntil: due.coveredUntil,
        method,
        reference: reference.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Règlement enregistré');
          setConfirming(false);
          setReference('');
        },
        onError: (e) => toast.error(apiMessage(e, 'Erreur lors de l’enregistrement')),
      },
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-dark-border overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-dark-surface border-b border-zinc-200 dark:border-dark-border">
        <Wallet size={14} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
          Règlement du livreur
        </span>
      </div>

      {/* ── Ce qu'on lui doit ─────────────────────────────────────────────── */}
      <div className="p-3 border-b border-zinc-100 dark:border-dark-border">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
          Reste dû
        </p>
        <p className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
          {formatXaf(due.amountXaf)}{' '}
          <span className="text-sm font-normal text-zinc-400">XAF</span>
        </p>
        <p className="text-[11px] text-zinc-400 mt-1">
          {nothingDue
            ? 'Aucune course à régler.'
            : `${due.courseCount} course(s)${
                due.periodStart ? ` depuis le ${formatDate(due.periodStart)}` : ''
              }, arrêté au ${formatDate(due.coveredUntil)}`}
        </p>
        {/* Les courses antérieures à la capture de l'économie n'ont pas de
            montant : le dire, sinon un « 0 » se lirait comme « rien à payer ». */}
        {nothingDue && (
          <p className="text-[11px] text-zinc-400 mt-1">
            Les courses antérieures au 18/09/2026 n’ont pas de rémunération
            enregistrée et n’entrent pas dans ce décompte.
          </p>
        )}
      </div>

      {/* ── Enregistrer un versement DÉJÀ fait ────────────────────────────── */}
      {!nothingDue && (
        <div className="p-3 space-y-2 border-b border-zinc-100 dark:border-dark-border">
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
            >
              <Banknote size={15} />
              {/* « J'ai versé » et non « Payer » : rien n'est envoyé d'ici. */}
              J’ai versé ce montant
            </button>
          ) : (
            <>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Cet écran n’envoie aucun argent : il enregistre un versement que
                vous avez déjà effectué.
              </p>
              <div className="flex gap-2">
                <select
                  value={method}
                  onChange={(e) =>
                    setMethod(e.target.value as DriverSettlementMethod)
                  }
                  className="flex-1 text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-2"
                >
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Référence (n° transaction, reçu)"
                  maxLength={120}
                  className="flex-[2] text-sm rounded-lg border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={record.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
                >
                  <Check size={15} />
                  Enregistrer {formatXaf(due.amountXaf)} XAF
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-2 rounded-xl text-sm text-zinc-500"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Ce qu'on lui a déjà versé ─────────────────────────────────────── */}
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-2">
          Versements enregistrés
        </p>
        {history.isLoading ? (
          <Skeleton className="h-12 rounded-lg" />
        ) : !history.data?.data.length ? (
          <p className="text-[11px] text-zinc-400">Aucun versement enregistré.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.data.data.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300"
              >
                <span
                  className={
                    s.status === 'CANCELLED'
                      ? 'line-through text-zinc-400'
                      : 'font-medium'
                  }
                >
                  {formatXaf(s.amountXaf)} XAF
                </span>
                <span className="text-zinc-400">
                  · {s.courseCount} course(s) · {METHOD_LABELS[s.method]} ·{' '}
                  {formatDate(s.paidAt)}
                </span>
                {s.reference && (
                  <span className="text-zinc-400">· {s.reference}</span>
                )}
                {s.status === 'PAID' && (
                  <button
                    onClick={() => {
                      const reason = window.prompt(
                        'Motif de l’annulation (les courses redeviendront à régler) :',
                      );
                      if (!reason?.trim()) return;
                      cancel.mutate(
                        { id: s.id, reason: reason.trim() },
                        {
                          onSuccess: () => toast.success('Règlement annulé'),
                          onError: (e) => toast.error(apiMessage(e, 'Erreur lors de l’enregistrement')),
                        },
                      );
                    }}
                    className="ml-auto text-zinc-400 hover:text-red-500"
                    title="Annuler cette saisie"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
