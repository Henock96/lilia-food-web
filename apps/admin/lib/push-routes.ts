/**
 * Où mène le clic sur une notification push, côté **administration**
 * (ADMIN et RESTAURATEUR).
 *
 * Le backend envoie les mêmes `data` aux téléphones et aux navigateurs ; cette
 * table les traduit en écrans du back-office. Le service worker n'en contient
 * aucune copie : il ouvre `/notifications/ouvrir?…`, qui appelle cette
 * fonction. Les types sont déjà propres à un rôle (le backend n'envoie
 * `vendor_pending_approval` qu'aux ADMIN), et chaque écran garde son propre
 * contrôle d'accès : la table n'a pas à connaître le rôle.
 *
 * Toute valeur de `data` est traitée comme non fiable : un identifiant qui
 * n'a pas la forme d'un identifiant est ignoré, et le résultat est toujours un
 * chemin interne.
 */

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function id(value: string | undefined): string | null {
  return value && ID.test(value) ? value : null;
}

export function pushRoute(data: Record<string, string | undefined>): string {
  const type = data.type ?? '';

  switch (type) {
    case 'incident': {
      const incidentId = id(data.incidentId);
      return incidentId ? `/incidents/${incidentId}` : '/incidents';
    }
    case 'approval_requested':
      return '/approbations';
    case 'vendor_pending_approval':
    case 'vendor_ready':
      return '/vendeurs';
    case 'vendor_approved':
    case 'vendor_activated':
    case 'vendor_suspended':
    case 'payout_account_changed':
    case 'preorder_reminder':
    case 'vendor_offer':
    case 'reservation_update':
    case 'reservation_daily_summary':
      return '/mon-restaurant';
  }

  // Même lien que le cockpit (`ops-links.ts`) : la fiche s'ouvre par recherche.
  const orderId = id(data.orderId);
  if (orderId) return `/commandes?q=${orderId}`;
  if (type.includes('order') || type.startsWith('payment') ||
      type.startsWith('delivery') || type.startsWith('payout')) {
    return '/commandes';
  }
  return '/dashboard';
}
