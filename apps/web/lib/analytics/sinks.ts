/**
 * Collecteurs — les seuls fichiers du dépôt web qui connaissent Google.
 *
 * Chacun traduit le contrat vers un outil. Aucun ne décide de ce qui est
 * envoyé : cette décision appartient à `AnalyticsCore`, et elle est déjà prise
 * quand un collecteur est appelé.
 */

import type { AnalyticsEvent, AnalyticsValue } from './contract';
import type { AnalyticsSink } from './core';

type GtagWindow = Window & {
  gtag?: (command: string, ...args: unknown[]) => void;
  dataLayer?: unknown[];
  clarity?: (command: string, ...args: unknown[]) => void;
};

/**
 * Google Analytics 4.
 *
 * ⚠️ `gtag` peut ne pas être encore défini quand le premier événement part —
 * le script est chargé en `afterInteractive`. C'est sans conséquence : le
 * fragment d'amorçage crée `window.dataLayer` et la fonction `gtag` **avant**
 * le chargement du script distant, et les appels y sont mis en file. On
 * n'attend donc rien, et on ne perd rien.
 */
export function ga4Sink(measurementId: string): AnalyticsSink {
  return {
    name: 'ga4',
    event(name: AnalyticsEvent, params: Record<string, AnalyticsValue>) {
      (window as GtagWindow).gtag?.('event', name, params);
    },
    identify(userId: string | null) {
      // `user_id` est une propriété de configuration : elle s'applique à tous
      // les envois suivants, y compris ceux d'autres onglets de la session.
      (window as GtagWindow).gtag?.('config', measurementId, {
        user_id: userId ?? undefined,
        send_page_view: false,
      });
    },
  };
}

/**
 * Microsoft Clarity — mesure **comportementale** (rejeu de session, cartes de
 * chaleur), pas analytique.
 *
 * Il ne reçoit que le **nom** de l'événement, jamais ses paramètres. Ce n'est
 * pas une limitation de l'outil qu'on subit, c'est un choix : Clarity
 * enregistre des sessions, et y adjoindre un identifiant de commande ou un
 * montant rapprocherait un enregistrement d'écran d'une transaction nommée.
 * Les chiffres du tunnel se lisent dans GA4 ; Clarity sert à comprendre
 * *pourquoi* une étape décroche, en regardant.
 *
 * Pour la même raison, `identify` n'est pas implémenté : on ne relie pas un
 * enregistrement de session à un client identifié.
 */
export function claritySink(): AnalyticsSink {
  return {
    name: 'clarity',
    event(name: AnalyticsEvent) {
      (window as GtagWindow).clarity?.('event', name);
    },
  };
}

/**
 * Collecteur de développement. Affiche ce qui *serait* envoyé, y compris quand
 * aucun identifiant de mesure n'est configuré — c'est le seul moyen de vérifier
 * l'instrumentation en local sans polluer les statistiques de production.
 */
export function consoleSink(): AnalyticsSink {
  return {
    name: 'console',
    event(name: AnalyticsEvent, params: Record<string, AnalyticsValue>) {
      console.info(`[analytics] ${name}`, params);
    },
    identify(userId: string | null) {
      console.info(`[analytics] identify`, userId);
    },
  };
}
