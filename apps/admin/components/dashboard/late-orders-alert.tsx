'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useStuckOrders } from '@lilia/api-client';
import type { StuckOrderStatus } from '@lilia/types';

import { useAuthStore } from '@/store/auth';

const LATE_MINUTES = 30;

/** Ce que chaque état bloqué veut dire, du point de vue de qui doit agir. */
const STUCK_LABELS: Record<StuckOrderStatus, string> = {
  PAYER: 'payée, non ouverte par le vendeur',
  EN_PREPARATION: 'en préparation',
  PRET: 'prête, aucun livreur',
};

function humanDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} jour${days > 1 ? 's' : ''}`;
}

/**
 * Alerte « commandes bloquées ».
 *
 * ## Le défaut corrigé
 *
 * Elle filtrait **les vingt commandes reçues** : une commande bloquée depuis
 * trois heures en sortait dès que vingt plus récentes arrivaient. L'alerte
 * s'éteignait donc au moment précis où le problème s'aggravait. Son horloge
 * était en outre figée au montage (`useState(() => Date.now())`) alors que la
 * requête se rafraîchissait : une commande devenue tardive pendant qu'on
 * regardait l'écran n'était jamais détectée.
 *
 * Et elle comptait `EN_ATTENTE`, c'est-à-dire des paniers abandonnés que le
 * cron d'expiration ferme seul — ils noyaient les cas réels.
 *
 * Le décompte vient maintenant du serveur, qui compte la population entière et
 * se rafraîchit toutes les minutes.
 */
export function LateOrdersAlert() {
  const { token } = useAuthStore();
  const { data } = useStuckOrders(token, LATE_MINUTES);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !data || data.total === 0) return null;

  // Le détail par statut est ce qui rend l'alerte actionnable : « 1 prête sans
  // livreur » et « 3 payées non ouvertes » n'appellent pas le même geste.
  const parts = (Object.keys(STUCK_LABELS) as StuckOrderStatus[])
    .filter((s) => (data.byStatus[s] ?? 0) > 0)
    .map((s) => `${data.byStatus[s]} ${STUCK_LABELS[s]}`);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
      <AlertTriangle size={16} className="shrink-0 text-red-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-red-700 dark:text-red-400">
          <span className="font-semibold">
            {data.total} commande{data.total > 1 ? 's' : ''} bloquée
            {data.total > 1 ? 's' : ''}
          </span>{' '}
          depuis plus de {data.thresholdMinutes} min
          {data.oldestMinutes !== null && (
            <> — la plus ancienne attend depuis {humanDelay(data.oldestMinutes)}</>
          )}
        </p>
        {parts.length > 0 && (
          <p className="mt-0.5 text-xs text-red-600 dark:text-red-400/80">
            {parts.join(' · ')}
          </p>
        )}
      </div>
      <Link
        href="/commandes"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
      >
        Voir <ArrowRight size={12} />
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Masquer l’alerte"
        className="shrink-0 text-red-400 transition-colors hover:text-red-600"
      >
        <X size={14} />
      </button>
    </div>
  );
}
