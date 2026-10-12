import { describe, expect, it } from 'vitest';
import {
  canOfferRevoke,
  formatSubscriptionDate,
  periodState,
  verdictLabel,
} from './subscription-view';

describe('subscription-view (Premium, Lot 2)', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const period = (over: Partial<{ status: 'ACTIVE' | 'REVOKED'; startsAt: string; endsAt: string }> = {}) => ({
    status: 'ACTIVE' as const,
    startsAt: '2026-10-11T09:00:00.000Z',
    endsAt: '2026-11-11T09:00:00.000Z',
    ...over,
  });

  it('date lue à l’heure de Brazzaville', () => {
    // 31/10 23:30 UTC = 1er novembre 00:30 à Brazzaville.
    expect(formatSubscriptionDate('2026-10-31T23:30:00.000Z')).toBe('1 novembre 2026');
  });

  describe('verdictLabel — seul le verdict serveur décide', () => {
    it('Standard', () => {
      expect(
        verdictLabel({
          plan: null,
          active: false,
          currentPeriodEndsAt: null,
          paidUntil: null,
          entitlements: [],
        }),
      ).toBe('Standard');
    });

    it('non actif : « Standard », sans jamais présenter une fin comme un début', () => {
      expect(
        verdictLabel({
          plan: null,
          active: false,
          currentPeriodEndsAt: null,
          paidUntil: '2026-12-11T09:00:00.000Z',
          entitlements: [],
        }),
      ).toBe('Standard');
    });

    it('Premium jusqu’à la fin de la dernière période payée', () => {
      expect(
        verdictLabel({
          plan: 'PREMIUM',
          active: true,
          currentPeriodEndsAt: '2026-11-11T09:00:00.000Z',
          paidUntil: '2026-12-11T09:00:00.000Z',
          entitlements: ['ANALYTICS_ADVANCED'],
        }),
      ).toBe('Premium jusqu’au 11 décembre 2026');
    });
  });

  describe('periodState', () => {
    it('en cours', () => expect(periodState(period(), now)).toBe('en cours'));
    it('à venir (prolongation empilée)', () =>
      expect(
        periodState(
          period({ startsAt: '2026-11-11T09:00:00.000Z', endsAt: '2026-12-11T09:00:00.000Z' }),
          now,
        ),
      ).toBe('à venir'));
    it('terminée à la fin exacte (fin exclue)', () =>
      expect(periodState(period(), new Date('2026-11-11T09:00:00.000Z'))).toBe('terminée'));
    it('révoquée prime sur les dates', () =>
      expect(periodState(period({ status: 'REVOKED' }), now)).toBe('révoquée'));
  });

  it('« Révoquer » seulement sur une période en cours ou à venir', () => {
    expect(canOfferRevoke('en cours')).toBe(true);
    expect(canOfferRevoke('à venir')).toBe(true);
    expect(canOfferRevoke('terminée')).toBe(false);
    expect(canOfferRevoke('révoquée')).toBe(false);
  });
});
