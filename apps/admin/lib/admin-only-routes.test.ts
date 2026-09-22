import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Toute entrée `adminOnly: true` de la sidebar est gardée par un layout
 * `<AdminOnly>`.
 *
 * Masquer un lien ne protège rien : un RESTAURATEUR peut taper l'URL. Le
 * backend refuse (403), mais la page s'affichait avant de le découvrir.
 * L'audit du 22/09/2026 a relevé `/parametres` à tort (WEB-ADM-001 : la garde
 * existait déjà, dans son `layout.tsx`) ; il a aussi montré que deux sections
 * (`/vendeurs`, `/parrainages`) ne se gardaient qu'en ligne. Ce test fixe la
 * règle pour toutes : une nouvelle section admin sans garde casse la CI.
 */
const root = path.resolve(__dirname, '..');
const sidebar = readFileSync(path.join(root, 'components/layout/sidebar.tsx'), 'utf8');

const adminOnlyHrefs = [...sidebar.matchAll(/href: '(\/[^']+)'[^}]*adminOnly: true/g)].map(
  (m) => m[1],
);

describe('Sections admin-only', () => {
  it('la sidebar en déclare (sinon ce test ne vérifie rien)', () => {
    expect(adminOnlyHrefs.length).toBeGreaterThanOrEqual(10);
  });

  it.each(adminOnlyHrefs)('%s est gardée par <AdminOnly> dans son layout', (href) => {
    const layout = path.join(root, 'app/(protected)', href, 'layout.tsx');
    expect(existsSync(layout), `${layout} absent`).toBe(true);
    expect(readFileSync(layout, 'utf8')).toContain('<AdminOnly>');
  });
});
