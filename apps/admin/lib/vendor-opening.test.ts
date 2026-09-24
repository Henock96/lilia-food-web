import { describe, expect, it } from 'vitest';
import { formatBrazzaville, localInputToIso, openingSummary } from './vendor-opening';

describe('fermetures (F3-03)', () => {
  it('saisie en heure de Brazzaville → instant UTC', () => {
    expect(localInputToIso('2026-12-24T08:00')).toBe('2026-12-24T07:00:00.000Z');
  });

  it('affichage en heure de Brazzaville', () => {
    expect(formatBrazzaville('2026-12-24T07:00:00.000Z')).toBe('24/12 à 08h00');
  });

  it('aller-retour saisie → affichage', () => {
    expect(formatBrazzaville(localInputToIso('2026-10-02T14:30'))).toBe('02/10 à 14h30');
  });

  it('résumé : pourquoi et jusqu’à quand', () => {
    expect(
      openingSummary({ isOpen: false, reason: 'PAUSED', until: '2026-10-02T13:30:00.000Z' }),
    ).toBe("En pause jusqu'au 02/10 à 14h30");
    expect(openingSummary({ isOpen: true, reason: 'OPEN', until: null })).toBe('Ouverte');
    expect(openingSummary({ isOpen: false, reason: 'HOLIDAY', until: null })).toBe(
      "Fermée aujourd'hui (jour férié)",
    );
  });
});
