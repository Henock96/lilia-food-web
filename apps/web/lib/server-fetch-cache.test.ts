import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Tout appel backend fait au rendu d'une page publique doit déclarer une
 * frontière de cache.
 *
 * ## Le défaut que ce test ferme
 *
 * `lib/hero-slides.ts` appelait `apiClientRaw('/banners')` **sans `'use cache'`,
 * sans `cacheTag`, sans `cacheLife`**, et `app/(public)/page.tsx` l'attendait
 * directement dans le composant de page. Ses deux voisins — `lib/vendors.ts` et
 * `lib/vendor-menu.ts` — font l'inverse, et expliquent longuement pourquoi.
 *
 * Avec `cacheComponents: true`, un `fetch` non caché rend le sous-arbre
 * dynamique : `GET /banners` partait **à chaque affichage de la page
 * d'accueil**, depuis l'IP de sortie Vercel et sans jeton. Or le throttler
 * backend trace par compte quand un jeton est présent, **par IP sinon** : tous
 * les visiteurs anonymes partageaient donc un unique seau de 10 req/s et
 * 100 req/min. Au-delà, `/banners` répond 429, le `catch` avale, et le hero
 * s'affiche vide **pour tout le monde**.
 *
 * ## Pourquoi un test structurel
 *
 * Ni `'use cache'` ni `cacheTag` ne sont observables depuis vitest : ce sont
 * des directives que le compilateur Next interprète. Ce qui est vérifiable,
 * c'est la **cohérence entre les modules** — exactement la forme qu'ont déjà
 * `cors-allowed-headers.spec.ts` et `env-example-parity.spec.ts` côté backend.
 * Un fichier qui appelle le backend au rendu sans déclarer sa frontière est un
 * écart, quel qu'en soit l'auteur.
 */
const SERVER_FETCH_MODULES = [
  'hero-slides.ts',
  'vendors.ts',
  'vendor-menu.ts',
  'vendor-reviews.ts',
  '../app/sitemap.ts',
] as const;

function source(file: string): string {
  return readFileSync(join(__dirname, file), 'utf8');
}

describe('frontières de cache des lectures serveur', () => {
  describe.each(SERVER_FETCH_MODULES)('%s', (file) => {
    const code = source(file);

    it('appelle bien le backend (garde contre un test qui n’inspecte rien)', () => {
      expect(code).toMatch(/apiClient(Raw)?\s*[(<]/);
    });

    it('déclare une frontière de cache', () => {
      expect(code).toContain("'use cache");
    });

    it('range ses entrées dans le cache partagé, jamais en mémoire d’instance (PERF-02)', () => {
      // `'use cache'` seul vit dans la mémoire de l'instance Vercel qui a
      // rendu la page : l'instance suivante relit le backend (2 à 3 s).
      // Lignes de directive seulement : les commentaires citent `'use cache'`.
      const boundaries = (code.match(/^\s*'use cache[^']*';?\s*$/gm) ?? []).map((b) => b.trim());
      expect(boundaries.length).toBeGreaterThan(0);
      expect(boundaries.every((b) => b === "'use cache: remote';")).toBe(true);
    });

    it('borne l’attente du backend', () => {
      // Présence seulement : chaque appel est vérifié par le test de comportement
      // du module (`vendor-menu`, `vendors-read`, `hero-slides`, `vendor-reviews`, `sitemap`).
      expect(code).toMatch(/serverReadSignal\(/);
    });

    it('pose une étiquette, pour être invalidable', () => {
      // Sans `cacheTag`, l'entrée est injoignable : `revalidateTag` ne la
      // touche pas, et elle ne peut être rafraîchie que par un redéploiement.
      expect(code).toMatch(/cacheTag\(/);
    });

    it('borne sa fraîcheur', () => {
      expect(code).toMatch(/cacheLife\(/);
    });
  });

  it('la fiche produit, lue sans cache, borne aussi son attente', () => {
    const page = readFileSync(join(__dirname, '../app/(public)/produits/[id]/page.tsx'), 'utf8');
    expect(page).toMatch(/apiClient<Product>\([^)]*serverReadSignal\(\)/);
  });

  it('la section des avis lit le backend par `lib/vendor-reviews.ts`, pas en direct', () => {
    const component = readFileSync(
      join(__dirname, '../components/restaurants/restaurant-reviews.tsx'),
      'utf8',
    );
    expect(component).not.toMatch(/apiClient/);
    expect(component).not.toMatch(/^\s*'use cache/m);
  });

  it('l’étiquette des bannières est invalidable depuis le backend', () => {
    const route = readFileSync(
      join(__dirname, '../app/api/revalidate/route.ts'),
      'utf8',
    );

    // Une étiquette que rien ne purge vaut un cache qu'on ne peut pas corriger :
    // l'administrateur change une bannière et ne voit rien changer.
    expect(route).toContain('banners');
  });
});
