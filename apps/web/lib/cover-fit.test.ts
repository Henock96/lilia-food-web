import { describe, expect, it } from 'vitest';
import { coverFit } from './cover-fit';

describe('coverFit — dimensions réelles des images de production (08/10/2026)', () => {
  it.each([
    ['Les Gâteaux Gourmands (logo carré)', 1200, 1200, 'contain'],
    ['Le Cosy Lounge (logo carré)', 959, 960, 'contain'],
    ['Dynasty (bandeau 3:1)', 1200, 400, 'contain'],
    ['La Bonne Fourchette (portrait)', 145, 168, 'contain'],
    ['Chez Maman Lili (photo)', 259, 194, 'cover'],
    ['Le Cyprien (photo)', 1200, 800, 'cover'],
    ['16:9', 1600, 900, 'cover'],
  ] as const)('%s', (_label, w, h, expected) => {
    expect(coverFit(w, h)).toBe(expected);
  });

  it('dimensions inconnues : cover (comportement historique)', () => {
    expect(coverFit(0, 0)).toBe('cover');
    expect(coverFit(Number.NaN, 10)).toBe('cover');
  });
});
