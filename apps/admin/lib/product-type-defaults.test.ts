import { describe, expect, it } from 'vitest';
import type { VendorType } from '@lilia/types';

import {
  VENDOR_PRODUCT_OPTIONS,
  defaultProductType,
  defaultStockPolicy,
  productTypeChoices,
} from './product-type-defaults';

const ALL_VENDOR_TYPES: VendorType[] = [
  'RESTAURANT',
  'HOME_COOK',
  'BAKERY',
  'BEVERAGE_SHOP',
  'GROCERY',
];

describe('defaultProductType', () => {
  it('épicerie → GROCERY (FOOD y est refusé par le serveur)', () => {
    expect(defaultProductType('GROCERY')).toBe('GROCERY');
  });

  it('boutique de boissons → BEVERAGE (FOOD y est refusé par le serveur)', () => {
    expect(defaultProductType('BEVERAGE_SHOP')).toBe('BEVERAGE');
  });

  it('restaurant et cuisine maison → FOOD, comme avant', () => {
    expect(defaultProductType('RESTAURANT')).toBe('FOOD');
    expect(defaultProductType('HOME_COOK')).toBe('FOOD');
  });

  it('le défaut est toujours un type autorisé pour ce vendeur', () => {
    for (const vendorType of ALL_VENDOR_TYPES) {
      expect(VENDOR_PRODUCT_OPTIONS[vendorType]).toContain(
        defaultProductType(vendorType),
      );
    }
  });
});

describe('VENDOR_PRODUCT_OPTIONS', () => {
  it('reprend la matrice serveur (ProductValidatorService)', () => {
    expect(VENDOR_PRODUCT_OPTIONS).toEqual({
      RESTAURANT: ['FOOD', 'BEVERAGE'],
      HOME_COOK: ['FOOD', 'PASTRY'],
      BAKERY: ['PASTRY', 'FOOD'],
      BEVERAGE_SHOP: ['BEVERAGE'],
      GROCERY: ['GROCERY', 'BEVERAGE'],
    });
  });

  it('ne propose jamais ALCOHOL', () => {
    for (const vendorType of ALL_VENDOR_TYPES) {
      expect(VENDOR_PRODUCT_OPTIONS[vendorType]).not.toContain('ALCOHOL');
    }
  });
});

describe('productTypeChoices', () => {
  it('les types autorisés du vendeur', () => {
    expect(productTypeChoices('GROCERY', 'GROCERY')).toEqual(['GROCERY', 'BEVERAGE']);
  });

  it('garde le type d’un produit existant hors matrice, pour ne pas le réécrire en silence', () => {
    expect(productTypeChoices('BAKERY', 'BEVERAGE')).toEqual(['PASTRY', 'FOOD', 'BEVERAGE']);
  });

  it('n’ajoute jamais ALCOHOL, même porté par un produit existant', () => {
    expect(productTypeChoices('GROCERY', 'ALCOHOL')).toEqual(['GROCERY', 'BEVERAGE']);
  });
});

describe('defaultStockPolicy', () => {
  it('épicerie → stock réel : une référence d’étagère se compte', () => {
    expect(defaultStockPolicy('GROCERY')).toBe('INVENTORY');
  });

  it('les autres types → toujours disponible, comme avant', () => {
    for (const vendorType of ALL_VENDOR_TYPES.filter((t) => t !== 'GROCERY')) {
      expect(defaultStockPolicy(vendorType)).toBe('UNLIMITED');
    }
  });
});
