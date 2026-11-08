import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Le site ne publie aucune Server Action (SEC-06, audit du 06/11/2026).
 *
 * Les deux qui existaient (`retryVendors`, `revalidateVendorMenu`) purgeaient
 * le cache à la demande de **n'importe quel visiteur**, sans limite. Avec un
 * cache partagé entre instances, chaque appel devenait une purge globale, donc
 * une relance du backend. Elles ne servaient à rien : « Réessayer » ne
 * s'affiche qu'après une lecture qui a **levé**, et une rejection n'est jamais
 * mémorisée par `'use cache'` — `router.refresh()` relit donc le serveur.
 *
 * Une Server Action est un point d'entrée HTTP public. En ajouter une est une
 * décision de sécurité : ce test oblige à la prendre explicitement.
 */
const ROOT = join(__dirname, '..');
const SKIPPED = new Set(['node_modules', '.next', '.turbo', 'public']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIPPED.has(entry.name) ? [] : sourceFiles(path);
    return /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('Server Actions', () => {
  const files = sourceFiles(ROOT);

  it('parcourt réellement les sources (garde contre un test qui n’inspecte rien)', () => {
    for (const expected of ['page-load-error.tsx', 'proxy.ts', 'instrumentation.ts', 'sitemap.ts']) {
      expect(files.some((f) => f.endsWith(expected))).toBe(true);
    }
  });

  it('aucune n’est publiée par le site', () => {
    const declaring = files
      // Directive en tête de fichier ou de fonction (commentaire de fin de
      // ligne toléré), pas une mention dans un commentaire.
      .filter((f) => /^\s*['"]use server['"];?\s*(\/\/.*)?$/m.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(declaring).toEqual([]);
  });
});
