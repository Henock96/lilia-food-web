/**
 * Où mène le clic sur une notification push, côté **client**.
 *
 * Le backend envoie les mêmes `data` aux téléphones et aux navigateurs ; ces
 * clés (`type`, `orderId`…) ont été pensées pour le routeur Flutter. Cette
 * table les traduit en pages du site. Le service worker n'en contient aucune
 * copie : il ouvre `/notifications/ouvrir?…`, qui appelle cette fonction.
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
  const orderId = id(data.orderId);

  switch (type) {
    case 'loyalty_earned':
    case 'referral_reward':
      return '/profil';
    case 'new_menu': {
      const vendorId = id(data.restaurantId);
      return vendorId ? `/restaurants/${vendorId}` : '/restaurants';
    }
  }

  // Commande, paiement, livraison : tout ce qui porte une commande y mène.
  if (orderId) return `/commandes/${orderId}`;
  if (type.startsWith('order') || type.startsWith('payment') ||
      type.startsWith('delivery') || type.startsWith('status_update')) {
    return '/commandes';
  }
  return '/';
}
