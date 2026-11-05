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
 * ⚠️ À appeler **avant** toute frontière `'use cache'` : l'erreur en ressort sans
 * son statut, et un 404 y deviendrait une panne (vu sur le build, pas sous
 * vitest, où la directive n'a pas d'effet). Cf. `fetchVendorMenu`.
 */
export function readResultFromError(error: unknown): { kind: 'missing' } | { kind: 'unavailable' } {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  return status === 404 ? { kind: 'missing' } : { kind: 'unavailable' };
}
