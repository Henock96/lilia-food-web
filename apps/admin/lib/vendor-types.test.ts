import { describe, expect, it } from 'vitest';

import { CREATABLE_VENDOR_TYPES } from './vendor-types';

describe('CREATABLE_VENDOR_TYPES', () => {
  it('propose les cinq types acceptés par POST /admin/vendors, épicerie comprise', () => {
    expect(CREATABLE_VENDOR_TYPES.map((t) => t.value)).toEqual([
      'RESTAURANT',
      'HOME_COOK',
      'BAKERY',
      'BEVERAGE_SHOP',
      'GROCERY',
    ]);
  });

  it('seul le restaurant est validé d’office', () => {
    for (const t of CREATABLE_VENDOR_TYPES) {
      expect(t.helper.includes('validé d’office')).toBe(t.value === 'RESTAURANT');
    }
  });
});
