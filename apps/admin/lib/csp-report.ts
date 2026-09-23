/**
 * Destination des rapports CSP (L0-10, blueprint Phase 3).
 *
 * La CSP est servie en `Report-Only` depuis le durcissement, mais sans
 * `report-uri` : les violations ne partaient nulle part, seule la console du
 * navigateur les voyait. Observer « deux semaines de rapports » avant de la
 * rendre bloquante ne pouvait donc rien observer.
 *
 * Sentry reçoit déjà les erreurs de cette app ; il sait aussi recevoir les
 * rapports CSP sur son endpoint `security`, dérivé du DSN :
 *   https://<clé>@<hôte>/<projet>  →  https://<hôte>/api/<projet>/security/?sentry_key=<clé>
 *
 * Aucun DSN (développement local) ou DSN illisible ⇒ `null` : on sert la
 * politique sans directive de rapport plutôt que de casser le build.
 */
export function sentryCspReportUri(
  dsn: string | undefined,
  environment?: string,
): string | null {
  if (!dsn?.trim()) return null;

  let url: URL;
  try {
    url = new URL(dsn.trim());
  } catch {
    return null;
  }

  const key = url.username;
  const projectId = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!key || !/^\d+$/.test(projectId)) return null;

  const endpoint = new URL(`/api/${projectId}/security/`, `${url.protocol}//${url.host}`);
  endpoint.searchParams.set('sentry_key', key);
  if (environment) endpoint.searchParams.set('sentry_environment', environment);
  return endpoint.toString();
}

/** Nom du groupe `Reporting-Endpoints` référencé par la directive `report-to`. */
export const CSP_REPORT_GROUP = 'csp-endpoint';

/**
 * Directives et en-tête à ajouter à la politique.
 *
 * `report-uri` est déprécié mais reste le seul compris par Firefox et Safari ;
 * `report-to` + `Reporting-Endpoints` est ce que Chrome utilise. Les deux
 * coexistent sans doublon : un navigateur qui connaît `report-to` ignore
 * `report-uri`.
 */
export function cspReporting(dsn: string | undefined, environment?: string) {
  const uri = sentryCspReportUri(dsn, environment);
  if (!uri) return { directives: [] as string[], headers: [] as { key: string; value: string }[] };
  return {
    directives: [`report-uri ${uri}`, `report-to ${CSP_REPORT_GROUP}`],
    headers: [{ key: 'Reporting-Endpoints', value: `${CSP_REPORT_GROUP}="${uri}"` }],
  };
}
