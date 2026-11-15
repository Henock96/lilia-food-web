import { describe, it, expect } from 'vitest';
import { minimumOrderError } from './minimum-order';

describe('minimumOrderError', () => {
  it('rend le message serveur mot pour mot', () => {
    expect(minimumOrderError(2000, 5000, 'Maison Kayser')).toBe(
      'Montant minimum pour Maison Kayser : 5000 FCFA. Votre panier : 2000 FCFA.',
    );
  });

  it('laisse passer un panier au-dessus du seuil', () => {
    expect(minimumOrderError(5000, 5000, 'Maison Kayser')).toBeNull();
  });

  it('laisse passer quand le vendeur n\'impose pas de minimum', () => {
    expect(minimumOrderError(100, 0, 'Chez Maman Lili')).toBeNull();
  });
});
