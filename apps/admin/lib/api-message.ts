import { ApiError } from '@lilia/api-client';

/**
 * Message à montrer à l'administrateur quand une écriture échoue.
 *
 * Les écrans affichaient un libellé maison — « Erreur lors de la création » —
 * qui constate l'échec sans jamais dire lequel. Le backend, lui, écrit des
 * messages destinés à être lus : « Vous devez posséder un vendeur pour créer un
 * produit ou un menu. », « Cette catégorie appartient à un autre vendeur. »,
 * « limit ne peut pas dépasser 100 ». Les remplacer par un texte générique,
 * c'est jeter la seule information exploitable de la réponse — et c'est ce qui a
 * transformé un 403 parfaitement explicite en enquête.
 *
 * Le repli reste utile : une coupure réseau produit un `TypeError` dont le
 * message (« Failed to fetch ») n'apprend rien à un administrateur.
 */
export function apiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message) return error.message;
  return fallback;
}
