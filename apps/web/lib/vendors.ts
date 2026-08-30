import { cacheLife, cacheTag } from 'next/cache';
import { apiClientRaw } from '@lilia/api-client';
import type { Restaurant } from '@lilia/types';

/**
 * Vendeurs du marketplace `/vendors` (déjà filtré adminApproved + isActive
 * côté backend, LIL-119). Partagé entre le hero et la section « Les plus
 * courus » de la home, pour un seul appel réseau : `'use cache'` mémoïse
 * l'appel par signature de fonction + arguments au sein d'un même rendu
 * (Cache Components / dynamicIO, actif via `cacheComponents: true` dans
 * `next.config.ts`), donc les deux appelants n'en déclenchent qu'un.
 *
 * Deux corrections importantes par rapport à la version précédente.
 *
 * 1. `cacheTag('vendors')` — sans tag, cette entrée était injoignable :
 *    `revalidateTag('vendors')`, déclenché par le bouton « Réessayer » de
 *    `/restaurants` comme par toute invalidation côté admin, ne la touchait
 *    pas. Elle ne pouvait être rafraîchie que par un redéploiement.
 *
 * 2. Le `try/catch` est sorti de la frontière de cache. Il vivait à
 *    l'intérieur et retournait `[]` : un échec réseau — le backend Render
 *    s'endort et met 30 à 60 s à répondre — était donc mis en cache comme un
 *    résultat parfaitement légitime. La home pouvait rester figée sur
 *    « aucun vendeur » sans qu'aucun signal ne l'invalide. Une erreur levée
 *    à l'intérieur d'une fonction `'use cache'` n'est, elle, jamais
 *    persistée : l'échec reste un échec, et la requête suivante réessaie.
 *
 * `cacheLife('minutes')` borne enfin la fraîcheur : un vendeur qui ouvre,
 * ferme ou rejoint le catalogue se reflète en quelques minutes, sans attendre
 * une invalidation explicite. La page servie en production portait un `age`
 * de plus de deux jours.
 */
async function fetchVendors(): Promise<Restaurant[]> {
  'use cache';
  cacheTag('vendors');
  cacheLife('minutes');
  const res = await apiClientRaw<{ data: Restaurant[] }>('/vendors?limit=12');
  return res.data ?? [];
}

export async function getVendors(): Promise<Restaurant[]> {
  try {
    return await fetchVendors();
  } catch {
    // Le hero et la section « en vedette » doivent rester affichables même
    // backend injoignable : elles dégradent proprement vers un état vide.
    return [];
  }
}
