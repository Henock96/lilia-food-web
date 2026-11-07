import { sanitizeRedirect } from './sanitize-redirect';

/**
 * Où reprendre après une connexion ou une inscription.
 *
 * Une destination explicite (`?redirect=`, posée par le tiroir panier ou par
 * le proxy) prime. Sans elle, un visiteur qui a composé un panier vient pour
 * commander : le bouton « Connexion » de l'en-tête, qui n'en transmet aucune,
 * le renvoyait au catalogue, loin de son panier.
 *
 * ⚠️ `guestCartLines` se lit **avant** l'authentification : une fois la
 * session prête, le panier invité est versé au serveur puis vidé
 * (`guest-cart-adoption`).
 */
export function destinationAfterAuth(
  redirect: string | null | undefined,
  guestCartLines: number,
): string {
  if (!redirect && guestCartLines > 0) return '/panier';
  return sanitizeRedirect(redirect);
}
