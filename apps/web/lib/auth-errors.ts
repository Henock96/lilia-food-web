/**
 * Même texte que l'application (`_kAccountConflict`) : un client déjà inscrit
 * doit lire qu'il lui suffit de se connecter, et par quelle méthode, s'il a
 * ouvert son compte avec Google.
 */
export const EMAIL_ALREADY_REGISTERED =
  'Un compte existe déjà avec cette adresse e-mail. Connectez-vous avec la méthode utilisée à l’inscription.';

/**
 * Ce qu'il faut dire quand la fenêtre Google n'a pas abouti.
 *
 * `null` : un second clic a remplacé la demande, qui suit son cours.
 *
 * ⚠️ Une fenêtre fermée n'est pas forcément un changement d'avis : Firebase lève
 * le même code quand un navigateur intégré (Facebook, Instagram sur Android) la
 * ferme tout seul. Se taire donnerait un bouton qui ne fait rien ; le message
 * reste donc neutre et propose l'autre chemin.
 */
export function googleAuthFailureMessage(error: unknown, fallback: string): string | null {
  const code = (error as { code?: string } | null | undefined)?.code;
  if (code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/popup-closed-by-user') {
    return 'La fenêtre Google s’est fermée. Réessayez, ou utilisez votre e-mail et votre mot de passe.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Votre navigateur a bloqué la fenêtre Google. Autorisez-la, puis réessayez.';
  }
  return fallback;
}
