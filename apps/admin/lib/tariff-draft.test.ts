import { describe, expect, it } from 'vitest';
import {
  formFromTariff,
  pairFee,
  setPairFee,
  tariffFormToDto,
  type TariffForm,
} from './tariff-draft';

const base: TariffForm = {
  roadFactor: '1,3',
  bands: [
    { maxKm: '6', feeXaf: '1500' },
    { maxKm: '3', feeXaf: '1000' },
  ],
  overrides: [{ originQuartierId: 'a', destQuartierId: 'b', feeXaf: '1200' }],
  note: '  ',
};

describe('tariffFormToDto', () => {
  it('convertit, trie les tranches et accepte la virgule décimale', () => {
    const { dto } = tariffFormToDto(base);
    expect(dto).toEqual({
      roadFactor: 1.3,
      bands: [
        { maxKm: 3, feeXaf: 1000 },
        { maxKm: 6, feeXaf: 1500 },
      ],
      overrides: [{ originQuartierId: 'a', destQuartierId: 'b', feeXaf: 1200 }],
      note: null,
    });
  });

  it('refuse deux tranches à la même borne', () => {
    const r = tariffFormToDto({
      ...base,
      bands: [
        { maxKm: '3', feeXaf: '1000' },
        { maxKm: '3', feeXaf: '1200' },
      ],
    });
    expect(r.dto).toBeNull();
    expect(r.errors.join()).toContain('3 km');
  });

  it('refuse un prix décimal ou négatif, en nommant la ligne', () => {
    const r = tariffFormToDto({ ...base, bands: [{ maxKm: '3', feeXaf: '999.5' }] });
    expect(r.errors).toEqual([expect.stringContaining('Tranche 1')]);
  });

  it('refuse un trajet sans ses deux quartiers', () => {
    const r = tariffFormToDto({
      ...base,
      overrides: [{ originQuartierId: 'a', destQuartierId: '', feeXaf: '1000' }],
    });
    expect(r.errors).toEqual([expect.stringContaining('Prix fixe 1')]);
  });

  it('refuse une grille sans tranche', () => {
    expect(tariffFormToDto({ ...base, bands: [] }).errors).toContain(
      'Une grille compte au moins une tranche.',
    );
  });

  it('aller-retour avec une version existante', () => {
    const form = formFromTariff({
      id: 't',
      version: 2,
      status: 'PUBLISHED',
      roadFactor: 1.3,
      note: 'v2',
      createdBy: 'u',
      publishedAt: null,
      publishedBy: null,
      createdAt: '',
      updatedAt: '',
      bands: [{ maxKm: 5, feeXaf: 1000 }],
      overrides: [],
    });
    expect(tariffFormToDto(form).dto).toEqual({
      roadFactor: 1.3,
      bands: [{ maxKm: 5, feeXaf: 1000 }],
      overrides: [],
      note: 'v2',
    });
  });
});

describe('matrice des prix fixes (lot 4)', () => {
  it('saisie symétrique : remplit les deux sens', () => {
    const next = setPairFee([], 'a', 'b', '1200', true);
    expect(pairFee(next, 'a', 'b')).toBe('1200');
    expect(pairFee(next, 'b', 'a')).toBe('1200');
  });

  it('chaque sens reste modifiable à part', () => {
    const both = setPairFee([], 'a', 'b', '1200', true);
    const next = setPairFee(both, 'b', 'a', '1500', false);
    expect(pairFee(next, 'a', 'b')).toBe('1200');
    expect(pairFee(next, 'b', 'a')).toBe('1500');
    expect(next).toHaveLength(2);
  });

  it('un retour saisi exprès (différent) n’est jamais écrasé ni effacé', () => {
    let o = setPairFee([], 'a', 'b', '1200', true);
    o = setPairFee(o, 'b', 'a', '1500', false);
    o = setPairFee(o, 'a', 'b', '1300', true);
    expect(pairFee(o, 'b', 'a')).toBe('1500');
    o = setPairFee(o, 'a', 'b', '', true);
    expect(pairFee(o, 'a', 'b')).toBe('');
    expect(pairFee(o, 'b', 'a')).toBe('1500');
  });

  it('même quartier : une seule case, même en symétrique', () => {
    expect(setPairFee([], 'a', 'a', '500', true)).toEqual([
      { originQuartierId: 'a', destQuartierId: 'a', feeXaf: '500' },
    ]);
  });

  it('case vidée : le prix fixe disparaît (retour aux tranches)', () => {
    const both = setPairFee([], 'a', 'b', '1200', true);
    expect(setPairFee(both, 'a', 'b', ' ', true)).toEqual([]);
  });

  it('la matrice produit un DTO valide, sans doublon', () => {
    let overrides = setPairFee([], 'a', 'b', '1200', true);
    overrides = setPairFee(overrides, 'a', 'b', '1300', true);
    const { dto } = tariffFormToDto({ ...base, overrides });
    expect(dto?.overrides).toHaveLength(2);
    expect(dto?.overrides).toContainEqual({ originQuartierId: 'b', destQuartierId: 'a', feeXaf: 1300 });
  });
});
