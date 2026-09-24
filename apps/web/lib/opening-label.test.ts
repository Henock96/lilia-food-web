import { describe, expect, it } from 'vitest';
import { openingLabel } from './opening-label';

describe('openingLabel (F3-03)', () => {
  const now = new Date('2026-09-28T10:00:00.000Z'); // 11h00 à Brazzaville

  it('ouvert', () => {
    expect(openingLabel({ isOpen: true, pausedUntil: null }, now)).toBe('Ouvert');
  });

  it('fermé sans pause', () => {
    expect(openingLabel({ isOpen: false }, now)).toBe('Fermé');
  });

  it('en pause aujourd’hui : l’heure de réouverture', () => {
    expect(
      openingLabel({ isOpen: false, pausedUntil: '2026-09-28T13:30:00.000Z' }, now),
    ).toBe('Rouvre à 14h30');
  });

  it('en pause jusqu’à un autre jour : la date', () => {
    expect(
      openingLabel({ isOpen: false, pausedUntil: '2026-09-30T07:00:00.000Z' }, now),
    ).toBe('Rouvre le 30/09 à 08h00');
  });

  it('pause échue (colonne pas encore rafraîchie) : fermé', () => {
    expect(
      openingLabel({ isOpen: false, pausedUntil: '2026-09-28T09:00:00.000Z' }, now),
    ).toBe('Fermé');
  });
});
