/**
 * Point d'entrée unique de la mesure côté web.
 *
 * Le code métier importe **uniquement** ce module :
 *
 * ```ts
 * import { analytics } from '@/lib/analytics';
 * analytics.track('restaurant_view', { restaurant_id: id, restaurant_name: nom });
 * ```
 *
 * Il n'importe jamais `gtag`, ni `sinks.ts`, ni `contract.ts` directement.
 */

import { AnalyticsCore, onceKey, type AnalyticsSink } from './core';
import { claritySink, consoleSink, ga4Sink } from './sinks';

export { onceKey };
export { CURRENCY } from './contract';
export type { AnalyticsEvent, FunnelEvent } from './contract';

/**
 * Identifiant de mesure GA4.
 *
 * `NEXT_PUBLIC_GA_MEASUREMENT_ID` est le nom retenu par le contrat. On lit
 * aussi `NEXT_PUBLIC_GA_ID`, le nom utilisé jusqu'ici en production : renommer
 * une variable d'environnement sans repli, c'est éteindre la mesure au premier
 * déploiement et ne s'en apercevoir qu'en consultant les rapports.
 *
 * ⚠️ Next remplace les `NEXT_PUBLIC_*` à la compilation : elles doivent être
 * référencées littéralement, jamais construites dynamiquement.
 */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? process.env.NEXT_PUBLIC_GA_ID ?? '';

export const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? '';

export const ga4Enabled = Boolean(GA_MEASUREMENT_ID);
export const clarityEnabled = Boolean(CLARITY_PROJECT_ID);

const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV !== 'production';

function buildSinks(): AnalyticsSink[] {
  if (!isBrowser) return [];
  const sinks: AnalyticsSink[] = [];
  if (ga4Enabled) sinks.push(ga4Sink(GA_MEASUREMENT_ID));
  if (clarityEnabled) sinks.push(claritySink());
  // En développement, la console remplace les outils absents : sans elle, on ne
  // peut pas vérifier une instrumentation avant de la déployer.
  if (isDev) sinks.push(consoleSink());
  return sinks;
}

/**
 * Instance partagée.
 *
 * Sans collecteur — identifiants absents, ou rendu serveur — `track()` reste
 * appelable et ne fait rien. Le code métier n'a donc aucune condition à écrire.
 */
export const analytics = new AnalyticsCore({
  sinks: buildSinks(),
  store: isBrowser ? window.localStorage : null,
  onDropped: isDev
    ? (event, dropped) => {
        console.warn(
          `[analytics] ${event} — paramètres retirés :`,
          dropped.map((d) => `${d.key} (${d.reason})`).join(', '),
        );
      }
    : undefined,
});
