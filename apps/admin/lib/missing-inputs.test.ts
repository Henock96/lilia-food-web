import { describe, expect, it } from 'vitest';

import { describeMissingInputs } from './missing-inputs';

describe('describeMissingInputs', () => {
  it('nomme le poste manquant du cas courant', () => {
    // Le cas de TOUTE commande livrée : le coût d'une course n'existe nulle
    // part dans le système.
    expect(describeMissingInputs(['driverCost'])).toBe('le coût du livreur');
  });

  it('énumère plusieurs postes de façon lisible', () => {
    expect(
      describeMissingInputs(['collectionFee', 'payoutFee', 'driverCost']),
    ).toBe(
      "les frais d'encaissement, les frais de reversement et le coût du livreur",
    );
  });

  it('rend tel quel un poste que cette version ne connaît pas', () => {
    // Masquer l'inconnu ferait croire que la liste est complète.
    expect(describeMissingInputs(['insuranceCost'])).toBe('insuranceCost');
    expect(describeMissingInputs(['driverCost', 'insuranceCost'])).toBe(
      'le coût du livreur et insuranceCost',
    );
  });

  it('reste honnête quand le serveur ne nomme rien', () => {
    // Backend antérieur au champ : on n'invente pas de cause.
    expect(describeMissingInputs([])).toBe('un poste de coût');
    expect(describeMissingInputs(undefined)).toBe('un poste de coût');
  });
});
