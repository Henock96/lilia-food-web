import { describe, expect, it } from 'vitest';
import { sanitizeRedirect } from './sanitize-redirect';

const FALLBACK = '/restaurants';

describe('sanitizeRedirect', () => {
  it.each([null, undefined, ''])('valeur absente (%p) : repli', (value) => {
    expect(sanitizeRedirect(value)).toBe(FALLBACK);
  });

  it.each(['/produits/abc', '/commandes/123', '/restaurants?vendorType=BAKERY&ouvert=1', '/produits/abc#avis'])(
    'chemin interne conservé : %s',
    (value) => {
      expect(sanitizeRedirect(value)).toBe(value);
    },
  );

  // `searchParams.get` décode `%09` et `%0A` : la tabulation et le saut de
  // ligne arrivent en clair. L'analyseur d'URL les supprime avant de résoudre,
  // si bien que `/\t/evil.com` devient `//evil.com` — un autre site.
  it.each(['/\t/evil.com', '/\n/evil.com', '/\r/evil.com', '\t//evil.com', '/\u0000/evil.com'])(
    'caractère de contrôle (%j) : repli',
    (value) => {
      expect(sanitizeRedirect(value)).toBe(FALLBACK);
    },
  );

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\\/evil.com',
    '\\\\evil.com',
    'https://evil.com',
    'HTTPS://evil.com',
    'javascript:alert(1)',
    'data:text/html,x',
    'evil.com',
    'produits/abc',
  ])('hors du site ou non absolu (%s) : repli', (value) => {
    expect(sanitizeRedirect(value)).toBe(FALLBACK);
  });

  it('séquence encodée restée littérale : chemin interne, jamais un autre hôte', () => {
    // `%250a` décodé une fois par `searchParams.get` : le chemin contient
    // littéralement `%0a`, que l'analyseur ne décode pas — même origine.
    expect(sanitizeRedirect('/%0a/evil.com')).toBe('/%0a/evil.com');
  });

  it('le chemin renvoyé est celui résolu, pas la saisie brute', () => {
    expect(sanitizeRedirect('/a/../commandes')).toBe('/commandes');
  });
});
