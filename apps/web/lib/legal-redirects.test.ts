import { describe, expect, it } from 'vitest';
import { legalRedirects } from './legal-redirects';

describe('legalRedirects', () => {
  it('l’ancien document combiné renvoie vers la politique de confidentialité', () => {
    expect(legalRedirects()).toContainEqual({
      source: '/privacy-policy-cgu',
      destination: '/confidentialite',
      permanent: true,
    });
  });

  it('ne redirige aucun document en service', () => {
    const sources = legalRedirects().map((r) => r.source);
    expect(sources).not.toContain('/conditions');
    expect(sources).not.toContain('/confidentialite');
  });
});
