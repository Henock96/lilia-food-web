import type { PublicPlatformSettings } from '@lilia/api-client';

/** Texte par défaut — le même que l'app mobile (`_MaintenanceEnCours`). */
export const DEFAULT_MAINTENANCE_MESSAGE =
  'Lilia Food est en maintenance. Les commandes reprendront dans quelques instants ; vous pouvez continuer à parcourir le catalogue.';

/**
 * Avis de maintenance à afficher au panier, ou `null` (MAINT-001).
 *
 * Le site ignorait `maintenanceMode` : le client choisissait son adresse, son
 * créneau, son téléphone, cliquait « Commander »… et découvrait le 503 du
 * serveur dans un toast. L'app mobile, elle, l'annonce à l'entrée du checkout.
 *
 * La maintenance n'interdit pas de consulter le catalogue, seulement de
 * commander : c'est donc le panier qui la dit, pas un verrou global. Le serveur
 * (`MaintenanceGuard`) reste la barrière réelle — ceci ne fait qu'éviter au
 * client un parcours perdu.
 *
 * Réglages inconnus (pas encore chargés, ou injoignables) : `null`. On ne
 * déclare pas une maintenance qu'on n'a pas lue ; le serveur tranchera.
 */
export function maintenanceNotice(
  settings: Pick<PublicPlatformSettings, 'maintenanceMode' | 'maintenanceMessage'> | undefined,
): string | null {
  if (!settings?.maintenanceMode) return null;
  const message = settings.maintenanceMessage?.trim();
  return message ? message : DEFAULT_MAINTENANCE_MESSAGE;
}
