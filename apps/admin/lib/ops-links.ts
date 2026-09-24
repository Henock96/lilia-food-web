import type { OpsBucketKey, OpsItem } from '@lilia/types';

/**
 * Où mène une carte du cockpit (F3-04). Le cockpit ne duplique aucun geste :
 * il ouvre l'écran qui porte déjà l'action. `null` = pas d'écran dédié.
 */
export function opsItemHref(bucket: OpsBucketKey, item: OpsItem): string | null {
  switch (bucket) {
    case 'acceptance_late':
    case 'no_driver':
    case 'en_route_long':
    case 'delivery_failed':
      return item.orderId ? `/commandes?q=${encodeURIComponent(item.orderId)}` : null;
    case 'refunds_pending':
      return '/remboursements';
    case 'payouts_failed':
      return '/paiements/reversements';
    case 'incidents_open':
      return `/incidents/${encodeURIComponent(item.id)}`;
    case 'outbox_failed':
      return null;
  }
}

/** « il y a 12 min », « il y a 3 h », « il y a 2 j ». */
export function ageLabel(sinceIso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(sinceIso).getTime()) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}
