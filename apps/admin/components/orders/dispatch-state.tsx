import type { DispatchSnapshot, DispatchState } from '@lilia/types';

/**
 * Dispatch FCFS (10/11/2026) — libellés et couleurs d'une recherche de
 * livreur, partagés par la fiche commande et la supervision. Le serveur
 * dérive l'état ; ici, on ne fait que le dire.
 */
export const DISPATCH_STATE_LABELS: Record<DispatchState, string> = {
  NONE: 'Aucune recherche',
  SEARCHING: 'Recherche d’un livreur en cours',
  ASSIGNED: 'Livreur attribué',
  EXHAUSTED: 'Aucun livreur n’a accepté — relance requise',
  CLOSED: 'Recherche terminée',
};

const DISPATCH_STATE_COLORS: Record<DispatchState, string> = {
  NONE: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  SEARCHING:
    'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  ASSIGNED:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  EXHAUSTED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  CLOSED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

export function DispatchStateBadge({
  state,
  delivererName,
}: {
  state: DispatchState;
  delivererName?: string | null;
}) {
  const label =
    state === 'ASSIGNED' && delivererName
      ? `Livreur attribué : ${delivererName}`
      : DISPATCH_STATE_LABELS[state];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${DISPATCH_STATE_COLORS[state]}`}
    >
      {label}
    </span>
  );
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** « 12 min », « moins d'une minute ». */
export function waitingLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return 'moins d’une minute';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/** Lignes de détail d'une recherche en cours ou épuisée. */
export function dispatchLines(view: DispatchSnapshot, maxRounds: number): string[] {
  if (view.state !== 'SEARCHING' && view.state !== 'EXHAUSTED') return [];
  return [
    `Livreurs notifiés : ${view.notifiedCount ?? 0}`,
    ...(view.startedAt
      ? [
          `Début : ${hhmm(view.startedAt)}` +
            (view.waitingSeconds != null
              ? ` (attente ${waitingLabel(view.waitingSeconds)})`
              : ''),
        ]
      : []),
    `Diffusions : ${view.round ?? 0}/${maxRounds}`,
    ...(view.state === 'SEARCHING' && view.nextRoundAt
      ? [`Prochaine diffusion : ${hhmm(view.nextRoundAt)}`]
      : []),
  ];
}
