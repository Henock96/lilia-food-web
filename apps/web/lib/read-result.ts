/**
 * Résultat d'une lecture de fiche publique (vendeur, produit).
 *
 * Toute erreur devenait `null`, et `null` devenait `notFound()` : une sortie de
 * veille de Render ou un quota Neon annonçait « introuvable » pour un vendeur
 * bien vivant, avec un `noindex` qui pouvait retirer sa page de l'index. Seul un
 * 404 du serveur dit que la ressource n'existe pas ; tout le reste est une panne.
 */
export type ReadResult<T> =
  | { kind: 'found'; value: T }
  | { kind: 'missing' }
  | { kind: 'unavailable' };

/**
 * ⚠️ On lit `status` plutôt que `instanceof ApiError` : l'erreur de la carte
 * vendeur traverse la frontière `'use cache'`, et sa classe n'y est pas garantie.
 */
export function readResultFromError(error: unknown): { kind: 'missing' } | { kind: 'unavailable' } {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return status === 404 ? { kind: 'missing' } : { kind: 'unavailable' };
}
