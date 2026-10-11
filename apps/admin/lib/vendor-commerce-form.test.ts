import { describe, expect, it } from 'vitest';

import { planCommerceSave } from './vendor-commerce-form';

/**
 * R-09 — la commission d'un vendeur se demande et s'approuve à deux ; le
 * minimum de commande reste direct.
 */
describe('planCommerceSave (R-09)', () => {
  const vendor = { commissionPercent: null, minimumOrderAmount: 2000 };

  it('commission inchangée : seul le PATCH part, sans commission', () => {
    expect(planCommerceSave({ commission: '', minOrder: '2500' }, vendor)).toEqual({
      ok: true,
      commerce: { minimumOrderAmount: 2500 },
      commission: undefined,
    });
  });

  it('nouvelle commission : une demande, et rien dans le PATCH', () => {
    expect(planCommerceSave({ commission: '7.5', minOrder: '2000' }, vendor)).toEqual({
      ok: true,
      commerce: null,
      commission: 7.5,
    });
  });

  it('vider la commission d’un vendeur qui en avait une : demande du taux plateforme', () => {
    const r = planCommerceSave(
      { commission: ' ', minOrder: '2000' },
      { commissionPercent: 9, minimumOrderAmount: 2000 },
    );
    expect(r).toEqual({ ok: true, commerce: null, commission: null });
  });

  it.each([
    ['12,5', 'point'],
    ['abc', 'nombre'],
    ['51', '50 %'],
    ['7.555', 'deux décimales'],
  ])('commission « %s » refusée avant l’envoi (%s)', (commission, hint) => {
    const r = planCommerceSave({ commission, minOrder: '2000' }, vendor);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain(hint);
  });

  it('minimum de commande : entier XAF', () => {
    const r = planCommerceSave({ commission: '', minOrder: '1500.5' }, vendor);
    expect(r.ok).toBe(false);
  });
});
