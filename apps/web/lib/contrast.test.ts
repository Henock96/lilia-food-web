import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Le texte d'état utilisait les couleurs Tailwind par défaut, sous le seuil AA
 * de 4,5:1 en petite taille (`amber-600` 3,19, `orange-600` 3,56, `rose-500`
 * 3,67, `emerald-600` 3,77). Les variantes « texte » de l'app existent dans
 * `globals.css` : `text-warning`, `text-success`, `text-danger`.
 *
 * Les icônes ne sont pas concernées : leur seuil est de 3:1, et elles l'atteignent.
 */
const WEB_ROOT = path.join(__dirname, '..');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function token(name: string): string {
  const css = readFileSync(path.join(WEB_ROOT, 'app', 'globals.css'), 'utf8');
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`Token absent : ${name}`);
  return match[1];
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return tsxFiles(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

describe('contraste du texte d’état', () => {
  it.each(['success', 'warning', 'danger'])('--color-%s atteint 4,5:1 sur blanc', (name) => {
    expect(ratio(token(name), '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('--color-warning atteint 4,5:1 sur le fond ambre des encadrés', () => {
    expect(ratio(token('warning'), '#FFFBEB')).toBeGreaterThanOrEqual(4.5);
  });

  it('aucun texte n’utilise les couleurs sous le seuil', () => {
    const weak = /(?<![:\w-])text-(amber-600|emerald-600|rose-500|orange-600)\b/;
    const icon = /<[A-Z]\w*\s+className="[^"]*text-/;
    // Grand texte gras : le seuil est de 3:1.
    const large = /\btext-2xl\b/;
    const offenders = [path.join(WEB_ROOT, 'app'), path.join(WEB_ROOT, 'components')]
      .flatMap(tsxFiles)
      .flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, at: `${path.relative(WEB_ROOT, file)}:${i + 1}` }))
          .filter(({ line }) => weak.test(line) && !icon.test(line) && !large.test(line))
          .map(({ at }) => at),
      );
    expect(offenders).toEqual([]);
  });
});
