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
