'use client';

import { useEffect, useState } from 'react';
import type {
  AdminOrder,
  OrderAction,
  OrderStatus,
  VendorRejectionReason,
} from '@lilia/types';
import { Timer } from 'lucide-react';

import {
  ACTION_LABELS,
  ACTION_TARGET,
  PREP_MINUTES_CHOICES,
  REJECTION_REASONS,
  resolveOrderActions,
} from '@/lib/order-actions';

type Mode = 'idle' | 'accept' | 'reject';

/**
 * Gestes sur une commande (Phase 3, F3-01 — règle R1).
 *
 * N'affiche que ce que le serveur publie (`allowedActions`). Accepter demande
 * un temps de préparation, Refuser un motif en liste fermée : les deux
 * formulaires s'ouvrent dans la carte, sans fenêtre modale.
 */
export function OrderActions({
  order,
  role,
  pending,
  onStatusUpdate,
  onAccept,
  onReject,
}: {
  order: AdminOrder;
  role: string | undefined;
  pending?: boolean;
  onStatusUpdate: (id: string, status: OrderStatus) => void;
  onAccept: (id: string, prepMinutes: number) => void;
  onReject: (id: string, reason: VendorRejectionReason, note?: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('idle');
  const [prepMinutes, setPrepMinutes] = useState<number>(20);
  const [reason, setReason] = useState<VendorRejectionReason | null>(null);
  const [note, setNote] = useState('');
  const actions = resolveOrderActions(order, role);

  if (actions.length === 0) return null;

  function trigger(action: OrderAction) {
    if (action === 'ACCEPT') return setMode('accept');
    if (action === 'REJECT') return setMode('reject');
    if (
      action === 'CANCEL' &&
      !window.confirm('Annuler cette commande ? Le client sera notifié.')
    ) {
      return;
    }
    onStatusUpdate(order.id, ACTION_TARGET[action]);
  }

  if (mode === 'accept') {
    return (
      <div className="w-full space-y-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3">
        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
          Temps de préparation annoncé au client
        </p>
        <div className="flex flex-wrap gap-2">
          {PREP_MINUTES_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPrepMinutes(m)}
              aria-pressed={prepMinutes === m}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                prepMinutes === m
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-emerald-300 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setMode('idle')} className="text-xs px-3 py-1.5 text-zinc-600 dark:text-zinc-300">
            Retour
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              onAccept(order.id, prepMinutes);
              setMode('idle');
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50"
          >
            Accepter la commande
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'reject') {
    return (
      <div className="w-full space-y-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3">
        <p className="text-xs font-medium text-red-800 dark:text-red-300">
          Motif du refus — le client sera remboursé automatiquement
        </p>
        <div className="space-y-1">
          {REJECTION_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200">
              <input
                type="radio"
                name={`reject-${order.id}`}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>
        <input
          type="text"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Précision (facultatif)"
          className="w-full text-xs rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card px-2 py-1.5"
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setMode('idle')} className="text-xs px-3 py-1.5 text-zinc-600 dark:text-zinc-300">
            Retour
          </button>
          <button
            type="button"
            disabled={!reason || pending}
            onClick={() => {
              if (!reason) return;
              onReject(order.id, reason, note);
              setMode('idle');
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
          >
            Refuser la commande
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {order.status === 'PAYER' && order.acceptDeadlineAt && (
        <AcceptDeadline deadline={order.acceptDeadlineAt} />
      )}
      {actions.map((action) => {
        const danger = action === 'CANCEL' || action === 'REJECT';
        return (
          <button
            key={action}
            type="button"
            disabled={pending}
            onClick={() => trigger(action)}
            className={
              danger
                ? 'text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50'
                : 'text-xs px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors disabled:opacity-50'
            }
          >
            {ACTION_LABELS[action]}
          </button>
        );
      })}
    </div>
  );
}

/** « Avant 12:08 · 5 min » — rafraîchi toutes les 15 s. */
function AcceptDeadline({ deadline }: { deadline: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const at = new Date(deadline);
  const minutesLeft = Math.floor((at.getTime() - now) / 60_000);
  const hhmm = at.toLocaleTimeString('fr-FR', {
    timeZone: 'Africa/Brazzaville',
    hour: '2-digit',
    minute: '2-digit',
  });
  const urgent = minutesLeft < 3;
  const text =
    minutesLeft < 0
      ? 'Délai dépassé'
      : `Avant ${hhmm} · ${minutesLeft < 1 ? '< 1 min' : `${minutesLeft} min`}`;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        urgent
          ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
      }`}
      title="Au-delà, la commande est annulée et le client remboursé"
    >
      <Timer size={12} />
      {text}
    </span>
  );
}
