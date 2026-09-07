import { revalidateTag } from 'next/cache';

/**
 * Purge du cache d'une carte vendeur, demandée par le backend.
 *
 * ## Pourquoi cette route existe
 *
 * La page vendeur est mise en cache (`'use cache'` + `cacheTag('vendor-<id>')`
 * + `cacheLife('minutes')`). Une **Server Action** n'invalide que le cache de
 * *son propre* déploiement : l'administration est une application Next
 * distincte, elle ne peut donc pas purger celui du site. Sans ce rappel, un
 * prix modifié attendait l'expiration du cache.
 *
 * L'appelant est `CatalogRevalidationService` côté backend, déclenché par
 * l'événement `catalog.changed` — c'est-à-dire par **toutes** les écritures du
 * catalogue, quelle que soit l'interface qui les a faites : administration web,
 * administration Flutter, ou le vendeur lui-même.
 *
 * ## `revalidateTag`, et non `updateTag`
 *
 * `updateTag` est réservé aux Server Actions : il expire l'étiquette **et**
 * rafraîchit le rendu en cours. Ici il n'y a pas de rendu en cours — on marque
 * l'entrée comme périmée, le prochain visiteur paiera l'aller-retour.
 *
 * ## Sécurité
 *
 * Secret partagé en en-tête, comparé en **temps constant**. Une comparaison
 * naïve (`a === b`) fuit la longueur du préfixe commun par son temps
 * d'exécution ; sur une route publique appelable en boucle, c'est exploitable.
 *
 * Sans `WEB_REVALIDATE_SECRET` configuré, la route répond **503 et ne fait
 * rien** : elle est fermée par défaut. Accepter les appels quand aucun secret
 * n'est posé transformerait un oubli de configuration en purge ouverte à tous,
 * donc en amplificateur de charge vers le backend.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.WEB_REVALIDATE_SECRET;

  if (!secret) {
    return Response.json(
      { revalidated: false, reason: 'not_configured' },
      { status: 503 },
    );
  }

  if (!timingSafeEqual(request.headers.get('x-revalidate-secret'), secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  let restaurantId: unknown;
  try {
    ({ restaurantId } = (await request.json()) as { restaurantId?: unknown });
  } catch {
    return Response.json({ revalidated: false, reason: 'bad_body' }, { status: 400 });
  }

  if (typeof restaurantId !== 'string' || restaurantId.length === 0) {
    return Response.json(
      { revalidated: false, reason: 'missing_restaurantId' },
      { status: 400 },
    );
  }

  // Les deux étiquettes : la carte du vendeur, et les listes où il figure
  // (accueil, catalogue) — son statut d'ouverture ou son image y apparaissent.
  //
  // ⚠️ Le second argument est **obligatoire** depuis Next 16 : c'est le profil
  // de fraîcheur appliqué à l'invalidation. On passe `'minutes'`, celui-là même
  // que `cacheLife('minutes')` pose sur ces entrées (`lib/vendor-menu.ts`,
  // `lib/vendors.ts`). Un profil plus long ici annulerait en pratique la purge
  // qu'on vient de demander.
  revalidateTag(`vendor-${restaurantId}`, 'minutes');
  revalidateTag('vendors', 'minutes');

  return Response.json({ revalidated: true, restaurantId });
}

/**
 * Comparaison à temps constant, sans dépendance à `node:crypto`.
 *
 * ⚠️ On compare d'abord les longueurs — les révéler n'apprend rien d'utile sur
 * un secret dont on choisit la longueur — puis **tous** les octets, sans
 * court-circuit. Un `return false` anticipé au premier écart rétablirait
 * exactement la fuite qu'on cherche à éviter.
 */
function timingSafeEqual(given: string | null, expected: string): boolean {
  if (given === null || given.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
