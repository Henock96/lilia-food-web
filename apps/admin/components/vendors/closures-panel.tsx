'use client';

import { useState } from 'react';
import {
  useCreateVendorClosure,
  useDeleteVendorClosure,
  usePauseVendor,
  useResumeVendor,
  useSetClosedOnHolidays,
  useVendorOpening,
} from '@lilia/api-client';
import type { VendorOpeningState } from '@lilia/types';
import { toast } from 'sonner';
import { CalendarOff, Pause, Play, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { formatBrazzaville, openingSummary, localInputToIso } from '@/lib/vendor-opening';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5';
const inputCls =
  'w-full text-sm px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
const btnCls =
  'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50';

const PAUSES: ReadonlyArray<[number, string]> = [
  [30, '30 min'],
  [60, '1 h'],
  [120, '2 h'],
  [24 * 60, '24 h'],
];

/**
 * Fermetures qui se terminent seules (F3-03) : pause, congés, jours fériés.
 *
 * Remplace l'interrupteur « Ouvert / Fermé » permanent qu'un vendeur oubliait
 * de relâcher. L'état affiché (« ouvert », « en pause jusqu'à 14h30 »…) vient
 * du serveur, qui applique la même règle au checkout.
 */
export function ClosuresPanel({ vendorId, token }: { vendorId: string; token: string | null }) {
  const query = useVendorOpening(token, vendorId);

  if (query.isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} flex flex-col items-center gap-3 text-sm`}>
        <p>{apiMessage(query.error, 'Impossible de charger les fermetures.')}</p>
        <button type="button" className={btnCls} onClick={() => void query.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PauseSection state={query.data} vendorId={vendorId} token={token} />
      <ClosuresSection state={query.data} vendorId={vendorId} token={token} />
    </div>
  );
}

function inFlightWarning(n: number | undefined) {
  if (!n) return;
  toast.info(
    `${n} commande${n > 1 ? 's' : ''} en cours : elle${n > 1 ? 's' : ''} ne sont pas annulée${n > 1 ? 's' : ''} et restent à servir.`,
  );
}

function PauseSection({
  state,
  vendorId,
  token,
}: {
  state: VendorOpeningState;
  vendorId: string;
  token: string | null;
}) {
  const pause = usePauseVendor(token, vendorId);
  const resume = useResumeVendor(token, vendorId);
  const holidays = useSetClosedOnHolidays(token, vendorId);

  function doPause(minutes: number) {
    pause.mutate(
      { minutes },
      {
        onSuccess: (r) => {
          toast.success('Boutique en pause');
          inFlightWarning(r.inFlightOrders);
        },
        onError: (e) => toast.error(apiMessage(e, 'Pause impossible.')),
      },
    );
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">État de la boutique</h3>
          <p
            className={`mt-1 text-sm ${state.isOpen ? 'text-emerald-600' : 'text-zinc-600 dark:text-zinc-400'}`}
          >
            {openingSummary(state)}
          </p>
        </div>
        {state.pausedUntil && (
          <button
            type="button"
            className={btnCls}
            disabled={resume.isPending}
            onClick={() =>
              resume.mutate(undefined, {
                onSuccess: () => toast.success('Pause levée'),
                onError: (e) => toast.error(apiMessage(e, 'Reprise impossible.')),
              })
            }
          >
            <Play size={14} /> Rouvrir maintenant
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs text-zinc-500">
          Mettre en pause — la boutique rouvre seule à l&apos;échéance (selon ses horaires).
        </p>
        <div className="flex flex-wrap gap-2">
          {PAUSES.map(([minutes, label]) => (
            <button
              key={minutes}
              type="button"
              className={btnCls}
              disabled={pause.isPending}
              onClick={() => doPause(minutes)}
            >
              <Pause size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-4 text-sm text-zinc-700 dark:text-zinc-300">
        Fermé les jours fériés
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary-500"
          checked={state.closedOnHolidays}
          disabled={holidays.isPending}
          onChange={(e) =>
            holidays.mutate(e.target.checked, {
              onError: (err) => toast.error(apiMessage(err, 'Enregistrement impossible.')),
            })
          }
        />
      </label>
    </div>
  );
}

function ClosuresSection({
  state,
  vendorId,
  token,
}: {
  state: VendorOpeningState;
  vendorId: string;
  token: string | null;
}) {
  const create = useCreateVendorClosure(token, vendorId);
  const remove = useDeleteVendorClosure(token, vendorId);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [reason, setReason] = useState('');

  function add() {
    if (!startsAt || !endsAt) {
      toast.error('Indiquez le début et la fin du congé.');
      return;
    }
    create.mutate(
      {
        startsAt: localInputToIso(startsAt),
        endsAt: localInputToIso(endsAt),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          toast.success('Congé enregistré');
          inFlightWarning(r.inFlightOrders);
          setStartsAt('');
          setEndsAt('');
          setReason('');
        },
        onError: (e) => toast.error(apiMessage(e, 'Enregistrement impossible.')),
      },
    );
  }

  return (
    <div className={`${cardCls} space-y-4`}>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Congés</h3>

      {state.closures.length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun congé prévu.</p>
      ) : (
        <ul className="space-y-2">
          {state.closures.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
            >
              <span className="flex items-center gap-2">
                <CalendarOff size={14} className="text-zinc-400" />
                du {formatBrazzaville(c.startsAt)} au {formatBrazzaville(c.endsAt)}
                {c.reason && <span className="text-zinc-400">— {c.reason}</span>}
              </span>
              <button
                type="button"
                aria-label="Supprimer le congé"
                disabled={remove.isPending}
                onClick={() => {
                  if (!window.confirm('Supprimer ce congé ?')) return;
                  remove.mutate(c.id, {
                    onError: (e) => toast.error(apiMessage(e, 'Suppression impossible.')),
                  });
                }}
              >
                <Trash2 size={14} className="text-zinc-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-zinc-500">
          Début
          <input type="datetime-local" className={inputCls} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Fin
          <input type="datetime-local" className={inputCls} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Motif (facultatif)
          <input className={inputCls} maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>
      <p className="text-xs text-zinc-400">Heures de Brazzaville. 90 jours au plus par congé.</p>
      <div className="flex justify-end">
        <button type="button" className={btnCls} disabled={create.isPending} onClick={add}>
          Ajouter le congé
        </button>
      </div>
    </div>
  );
}
