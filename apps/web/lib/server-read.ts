/**
 * Attente maximale d'une lecture du backend faite **au rendu serveur** (PERF-02).
 *
 * Sans borne, un backend lent prolongeait l'attente de la page sans limite côté
 * site : `@lilia/api-client` ne pose aucun délai. Au-delà, la lecture lève, la
 * page rend son état « indisponible » avec « Réessayer », et rien n'est mis en
 * cache (une rejection ne l'est jamais).
 *
 * ⚠️ Volontairement **ici** et non dans `@lilia/api-client` : ce paquet sert
 * aussi l'administration, dont les appels (écritures, exports) n'ont pas à
 * hériter de ce délai.
 */
export const SERVER_READ_TIMEOUT_MS = 10_000;

/**
 * Signal à passer aux lectures serveur. Le délai court dès sa création : un
 * parcours de plusieurs pages en crée **un seul** avant sa boucle, sinon les
 * délais s'additionnent page après page et ne bornent plus rien.
 */
export function serverReadSignal(ms: number = SERVER_READ_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

/**
 * Trace une lecture serveur rattrapée. Chaque appelant rend alors un état
 * dégradé (indisponible, liste vide, sitemap réduit) qui, sans cette ligne, ne
 * laissait aucune trace : un backend qui dépasse le délai pendant une heure ne
 * se voyait nulle part. `console.warn` part dans les journaux Vercel, comme
 * l'alerte de troncature de `lib/vendors.ts`.
 */
export function reportServerReadFailure(read: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name} : ${error.message}` : String(error);
  console.warn(`[lecture serveur] ${read} — ${detail}`);
}
