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
async function fetchVendors(query = '/vendors?limit=12'): Promise<Restaurant[]> {
  'use cache';
  cacheTag('vendors');
  cacheLife('minutes');
  const res = await apiClientRaw<{ data: Restaurant[] }>(query);
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


/**
 * Vitrine de la page d'accueil : le **catalogue public**, mis en avant d'abord.
 *
 * ### Le défaut corrigé
 *
 * Cette fonction demandait `/vendors?isFeatured=true`. La section « Ils font
 * saliver tout Brazza » est la **seule** liste de vendeurs de la page
 * d'accueil : appliquer un filtre ici ne mettait donc rien en avant, cela
 * **retirait tous les autres de la home**. Mettre un vendeur en vedette depuis
 * l'admin faisait disparaître les trois autres, remplacés par des emplacements
 * pointillés — le site paraissait se vider au moment précis où on essayait de
 * le mettre en valeur. Un repli existait, mais il ne se déclenchait que quand
 * la liste était *vide* : il masquait le cas « personne en vedette » et laissait
 * intact le cas « une seule en vedette », qui est le cas réel.
 *
 * L'application mobile n'avait pas le problème pour une raison simple : elle
 * n'a jamais envoyé `isFeatured`. Elle demande `/vendors?limit=50` et affiche
 * tout le monde. C'est le comportement juste, et c'est celui qu'on reprend ici.
 *
 * ### La règle
 *
 * **Une mise en avant classe, elle n'exclut pas.** `isFeatured` appartient donc
 * au tri, pas au filtre — et le tri appartient au serveur :
 * `PUBLIC_VENDOR_ORDER_BY` place désormais les vendeurs en vedette en tête
 * (derrière « ouvert maintenant », qui prime toujours), puis applique
 * `displayOrder` et la date. Web et mobile héritent du même ordre sans qu'aucun
 * des deux n'ait à le réimplémenter — c'est ce qui les garde cohérents.
 *
 * Le `limit` ne tronque donc plus arbitrairement : les premiers rendus sont les
 * vendeurs mis en avant, et « Voir tout » mène au catalogue complet.
 */
export async function getShowcaseVendors(limit = 4): Promise<Restaurant[]> {
  await connection();
  try {
    return await fetchVendors(`/vendors?limit=${limit}`);
  } catch {
    return [];
  }
}
