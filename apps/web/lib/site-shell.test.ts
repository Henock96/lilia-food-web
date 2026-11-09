import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * En-têtes et coquille HTML : ni `next.config.ts` (Sentry) ni `app/layout.tsx`
 * (`next/font`) ne s'importent sous vitest. On lit leur source, comme
 * `server-fetch-cache.test.ts`.
 */
const config = readFileSync(join(__dirname, '../next.config.ts'), 'utf8');
const layout = readFileSync(join(__dirname, '../app/layout.tsx'), 'utf8');

describe('coquille du site', () => {
  it('interdit la géolocalisation, dont le site ne se sert pas (SEC-10)', () => {
    const policy = config.match(/key: 'Permissions-Policy',\s*value: '([^']*)'/)?.[1] ?? '';
    expect(policy).toContain('geolocation=()');
    expect(policy).toContain('camera=()');
  });

  it('ne déclare pas de barre sombre : le site n’a pas de mode sombre (UX-07)', () => {
    expect(layout).not.toMatch(/prefers-color-scheme: dark/);
    expect(layout).toMatch(/themeColor: '#E8541F'/);
  });

  it('dit pourquoi la page est vide sans JavaScript (PERF-10)', () => {
    expect(layout).toMatch(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
  });
});
