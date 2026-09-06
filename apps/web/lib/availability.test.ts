import { describe, expect, it } from 'vitest';
import { availabilityWindowLabel } from './availability';

/**
 * Il n'y a plus de test de fenêtre horaire ici, et c'est le résultat attendu :
 * la règle a quitté le navigateur. Elle vit côté serveur, où elle est testée par
 * `product-availability.spec.ts` et `product-detail-view.spec.ts`. Ce fichier ne
 * couvre plus que la mise en forme.
 */
describe('libellé de fenêtre', () => {
  it('rend null quand le produit est vendable en permanence', () => {
    expect(availabilityWindowLabel({})).toBeNull();
    expect(
      availabilityWindowLabel({ availableFrom: null, availableUntil: null }),
    ).toBeNull();
  });

  it('décrit une fenêtre bornée des deux côtés', () => {
    expect(
      availabilityWindowLabel({ availableFrom: '06:00', availableUntil: '11:00' }),
    ).toBe('Disponible de 06:00 à 11:00');
  });

  it('décrit une borne unique', () => {
    expect(availabilityWindowLabel({ availableFrom: '18:00' })).toBe(
      'Disponible à partir de 18:00',
    );
    expect(availabilityWindowLabel({ availableUntil: '11:00' })).toBe(
      'Disponible jusqu’à 11:00',
    );
  });

  it('décrit une fenêtre à cheval sur minuit sans chercher à l’interpréter', () => {
    // « De 18:00 à 02:00 » se lit sans ambiguïté ; ce n'est pas au libellé de
    // savoir que la fenêtre traverse minuit — cette question est celle du
    // serveur, et il y a déjà répondu par `availableNow`.
    expect(
      availabilityWindowLabel({ availableFrom: '18:00', availableUntil: '02:00' }),
    ).toBe('Disponible de 18:00 à 02:00');
  });
});
