import { describe, expect, it } from 'vitest';
import { nextFocusIndex } from './dialog-focus';

describe('nextFocusIndex', () => {
  it('Tab sur le dernier élément : retour au premier', () => {
    expect(nextFocusIndex(3, 2, false)).toBe(0);
  });

  it('Maj+Tab sur le premier élément : retour au dernier', () => {
    expect(nextFocusIndex(3, 0, true)).toBe(2);
  });

  it('au milieu du dialogue : on laisse le navigateur faire', () => {
    expect(nextFocusIndex(3, 1, false)).toBeNull();
    expect(nextFocusIndex(3, 1, true)).toBeNull();
  });

  it('focus sorti du dialogue : on y revient', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0);
    expect(nextFocusIndex(3, -1, true)).toBe(2);
  });

  it('aucun élément focalisable : rien à faire', () => {
    expect(nextFocusIndex(0, -1, false)).toBeNull();
  });
});
