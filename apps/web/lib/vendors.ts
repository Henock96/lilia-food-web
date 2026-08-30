import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
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

/**
 * `await connection()` sort délibérément cet appel du prerender de build.
 *
 * Sans lui, le `try/catch` ci-dessous ne protège rien au moment du build : une
 * rejection survenue dans une frontière `'use cache'` est observée par le
 * prerender lui-même, pas seulement par l'`await` appelant, et fait échouer la
 * compilation avec « Error occurred prerendering page ». Reproduit en pointant
 * `API_URL` sur un chemin inexistant : le `catch` est bien présent, le build
 * échoue quand même.
 *
 * Le fond du problème n'est pas le `catch` mais la dépendance : le backend est
 * un service Render qui s'endort, donc **le build ne doit pas dépendre de sa
 * disponibilité**. Un déploiement ne peut pas échouer parce qu'une machine
 * distante faisait la sieste. On rend donc ce sous-arbre à la requête — ses
 * appelants doivent être enveloppés dans un `<Suspense>` pour que la coquille
 * de la page reste, elle, prérendue statiquement (PPR).
 *
 * La mise en cache n'est pas perdue pour autant : `fetchVendors` conserve
 * `'use cache'`, `cacheTag('vendors')` et `cacheLife('minutes')`. Seul le
 * premier visiteur après un déploiement paie l'aller-retour réseau, et le
 * `catch` reprend tout son sens à ce moment-là.
 */
export async function getVendors(): Promise<Restaurant[]> {
  await connection();
  try {
    return await fetchVendors();
  } catch {
    // Le hero et la section « en vedette » doivent rester affichables même
    // backend injoignable : elles dégradent proprement vers un état vide.
    return [];
  }
}
