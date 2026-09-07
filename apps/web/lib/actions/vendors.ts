'use server';

import { updateTag } from 'next/cache';

/**
 * Invalide immédiatement l'entrée de cache `'use cache'` taggée `vendors`
 * (`app/(public)/restaurants/page.tsx`) avant qu'un client ne rafraîchisse
 * la page. Appelée par le bouton « Réessayer » de `VendorGrid` : qu'une
 * tentative précédente ait échoué ou non, ceci garantit qu'un nouvel appel
 * réseau a bien lieu au prochain rendu plutôt que de resservir une valeur
 * déjà en cache — sans quoi `router.refresh()` seul pourrait resservir un
 * résultat mis en cache par un cache handler qui choisirait de mémoriser
 * un échec pour éviter des retries inutiles.
 *
 * `updateTag` (plutôt que `revalidateTag`) : conçu pour être appelé
 * exactement depuis une Server Action, expiration immédiate sans second
 * argument de profil à choisir arbitrairement.
 */
export async function retryVendors(): Promise<void> {
  updateTag('vendors');
}

/**
 * Invalide la carte d'**un** vendeur (`vendor-<id>`).
 *
 * La page de détail est mise en cache pour quelques minutes (`cacheLife
 * ('minutes')` dans `lib/vendor-menu.ts`) : c'est ce qui borne enfin la
 * fraîcheur, là où le `'use cache'` sans durée de vie laissait un prix modifié
 * rester faux pendant des heures. Cette action existe pour ne pas *attendre*
 * cette expiration quand on sait déjà que la carte a changé.
 *
 * ⚠️ **Portée réelle, à ne pas surestimer.** Une Server Action n'invalide que
 * le cache de *son propre* déploiement. L'administration est une application
 * Next distincte : elle ne peut pas appeler celle-ci. Le chemin complet
 * « l'admin enregistre → le site se rafraîchit dans la seconde » suppose un
 * rappel HTTP du backend vers ce déploiement, avec un secret partagé — infra à
 * poser, pas du code de rendu. Il est listé en phase 3.
 *
 * Ce que la phase 2 garantit sans lui : l'écart est **borné à quelques
 * minutes** au lieu d'être indéterminé, et il existe un point d'invalidation
 * nommé prêt à être branché.
 */
export async function revalidateVendorMenu(vendorId: string): Promise<void> {
  updateTag(`vendor-${vendorId}`);
}
