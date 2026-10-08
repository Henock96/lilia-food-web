import { describe, expect, it } from 'vitest';
import { openingLabel } from './opening-label';

/**
 * Mêmes cas que `lilia-app/lib/features/home/domain/opening_label.dart` :
 * le site et l'application lisent les mêmes champs serveur dans le même ordre.
 */
describe('openingLabel (F3-03)', () => {
  const now = new Date('2026-09-28T10:00:00.000Z'); // 11h00 à Brazzaville

  it('ouvert', () => {
    expect(openingLabel({ isOpen: true, pausedUntil: null }, now)).toBe('Ouvert');
  });

  it('fermé sans aucune échéance connue', () => {
    expect(openingLabel({ isOpen: false }, now)).toBe('Fermé');
  });

  describe('nextOpeningAt servi par le serveur (prioritaire)', () => {
    it('réouverture aujourd’hui', () => {
      expect(
        openingLabel({ isOpen: false, nextOpeningAt: '2026-09-28T17:00:00.000Z' }, now),
      ).toBe('Fermé · ouvre à 18h00');
    });

    it('réouverture demain', () => {
      expect(
        openingLabel({ isOpen: false, nextOpeningAt: '2026-09-29T08:00:00.000Z' }, now),
      ).toBe('Fermé · ouvre demain à 09h00');
    });

    it('réouverture plus tard', () => {
      expect(
        openingLabel({ isOpen: false, nextOpeningAt: '2026-10-02T09:00:00.000Z' }, now),
      ).toBe('Fermé · ouvre le 02/10 à 10h00');
    });

    it('fait foi même face à une pause qui finit plus tôt (pause après la fermeture)', () => {
      expect(
        openingLabel(
          {
            isOpen: false,
            pausedUntil: '2026-09-28T22:00:00.000Z',
            nextOpeningAt: '2026-09-29T09:00:00.000Z',
          },
          now,
        ),
      ).toBe('Fermé · ouvre demain à 10h00');
    });

    it('null servi = rien sous 8 jours : on n’invente pas une heure depuis pausedUntil', () => {
      expect(
        openingLabel(
          { isOpen: false, pausedUntil: '2026-09-28T13:30:00.000Z', nextOpeningAt: null },
          now,
        ),
      ).toBe('Fermé');
    });

    it('échéance passée (colonne pas encore rafraîchie) : fermé', () => {
      expect(
        openingLabel({ isOpen: false, nextOpeningAt: '2026-09-28T09:00:00.000Z' }, now),
      ).toBe('Fermé');
    });

    it('passage de minuit à Brazzaville : 23h30 → 00h30 est « demain »', () => {
      const lateEvening = new Date('2026-09-28T22:30:00.000Z'); // 23h30 à Brazzaville
      expect(
        openingLabel({ isOpen: false, nextOpeningAt: '2026-09-28T23:30:00.000Z' }, lateEvening),
      ).toBe('Fermé · ouvre demain à 00h30');
    });
  });

  describe('serveur antérieur (nextOpeningAt absent) : repli sur pausedUntil', () => {
    it('pause qui finit aujourd’hui', () => {
      expect(
        openingLabel({ isOpen: false, pausedUntil: '2026-09-28T13:30:00.000Z' }, now),
      ).toBe('Fermé · ouvre à 14h30');
    });

    it('pause qui finit un autre jour', () => {
      expect(
        openingLabel({ isOpen: false, pausedUntil: '2026-09-30T07:00:00.000Z' }, now),
      ).toBe('Fermé · ouvre le 30/09 à 08h00');
    });

    it('pause échue : fermé', () => {
      expect(
        openingLabel({ isOpen: false, pausedUntil: '2026-09-28T09:00:00.000Z' }, now),
      ).toBe('Fermé');
    });
  });
});
