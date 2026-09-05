import { describe, expect, it } from 'vitest';

import { listPath, photoKeys } from './photos';

/**
 * Contrat de lecture des galeries.
 *
 * Le back-office « Détails & photos » lisait la route **publique**
 * (`GET /vendor-photos?restaurantId=…`). Cette route applique la frontière
 * marketplace du vendeur : elle rend `[]` pour un vendeur suspendu, non validé
 * ou en cours de configuration — c'est-à-dire, en production, la moitié du
 * catalogue et précisément ceux sur lesquels un administrateur a quelque chose
 * à faire. L'écran affichait « Aucune photo » sur des galeries peuplées, et une
 * photo tout juste ajoutée disparaissait au rafraîchissement.
 *
 * L'URL vivait dans une closure de `useQuery`, donc aucun test ne pouvait
 * l'atteindre. Ces tests exercent la construction elle-même.
 */
describe('listPath', () => {
  it('vise la route de gestion en périmètre `manage`', () => {
    expect(listPath('vendor', 'r_1', 'manage')).toBe(
      '/vendor-photos/mine?restaurantId=r_1',
    );
    expect(listPath('product', 'p_1', 'manage')).toBe(
      '/product-images/mine?productId=p_1',
    );
    expect(listPath('menu', 'm_1', 'manage')).toBe(
      '/menu-images/mine?menuDuJourId=m_1',
    );
  });

  it('garde la route publique en périmètre `public`', () => {
    expect(listPath('vendor', 'r_1', 'public')).toBe(
      '/vendor-photos?restaurantId=r_1',
    );
    expect(listPath('product', 'p_1', 'public')).toBe(
      '/product-images?productId=p_1',
    );
    expect(listPath('menu', 'm_1', 'public')).toBe(
      '/menu-images?menuDuJourId=m_1',
    );
  });

  it('encode l’identifiant plutôt que de le concaténer brut', () => {
    expect(listPath('vendor', 'a b&c', 'public')).toBe(
      '/vendor-photos?restaurantId=a%20b%26c',
    );
  });
});

/**
 * Les deux périmètres se cachent sous des clés distinctes ; une mutation faite
 * depuis le back-office doit néanmoins périmer les deux, sans quoi la vue
 * publique gardée en cache dans la même session contredirait ce qu'on vient de
 * faire.
 */
describe('photoKeys', () => {
  it('sépare les périmètres', () => {
    expect(photoKeys.list('vendor', 'r_1', 'manage')).not.toEqual(
      photoKeys.list('vendor', 'r_1', 'public'),
    );
  });

  it('le préfixe d’entité couvre les deux périmètres', () => {
    const prefix = photoKeys.entity('vendor', 'r_1');
    for (const scope of ['public', 'manage'] as const) {
      const key = photoKeys.list('vendor', 'r_1', scope);
      // TanStack Query invalide par préfixe : la clé de liste doit commencer
      // par celle d'entité.
      expect(key.slice(0, prefix.length)).toEqual([...prefix]);
    }
  });
});
