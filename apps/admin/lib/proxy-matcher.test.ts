import { describe, expect, it } from 'vitest';
import { config } from '../proxy';

// Le motif est une expression régulière valide telle quelle.
const matched = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe('proxy admin : chemins laissés hors session', () => {
  it.each(['/push-sw.js', '/icon-192.png', '/robots.txt'])('%s est servi sans session', (path) => {
    expect(matched(path)).toBe(false);
  });

  it.each(['/dashboard', '/commandes', '/notifications/ouvrir'])('%s reste protégé', (path) => {
    expect(matched(path)).toBe(true);
  });
});
