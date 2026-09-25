import { describe, expect, it } from 'vitest';
import { payoutTriggerLabel } from './payout-trigger';

describe('payoutTriggerLabel (F3-07)', () => {
  it('versement automatique : sans administrateur, ou marqué AUTO', () => {
    expect(payoutTriggerLabel({ requestedBy: null })).toBe('automatique');
    expect(payoutTriggerLabel({ requestedBy: null, metadata: { trigger: 'AUTO' } })).toBe('automatique');
  });

  it('versement demandé par un administrateur', () => {
    expect(payoutTriggerLabel({ requestedBy: 'a1', metadata: { trigger: 'MANUAL' } })).toBe('manuel');
    expect(payoutTriggerLabel({ requestedBy: 'a1' })).toBe('manuel');
  });
});
