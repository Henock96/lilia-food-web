import { describe, it, expect } from 'vitest';
import { offerShortLabel } from './offer-label';

describe('offerShortLabel (F3-11)', () => {
  it('pourcentage', () => {
    expect(offerShortLabel({ kind: 'PERCENT', value: 10 })).toBe('−10 %');
  });
  it('remise fixe', () => {
    expect(offerShortLabel({ kind: 'FIXED_THRESHOLD', value: 500 })).toBe('−500 F');
  });
});
