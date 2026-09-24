import { describe, expect, it } from 'vitest';
import { formFromTariff, tariffFormToDto, type TariffForm } from './tariff-draft';

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
