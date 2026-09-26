import { describe, expect, it } from 'vitest';
import type { Product } from '@lilia/types';

import {
  formatUnits,
  policyOf,
  quantityEditable,
  stockLabel,
  stockPayload,
  variantPayload,
} from './product-stock';

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'vin',
    nom: 'Vin',
    variants: [],
    stockQuotidien: 60,
    stockRestant: 52,
    stockPolicy: 'INVENTORY',
    stockUnit: 'BOTTLE',
    ...over,
  }) as Product;

describe('politique de stock (F3-10)', () => {
  it('lue telle quelle, ou déduite de l’ancien contrat', () => {
    expect(policyOf(product())).toBe('INVENTORY');
    expect(policyOf(product({ stockPolicy: undefined, stockMode: 'DAILY' }))).toBe('DAILY_QUOTA');
    expect(policyOf(product({ stockPolicy: undefined, stockRestant: null }))).toBe('UNLIMITED');
  });

  it('dit le stock dans son unité', () => {
    expect(stockLabel(product())).toBe('52 bouteilles');
    expect(stockLabel(product({ stockPolicy: 'DAILY_QUOTA', stockQuotidien: 20, stockRestant: 7, stockUnit: 'PORTION' })))
      .toBe('7 portions / 20 aujourd’hui');
    expect(stockLabel(product({ stockRestant: 0 }))).toBe('Rupture');
    expect(formatUnits(1, 'CAN')).toBe('1 canette');
  });

  it('« Toujours disponible » envoie explicitement null', () => {
    expect(
      stockPayload({ stockPolicy: 'UNLIMITED', stockUnit: 'PIECE', stockQuantity: '' }),
    ).toEqual({ stockPolicy: 'UNLIMITED', stockMode: 'DAILY', stockUnit: 'PIECE', stockQuotidien: null });
  });

  it('stock réel en place : la fiche n’écrase pas la quantité', () => {
    const fields = { stockPolicy: 'INVENTORY' as const, stockUnit: 'BOTTLE' as const, stockQuantity: '60' };
    expect(quantityEditable(fields, product())).toBe(false);
    expect(stockPayload(fields, product())).not.toHaveProperty('stockQuotidien');
  });

  it('nouvelle politique : la quantité est exigée et envoyée', () => {
    const fields = { stockPolicy: 'INVENTORY' as const, stockUnit: 'BOTTLE' as const, stockQuantity: '60' };
    expect(stockPayload(fields)).toMatchObject({ stockMode: 'PERMANENT', stockQuotidien: 60 });
    expect(() => stockPayload({ ...fields, stockQuantity: '' })).toThrow(/entier/);
  });

  it('un format neuf déclare sa consommation, un format enregistré non (immuable)', () => {
    expect(
      variantPayload([
        { _key: 1, id: 'v-b', label: 'Bouteille', prix: '13000', stockConsumption: '1' },
        { _key: 2, label: 'Carton de 6', prix: '70000', stockConsumption: '6' },
      ]),
    ).toEqual([
      { id: 'v-b', label: 'Bouteille', prix: 13000 },
      { id: undefined, label: 'Carton de 6', prix: 70000, stockConsumption: 6 },
    ]);
  });
});
