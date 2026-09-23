'use client';

import { useState } from 'react';
import { Flag, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  ORDER_ISSUE_KINDS,
  useOrderDelivery,
  useReportOrderIssue,
  type OrderIssueKind,
} from '@lilia/api-client';

/**
 * Code de remise (Master Audit v1, F-06).
 *
 * Le livreur ne peut déclarer la commande livrée qu'en saisissant ce code :
 * c'est la preuve que le client l'a reçue. Le serveur ne le renvoie qu'au
 * client, pendant que le repas roule vers lui.
 */
export function HandoverCodePanel({
  orderId,
  token,
}: {
  orderId: string;
  token: string | null;
}) {
  const { data: delivery } = useOrderDelivery(orderId, token);
  const code = delivery?.handoverCode;
  if (!code) return null;

  return (
    <div className="bg-white rounded-2xl border border-tomato-200 p-5 mb-4 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-semibold text-ink-700">
        <KeyRound className="w-4 h-4" aria-hidden="true" />
        Code de remise
      </p>
      <p
        className="mt-2 text-4xl font-bold tracking-[0.4em] text-tomato-700"
        aria-label={`Code de remise ${code.split('').join(' ')}`}
      >
        {code}
      </p>
      <p className="mt-2 text-xs text-ink-500">
        Donnez ce code au livreur quand il vous remet la commande — jamais
        avant. Sans lui, il ne peut pas la déclarer livrée.
      </p>
    </div>
  );
}

/** Signalement client : le recours qui manquait (F-06). */
export function ReportIssuePanel({
  orderId,
  token,
}: {
  orderId: string;
  token: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OrderIssueKind | null>(null);
  const [message, setMessage] = useState('');
  const report = useReportOrderIssue(token);

  async function submit() {
    if (!kind) return;
    try {
      const res = await report.mutateAsync({ orderId, kind, message });
      toast.success(
        res.message ??
          'Signalement transmis. Notre équipe vous recontacte rapidement.',
      );
      setOpen(false);
      setKind(null);
      setMessage('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Signalement impossible');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full mb-4 flex items-center justify-center gap-2 rounded-2xl border border-cream-300 py-3 text-sm font-semibold text-ink-700 hover:bg-cream-100"
      >
        <Flag className="w-4 h-4" aria-hidden="true" />
        Signaler un problème
      </button>
    );
  }

  return (
    <fieldset className="bg-white rounded-2xl border border-cream-200 p-5 mb-4">
      <legend className="font-semibold text-ink-900 text-sm px-1">
        Signaler un problème
      </legend>
      <div className="flex flex-col gap-2 mt-2">
        {ORDER_ISSUE_KINDS.map((option) => (
          <label key={option.kind} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="order-issue"
              value={option.kind}
              checked={kind === option.kind}
              onChange={() => setKind(option.kind)}
            />
            {option.label}
          </label>
        ))}
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Précisions (facultatif)"
        className="mt-3 w-full rounded-xl border border-cream-300 p-3 text-sm"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-cream-300 py-2 text-sm"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!kind || report.isPending}
          onClick={submit}
          className="flex-1 rounded-xl bg-tomato-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </fieldset>
  );
}
