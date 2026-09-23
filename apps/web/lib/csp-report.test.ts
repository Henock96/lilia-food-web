import { describe, expect, it } from 'vitest';
import { cspReporting, sentryCspReportUri } from './csp-report';

describe('sentryCspReportUri', () => {
  it('dérive l’endpoint security du DSN, hôte régional conservé', () => {
    expect(sentryCspReportUri('https://abc123@o456.ingest.de.sentry.io/789')).toBe(
      'https://o456.ingest.de.sentry.io/api/789/security/?sentry_key=abc123',
    );
  });

  it('ajoute l’environnement quand il est fourni', () => {
    expect(sentryCspReportUri('https://k@o1.ingest.sentry.io/42', 'production')).toBe(
      'https://o1.ingest.sentry.io/api/42/security/?sentry_key=k&sentry_environment=production',
    );
  });

  it.each([undefined, '', '   ', 'pas-une-url', 'https://o1.ingest.sentry.io/42', 'https://k@o1.ingest.sentry.io/'])(
    'renvoie null pour un DSN absent ou illisible (%s)',
    (dsn) => {
      expect(sentryCspReportUri(dsn)).toBeNull();
    },
  );
});

describe('cspReporting', () => {
  it('sans DSN, n’ajoute ni directive ni en-tête', () => {
    expect(cspReporting(undefined)).toEqual({ directives: [], headers: [] });
  });

  it('avec DSN, report-uri, report-to et Reporting-Endpoints pointent au même endroit', () => {
    const { directives, headers } = cspReporting('https://k@o1.ingest.sentry.io/42');
    const uri = 'https://o1.ingest.sentry.io/api/42/security/?sentry_key=k';
    expect(directives).toEqual([`report-uri ${uri}`, 'report-to csp-endpoint']);
    expect(headers).toEqual([{ key: 'Reporting-Endpoints', value: `csp-endpoint="${uri}"` }]);
  });
});
