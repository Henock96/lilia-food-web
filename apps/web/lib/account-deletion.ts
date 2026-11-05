import { mutationErrorMessage } from './account-feedback';

/**
 * Enchaînement de la suppression de compte.
 *
 * ⚠️ Rien ne se passe côté session avant la réponse du serveur : il refuse en
 * 409 tant qu'une commande est en cours, et déconnecter le client à ce moment
 * lui ferait perdre le suivi de sa commande.
 *
 * Une fois le compte supprimé, l'échec de la déconnexion locale ne change rien
 * à ce qu'il faut lui dire : le compte n'existe plus.
 */
export async function runAccountDeletion({
  remove,
  logout,
  onDeleted,
  onRefused,
}: {
  remove: () => Promise<void>;
  logout: () => Promise<boolean>;
  onDeleted: () => void;
  onRefused: (message: string) => void;
}): Promise<void> {
  try {
    await remove();
  } catch (error) {
    onRefused(mutationErrorMessage(error, 'Suppression impossible. Vérifiez votre connexion puis réessayez.'));
    return;
  }
  await logout().catch(() => false);
  onDeleted();
}
