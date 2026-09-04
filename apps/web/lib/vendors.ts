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
 * Vendeurs **mis en avant** par l'administration (`isFeatured = true`).
 *
 * La section « Les plus courus » prenait jusqu'ici les quatre premiers de
 * `getVendors()` — c'est-à-dire, le tri étant par date, les quatre vendeurs les
 * plus récemment créés. Le titre annonçait une sélection éditoriale que
 * personne, dans aucune interface, ne pouvait produire.
 *
 * Le filtre s'ajoute à la frontière de visibilité côté serveur, il ne s'y
 * substitue pas : un vendeur mis en avant mais non publié n'apparaît pas.
 */
export async function getFeaturedVendors(limit = 4): Promise<Restaurant[]> {
  await connection();
  try {
    const featured = await fetchVendors(
      `/vendors?isFeatured=true&limit=${limit}`,
    );
    if (featured.length > 0) return featured;

    /**
     * **Repli — aucun vendeur n'est en vedette.**
     *
     * `isFeatured` a été livré à `false` sur les six vendeurs de production, et
     * personne ne l'a jamais basculé : la page d'accueil de `liliafood.com` a
     * donc affiché quatre emplacements pointillés et **zéro vendeur** depuis sa
     * mise en ligne, pendant que `/restaurants` en listait trois. Le site
     * paraissait vide alors que le catalogue ne l'était pas.
     *
     * La cause n'était pas le filtre — il est juste — mais le fait d'avoir fait
     * dépendre toute la vitrine d'une case que rien n'obligeait à cocher. Une
     * mise en avant éditoriale est un **ajout** au catalogue, jamais sa
     * condition d'existence.
     *
     * Le repli ne choisit rien : il prend le catalogue public dans l'ordre déjà
     * décidé par le serveur (`PUBLIC_VENDOR_ORDER_BY` : ouverts d'abord, puis
     * `displayOrder`, puis date). Aucun vendeur n'est nommé ici, et un
     * `displayOrder` posé par l'administration continue de commander l'affichage
     * même sans vedette.
     */
    return await fetchVendors(`/vendors?limit=${limit}`);
  } catch {
    return [];
  }
}
