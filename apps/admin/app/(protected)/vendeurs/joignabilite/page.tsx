'use client';

import { useVendorReachability } from '@lilia/api-client';
import type { VendorReachabilityStatus } from '@lilia/types';
import { RefreshCw } from 'lucide-react';

import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { ageLabel } from '@/lib/ops-links';

const cardCls =
  'bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card';

const STATUS: Record<VendorReachabilityStatus, { label: string; hint: string; cls: string }> = {
  NO_CHANNEL: {
    label: 'Injoignable',
    hint: 'Aucune app inscrite et aucun mobile pour le SMS de secours : une commande payée n’atteindra personne.',
    cls: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  },
  NO_DEVICE: {
    label: 'SMS seulement',
    hint: 'Aucune app inscrite : seul le SMS de secours préviendra la boutique. Installer l’app vendeurs.',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  STALE_DEVICE: {
    label: 'App ancienne',
    hint: 'Aucune inscription depuis plus de 30 jours : l’app est peut-être désinstallée.',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  NO_SMS_FALLBACK: {
    label: 'Sans secours SMS',
    hint: 'L’app est inscrite, mais aucun mobile n’est renseigné pour le SMS de secours.',
    cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  },
  OK: {
    label: 'Joignable',
    hint: 'App inscrite récemment et mobile de secours renseigné.',
    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
};

/**
 * Joignabilité des boutiques (audit du 28/10/2026, F-03).
 *
 * Sert à piloter l'installation de l'app vendeurs : quelles boutiques ne
 * recevraient rien si une commande payée arrivait maintenant. Ce n'est pas une
 * preuve de réception — seul le test sur le téléphone en est une.
 */
export default function JoignabilitePage() {
  const { token } = useAuthStore();
  const query = useVendorReachability(token);

  if (query.isLoading) {
    return (
      <div className="max-w-4xl space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className={`${cardCls} max-w-4xl p-6 text-center text-sm`}>
        <p className="text-red-500">
          {apiMessage(query.error, 'Impossible de charger la joignabilité des boutiques.')}
        </p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="mt-3 rounded-lg border border-zinc-200 px-3 py-1.5 dark:border-zinc-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const rows = query.data;
  const toFix = rows.filter((r) => r.needsAction).length;

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {toFix === 0
            ? `Les ${rows.length} boutiques sont joignables.`
            : `${toFix} boutique${toFix > 1 ? 's' : ''} sur ${rows.length} à traiter`}
          {' · '}« inscrite » ne veut pas dire « notification vue » : testez sur le téléphone.
        </span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 dark:border-zinc-700"
        >
          <RefreshCw size={12} /> Actualiser
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r) => {
          const s = STATUS[r.status];
          return (
            <li key={r.restaurantId} className={`${cardCls} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {r.nom}
                    {!r.isActive && <span className="ml-2 text-xs font-normal text-zinc-400">suspendue</span>}
                    {!r.adminApproved && (
                      <span className="ml-2 text-xs font-normal text-zinc-400">non validée</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.hint}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>{s.label}</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {r.deviceCount} appareil{r.deviceCount > 1 ? 's' : ''} inscrit{r.deviceCount > 1 ? 's' : ''}
                {r.lastDeviceRegisteredAt ? ` · dernière inscription ${ageLabel(r.lastDeviceRegisteredAt)}` : ''}
                {' · '}
                {r.ownerLastLoginAt ? `dernière connexion ${ageLabel(r.ownerLastLoginAt)}` : 'jamais connecté'}
                {' · '}SMS de secours :{' '}
                {r.smsFallback === 'OWNER' ? 'compte' : r.smsFallback === 'SHOP' ? 'boutique' : 'aucun'}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
