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
  asksPickupCode,
  isPickupCode,
  resolveOrderActions,
} from '@/lib/order-actions';

type Mode = 'idle' | 'accept' | 'reject' | 'handover';

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
  onHandOverWithCode,
}: {
  order: AdminOrder;
  role: string | undefined;
  pending?: boolean;
  onStatusUpdate: (id: string, status: OrderStatus) => void;
  onAccept: (id: string, prepMinutes: number) => void;
  onReject: (
    id: string,
    reason: VendorRejectionReason,
    note?: string,
    outOfStockProductIds?: string[],
  ) => void;
  /** Retrait : remise avec le code du client (F3-07). */
  onHandOverWithCode?: (id: string, code: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('idle');
  const [prepMinutes, setPrepMinutes] = useState<number>(20);
  const [reason, setReason] = useState<VendorRejectionReason | null>(null);
  const [note, setNote] = useState('');
  const [missing, setMissing] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const actions = resolveOrderActions(order, role);

  if (actions.length === 0) return null;

  function trigger(action: OrderAction) {
    if (action === 'ACCEPT') return setMode('accept');
    if (action === 'REJECT') return setMode('reject');
    if (action === 'HAND_OVER' && onHandOverWithCode && asksPickupCode(order, role)) {
      setCode('');
      return setMode('handover');
    }
    if (action === 'CONFIRM_PICKUP') return;
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

  if (mode === 'handover') {
    return (
      <div className="w-full space-y-2 rounded-lg border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 p-3">
        <p className="text-xs font-medium text-teal-800 dark:text-teal-300">
          Demandez au client le code à 4 chiffres affiché dans son application.
          Avec ce code, la remise est prouvée : votre paiement peut partir sans
          attendre le client.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="0000"
          aria-label="Code de retrait du client"
          className="w-32 text-center text-lg tracking-[0.4em] rounded-lg border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card px-2 py-1.5"
        />
        <p className="text-[11px] text-zinc-500">
          Sans code, votre paiement attendra que le client confirme le retrait.
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={() => setMode('idle')} className="text-xs px-3 py-1.5 text-zinc-600 dark:text-zinc-300">
            Retour
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              onStatusUpdate(order.id, 'LIVRER');
              setMode('idle');
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-teal-300 text-teal-800 dark:text-teal-300 disabled:opacity-50"
          >
            Remettre sans code
          </button>
          <button
            type="button"
            disabled={!isPickupCode(code) || pending}
            onClick={() => {
              if (!isPickupCode(code)) return;
              onHandOverWithCode?.(order.id, code);
              setMode('idle');
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium disabled:opacity-50"
          >
            Valider le code
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
        {/* F3-10 — sur « Rupture de stock », ce qui manque vraiment passe à 0 ;
            le reste de la commande retourne en stock. */}
        {reason === 'OUT_OF_STOCK' && orderProducts(order).length > 0 && (
          <div className="space-y-1 rounded-md bg-white/60 dark:bg-dark-card/60 p-2">
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
              Qu’est-ce qui manque ? Ces produits passeront en rupture ; les autres retourneront en stock.
            </p>
            {orderProducts(order).map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={missing.includes(p.id)}
                  onChange={(e) =>
                    setMissing((m) => (e.target.checked ? [...m, p.id] : m.filter((id) => id !== p.id)))
                  }
                />
                {p.nom}
              </label>
            ))}
          </div>
        )}
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
              onReject(order.id, reason, note, reason === 'OUT_OF_STOCK' ? missing : []);
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

/** Un produit par ligne de commande, sans doublon (bouteille et carton = un produit). */
function orderProducts(order: AdminOrder): Array<{ id: string; nom: string }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; nom: string }> = [];
  for (const item of order.items ?? []) {
    if (!item.productId || seen.has(item.productId)) continue;
    seen.add(item.productId);
    out.push({ id: item.productId, nom: item.product?.nom ?? 'Produit' });
  }
  return out;
}
