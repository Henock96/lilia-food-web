/**
 * Mesure d'audience et de conversion.
 *
 * Le site n'en avait aucune : impossible de savoir combien de personnes le
 * visitaient, d'où elles venaient, et surtout combien cliquaient sur
 * « Télécharger l'application » — l'objectif principal. Aucun des huit
 * objectifs du site n'était pilotable.
 *
 * Choix d'implémentation : GA4 chargé par `next/script` en `afterInteractive`,
 * et non un paquet supplémentaire. Cela évite d'ajouter une dépendance et
 * garde le script hors du chemin critique. Tout est conditionné à
 * `NEXT_PUBLIC_GA_ID` : variable absente, aucun script n'est chargé et
 * `track()` devient une fonction vide. Le site fonctionne donc à l'identique
 * en local et en préproduction, sans polluer les statistiques.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export const analyticsEnabled = Boolean(GA_ID);

/**
 * Événements suivis. Une union fermée plutôt que `string` : une faute de
 * frappe dans un nom d'événement produit des données silencieusement
 * inexploitables, alors qu'ici elle échoue à la compilation.
 */
export type AnalyticsEvent =
  /** Clic sur le bouton Google Play — l'objectif principal du site. */
  | 'app_download_click'
  /** Clic sur « Commander maintenant » / « Commander sur le site ». */
  | 'order_cta_click'
  /** Clic sur « Devenir vendeur » / « Devenir partenaire ». */
  | 'vendor_cta_click'
  /** Ouverture d'une fiche vendeur. */
  | 'vendor_view'
  /** Filtre par type de vendeur — indique quelles catégories sont demandées. */
  | 'category_filter'
  /** Affichage d'un catalogue vide : mesure directe du manque à gagner. */
  | 'empty_filter_view'
  | 'contact_click'
  | 'whatsapp_click'
  | 'phone_click'
  | 'signup_start'
  | 'signup_success';

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
};

/**
 * Envoie un événement. Ne lève jamais : une erreur de mesure ne doit pas
 * casser un parcours d'achat.
 */
export function track(
  event: AnalyticsEvent,
  params: Record<string, string | number | boolean> = {},
): void {
  if (!analyticsEnabled || typeof window === 'undefined') return;
  try {
    (window as GtagWindow).gtag?.('event', event, params);
  } catch {
    // Silencieux par conception.
  }
}
