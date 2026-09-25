'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useComposeRefund, useRefundQuote } from '@lilia/api-client';
import type {
  ManualRefundReasonCode,
  RefundBearer,
  RefundLineInput,
  RefundQuote,
} from '@lilia/types';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';
import { apiMessage } from '@/lib/api-message';
import {
  BEARER_LABELS,
  REASON_LABELS,
  buildRefundLines,
  type RefundSelection,
} from '@/lib/refund-composer';

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Composeur de remboursement partiel (F3-06) — ADMIN.
 *
 * On coche, le **serveur** calcule : chaque changement de sélection redemande
 * un aperçu (`/refunds/quote`), et le bouton affiche le total rendu par le
 * serveur, jamais une somme faite ici. Le serveur refuse aussi ce que l'écran
 * aurait laissé passer (quantité déjà remboursée, somme dépassée, vendeur déjà
 * payé) : son message s'affiche tel quel.
 */
export function RefundComposer({
  orderId,
  token,
  incidentId,
  defaultReason = 'GOODWILL',
  preselected = [],
  onDone,
}: {
  orderId: string;
  token: string | null;
  incidentId?: string;
  defaultReason?: ManualRefundReasonCode;
  /** Articles cochés d'office (ceux de la réclamation). */
  preselected?: { orderItemId: string; quantity: number }[];
  onDone?: () => void;
}) {
  const quote = useRefundQuote(token, orderId);
  const compose = useComposeRefund(token, orderId);
  const [reason, setReason] = useState<ManualRefundReasonCode>(defaultReason);
  const [bearer, setBearer] = useState<RefundBearer | null>(null);
  const [selection, setSelection] = useState<RefundSelection>(() => ({
    items: Object.fromEntries(preselected.map((p) => [p.orderItemId, p.quantity])),
    deliveryFee: false,
    serviceFee: false,
    goodwillXaf: 0,
  }));
  const [note, setNote] = useState('');
  const [last, setLast] = useState<RefundQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lines: RefundLineInput[] = useMemo(() => buildRefundLines(selection), [selection]);

  // Aperçu serveur, débouncé. Le premier appel (lignes vides) donne la table.
  const mutateQuote = quote.mutate;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      mutateQuote(
        { lines, reasonCode: reason, ...(bearer ? { bearer } : {}) },
        {
          onSuccess: (q) => {
            setLast(q);
            setError(null);
          },
          onError: (e) => setError(apiMessage(e, 'Aperçu impossible.')),
        },
      );
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [lines, reason, bearer, mutateQuote]);

  const refundable = last?.refundable;
  const effectiveBearer = bearer ?? last?.suggestedBearer ?? 'PLATFORM';
  const total = error ? null : (last?.totalXaf ?? 0);
  const canSubmit =
    !!last && !error && lines.length > 0 && (total ?? 0) > 0 && !last.inFlight && !last.blockedReason;

  function submit() {
    if (!canSubmit || total == null) return;
    if (
      !window.confirm(
        `Rembourser ${fmt(total)} au client ?\n\n` +
          `Payeur : ${BEARER_LABELS[effectiveBearer]}\n` +
          'Le virement part tout de suite sur le numéro qui a payé la commande.',
      )
    )
      return;
    compose.mutate(
      {
        lines,
        reasonCode: reason,
        bearer: effectiveBearer,
        ...(incidentId ? { incidentId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          if (r.execution.executed) toast.success(`${fmt(r.amountXaf)} remboursés.`);
          else toast.warning(r.execution.message);
          onDone?.();
        },
        onError: (e) => toast.error(apiMessage(e, 'Remboursement impossible.')),
      },
    );
  }

  const setItem = (id: string, qty: number) =>
    setSelection((s) => ({ ...s, items: { ...s.items, [id]: qty } }));

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-dark-border p-4 text-sm space-y-3">
      <p className="flex items-center gap-2 font-semibold">
        <Undo2 size={16} /> Rembourser une partie de la commande
      </p>

      {!refundable ? (
        <p className="text-zinc-500">{error ?? 'Chargement…'}</p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            Payé {fmt(refundable.paidXaf)} · déjà remboursé {fmt(refundable.alreadyRefundedXaf)} ·
            reste {fmt(refundable.remainingXaf)}
          </p>
          {last?.inFlight && (
            <p className="text-amber-600">
              Un remboursement est déjà en cours sur cette commande : attendez son issue.
            </p>
          )}

          <table className="w-full text-xs">
            <tbody>
              {refundable.items.map((it) => {
                const left = it.orderedQty - it.refundedQty;
                const qty = selection.items[it.orderItemId] ?? 0;
                return (
                  <tr key={it.orderItemId} className="border-b border-zinc-100 dark:border-dark-border">
                    <td className="py-1.5 pr-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={left <= 0 || it.unitPriceXaf <= 0}
                          checked={qty > 0}
                          onChange={(e) => setItem(it.orderItemId, e.target.checked ? 1 : 0)}
                        />
                        {it.label}
                      </label>
                    </td>
                    <td className="py-1.5 text-zinc-500 whitespace-nowrap">
                      {it.unitPriceXaf > 0 ? fmt(it.unitPriceXaf) : 'compris dans le menu'}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      {qty > 0 ? (
                        <select
                          value={qty}
                          onChange={(e) => setItem(it.orderItemId, Number(e.target.value))}
                          className="rounded border border-zinc-200 dark:border-dark-border bg-transparent px-1"
                        >
                          {Array.from({ length: left }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} / {left}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-zinc-400">
                          {it.refundedQty > 0 ? `${it.refundedQty} déjà remboursé(s)` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={refundable.deliveryFeeRemainingXaf <= 0}
                checked={selection.deliveryFee}
                onChange={(e) => setSelection((s) => ({ ...s, deliveryFee: e.target.checked }))}
              />
              Frais de livraison ({fmt(refundable.deliveryFeeRemainingXaf)})
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={refundable.serviceFeeRemainingXaf <= 0}
                checked={selection.serviceFee}
                onChange={(e) => setSelection((s) => ({ ...s, serviceFee: e.target.checked }))}
              />
              Frais de service ({fmt(refundable.serviceFeeRemainingXaf)})
            </label>
            <label className="flex items-center gap-2">
              Geste commercial
              <input
                type="number"
                min={0}
                step={100}
                value={selection.goodwillXaf || ''}
                onChange={(e) =>
                  setSelection((s) => ({ ...s, goodwillXaf: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))
                }
                className="w-24 rounded border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-1"
                placeholder="0"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 text-xs">
            <label className="flex flex-col gap-1">
              Motif
              <select
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value as ManualRefundReasonCode);
                  setBearer(null); // revient au payeur par défaut du motif
                }}
                className="rounded border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-1.5"
              >
                {(Object.keys(REASON_LABELS) as ManualRefundReasonCode[]).map((k) => (
                  <option key={k} value={k}>
                    {REASON_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              À la charge de
              <select
                value={effectiveBearer}
                onChange={(e) => setBearer(e.target.value as RefundBearer)}
                className="rounded border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-1.5"
              >
                {(Object.keys(BEARER_LABELS) as RefundBearer[]).map((k) => (
                  <option key={k} value={k}>
                    {BEARER_LABELS[k]}
                    {last?.suggestedBearer === k ? ' (suggéré)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="Note interne (facultatif)"
            className="w-full rounded border border-zinc-200 dark:border-dark-border bg-transparent px-2 py-1.5 text-xs"
          />

          {error && <p className="text-red-600 text-xs">{error}</p>}
          {last?.blockedReason && <p className="text-amber-600 text-xs">{last.blockedReason}</p>}
          {effectiveBearer === 'VENDOR' && !last?.blockedReason && (total ?? 0) > 0 && (
            <p className="text-xs text-zinc-500">
              {fmt(total ?? 0)} seront retenus sur le prochain reversement du vendeur.
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || compose.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {compose.isPending
              ? 'Remboursement…'
              : total && total > 0
                ? `Rembourser ${fmt(total)}`
                : 'Rembourser'}
          </button>
        </>
      )}
    </div>
  );
}
