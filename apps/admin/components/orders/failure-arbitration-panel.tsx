'use client';

import { useState } from 'react';
import { useConcludeFailure, useFailureEvidence } from '@lilia/api-client';
import type {
  DeliveryFailureReason,
  FailureConclusion,
  FailureLiability,
} from '@lilia/types';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { apiMessage } from '@/lib/api-message';

const REASON_LABELS: Record<DeliveryFailureReason, string> = {
  CUSTOMER_UNREACHABLE: 'Client injoignable',
  ADDRESS_NOT_FOUND: 'Adresse introuvable',
  CUSTOMER_REFUSED: 'Le client a refusé la commande',
  ACCIDENT: 'Accident ou panne',
  LOST_OR_DAMAGED: 'Commande perdue ou abîmée',
  DRIVER_NO_SHOW: 'Aucun livreur n’est venu',
  OTHER: 'Autre',
};

export const LIABILITY_LABELS: Record<FailureLiability, string> = {
  CLIENT: 'Le client',
  DRIVER: 'Le livreur',
  VENDOR: 'Le vendeur',
  PLATFORM: 'Lilia (plateforme)',
};

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
const time = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', {
        timeZone: 'Africa/Brazzaville',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * Arbitrage d'un échec de livraison (F3-05) — ADMIN.
 *
 * Le livreur (ou le vendeur) a déclaré l'échec ; ici, on décide qui en
 * répond. Le choix fixe l'argent : les montants affichés sont ceux que le
 * serveur appliquera (aperçu `dryRun`), jamais un calcul local. Réassigner un
 * livreur reste possible juste au-dessus, tant que rien n'est conclu.
 */
export function FailureArbitrationPanel({
  orderId,
  token,
}: {
  orderId: string;
  token: string | null;
}) {
  const evidence = useFailureEvidence(token, orderId);
  const conclude = useConcludeFailure(token, orderId);
  const [liability, setLiability] = useState<FailureLiability | null>(null);
  const [preview, setPreview] = useState<FailureConclusion | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  function choose(next: FailureLiability) {
    setLiability(next);
    setPreview(null);
    setPreviewError(null);
    conclude.mutate(
      { liability: next, dryRun: true },
      {
        onSuccess: setPreview,
        // Le refus du serveur est l'information : « le client ne peut pas
        // être tenu responsable : 1 appel journalisé… ».
        onError: (e) => setPreviewError(apiMessage(e, 'Aperçu impossible.')),
      },
    );
  }

  function confirm() {
    if (!liability || !preview) return;
    if (
      !window.confirm(
        `Conclure l'échec — responsable : ${LIABILITY_LABELS[liability]} ?\n\n` +
          `Remboursement client : ${fmt(preview.refundXaf)}\n` +
          `Vendeur payé : ${preview.vendorPaid ? 'oui' : 'non'}\n` +
          `Paie du livreur : ${fmt(preview.driverPayXaf)}\n\n` +
          'La commande passera « Livraison non aboutie ». C’est définitif.',
      )
    )
      return;
    conclude.mutate(
      { liability, dryRun: false },
      {
        onSuccess: () => toast.success('Échec conclu'),
        onError: (e) => toast.error(apiMessage(e, 'Conclusion impossible.')),
      },
    );
  }

  const reports = (evidence.data ?? []).filter((r) => r.declaredAt);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm dark:border-red-900 dark:bg-red-950/20">
      <p className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
        <AlertTriangle size={16} /> Livraison en échec — à arbitrer
      </p>

      {evidence.isLoading ? (
        <p className="text-zinc-500">Chargement des preuves…</p>
      ) : reports.length === 0 ? (
        <p className="text-zinc-500">Aucune déclaration détaillée (ancienne version de l’app).</p>
      ) : (
        <ul className="mb-3 space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg bg-white/70 p-2 dark:bg-zinc-900/40">
              <p className="font-medium">
                {r.reason ? REASON_LABELS[r.reason] : 'Motif non précisé'}{' '}
                <span className="font-normal text-zinc-500">
                  — {r.reportedByRole === 'LIVREUR' ? 'livreur' : r.reportedByRole === 'RESTAURATEUR' ? 'vendeur' : 'admin'}, {time(r.declaredAt)}
                </span>
              </p>
              {r.note && <p className="text-zinc-600 dark:text-zinc-300">« {r.note} »</p>}
              {r.protocolStartedAt && (
                <p className="text-xs text-zinc-500">
                  Protocole démarré {time(r.protocolStartedAt)} · {r.callAttempts} appel(s) ·
                  SMS {r.smsSentAt ? 'envoyé' : 'non parti'}
                </p>
              )}
              {r.distanceToDestM != null && (
                <p className="text-xs text-zinc-500">
                  Livreur à {r.distanceToDestM} m de l’adresse à la déclaration
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mb-2 text-zinc-600 dark:text-zinc-300">Qui répond de l’échec ?</p>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(LIABILITY_LABELS) as FailureLiability[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            disabled={conclude.isPending}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              liability === key
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
            }`}
          >
            {LIABILITY_LABELS[key]}
          </button>
        ))}
      </div>

      {previewError && <p className="mb-2 text-red-600">{previewError}</p>}
      {preview && (
        <div className="mb-3 grid gap-1 rounded-lg bg-white/70 p-3 dark:bg-zinc-900/40">
          <p>Remboursement client : <strong>{fmt(preview.refundXaf)}</strong></p>
          <p>Vendeur payé : <strong>{preview.vendorPaid ? 'oui' : 'non'}</strong></p>
          <p>Paie du livreur : <strong>{fmt(preview.driverPayXaf)}</strong></p>
          <p className="text-xs text-zinc-500">
            Le remboursement s’ouvre dans la file « Remboursements » ; rien n’est
            viré depuis cet écran.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={confirm}
        disabled={!preview || conclude.isPending}
        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
      >
        Conclure l’échec
      </button>
    </div>
  );
}
