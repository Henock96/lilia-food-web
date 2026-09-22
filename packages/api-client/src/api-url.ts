/** Backend de production — valeur de repli des **builds de production** uniquement. */
export const PRODUCTION_API_URL = 'https://lilia-backend.onrender.com';

/** Hôte réservé (RFC 2606) : ne résout jamais, n'atteint jamais la prod. */
export const TEST_API_URL = 'http://api.lilia.invalid';

export interface ApiUrlEnv {
  /** Navigateur : `NEXT_PUBLIC_API_URL`. Serveur : `API_URL`, sinon `NEXT_PUBLIC_API_URL` absolue. */
  explicit: string | undefined;
  nodeEnv: string | undefined;
}

/**
 * Résout l'URL du backend (CFG-001).
 *
 * Jusqu'ici, l'absence de variable menait **partout** à la production : un
 * `pnpm dev` sans `.env.local` — ou un rendu serveur local, qui ne lisait que
 * `API_URL` — écrivait dans la vraie base. Désormais :
 *
 * | Environnement | Variable absente |
 * |---|---|
 * | `development` | **erreur explicite** au démarrage |
 * | `test` | hôte `.invalid` — un test ne peut pas toucher la prod |
 * | `production` (build Vercel, prod **et** preview) | repli sur la prod, inchangé |
 *
 * Le repli de production est conservé délibérément : la configuration Vercel
 * n'a pas pu être vérifiée le 22/09/2026, et un build qui casserait faute de
 * variable mettrait le site hors ligne. Voir le rapport de remédiation.
 */
export function resolveApiUrl({ explicit, nodeEnv }: ApiUrlEnv): string {
  const value = explicit?.trim();
  if (value) return value.replace(/\/+$/, '');
  if (nodeEnv === 'production') return PRODUCTION_API_URL;
  if (nodeEnv === 'test') return TEST_API_URL;
  throw new Error(
    "URL du backend absente : définissez NEXT_PUBLIC_API_URL (et API_URL côté serveur) dans " +
      '.env.local. En développement, on ne retombe plus sur la production.',
  );
}

/** `NEXT_PUBLIC_API_URL` peut être relative (`/api-proxy`) : inutilisable côté serveur. */
export function serverSideExplicit(
  apiUrl: string | undefined,
  publicApiUrl: string | undefined,
): string | undefined {
  if (apiUrl?.trim()) return apiUrl;
  return publicApiUrl && /^https?:\/\//.test(publicApiUrl) ? publicApiUrl : undefined;
}
