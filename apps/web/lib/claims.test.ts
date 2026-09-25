import { describe, expect, it } from 'vitest';
import { claimNeedsItems, claimStatusLabel, itemLabel } from './claims';

describe('réclamations (F3-06)', () => {
  it('les articles sont exigés pour manquant / erroné / abîmé, comme au serveur', () => {
    expect(claimNeedsItems('MISSING_ITEM')).toBe(true);
    expect(claimNeedsItems('WRONG_ITEM')).toBe(true);
    expect(claimNeedsItems('DAMAGED')).toBe(true);
    expect(claimNeedsItems('LATE')).toBe(false);
    expect(claimNeedsItems('OTHER')).toBe(false);
  });

  it('l’issue prime sur le statut', () => {
    expect(claimStatusLabel('RESOLVED', 'REFUNDED')).toBe('Remboursée');
    expect(claimStatusLabel('OPEN', null)).toBe('Envoyée');
  });

  it('le libellé « default » d’une variante n’est pas affiché', () => {
    expect(itemLabel({ variantLabel: 'default', product: { nom: 'Alloco' } } as never)).toBe('Alloco');
    expect(itemLabel({ variantLabel: 'Grand', product: { nom: 'Jus' } } as never)).toBe('Jus (Grand)');
  });
});
