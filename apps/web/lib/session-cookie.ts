/**
 * **Témoin de session**, lu par `proxy.ts` pour rediriger vers `/connexion`
 * les pages protégées d'un visiteur sans session.
 *
 * Ce n'est **pas** une autorisation : le backend vérifie le jeton Bearer de
 * chaque appel, et la session Firebase vit en IndexedDB. Le cookie ne porte
 * donc qu'une valeur fixe. Il portait le vrai jeton Firebase (SEC-07, audit du
 * 06/11/2026) alors qu'aucun code serveur ne le lisait.
 *
 * Lisible par le client (`httpOnly: false`) : il ne contient aucun secret, et
 * c'est ce qui permet au coordinateur (`lib/session.ts`) de ne pas appeler
 * `DELETE /api/auth/session` pour un cookie absent (PERF-07).
 *
 * Le nom historique est gardé : renommer obligerait le proxy à reconnaître
 * deux cookies, et les onglets ouverts avant un déploiement à converger.
 */
export const SESSION_COOKIE = 'firebase-token';
export const SESSION_COOKIE_VALUE = '1';

/**
 * Suit la durée de **session** Firebase (jeton de rafraîchissement ~30 j), pas
 * celle du jeton d'identité (1 h) : sinon un client revenu après une heure
 * serait renvoyé vers `/connexion` alors que sa session est valide (W9).
 */
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function sessionCookieOptions(maxAge: number = SESSION_COOKIE_MAX_AGE) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

/**
 * Le témoin est-il posé dans ce navigateur ? Hors navigateur : on ne sait pas,
 * donc oui (un `DELETE` de trop est sans danger).
 *
 * ⚠️ Un ancien cookie `HttpOnly` porteur de jeton est invisible ici. Ce code ne
 * peut pourtant pas le rencontrer : il n'existe que dans une page chargée après
 * son déploiement, et ce chargement passe par `proxy.ts`, qui réécrit l'ancien
 * cookie en témoin lisible avant que le JavaScript ne s'exécute.
 */
export function hasSessionCookieInBrowser(): boolean {
  if (typeof document === 'undefined') return true;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
}
