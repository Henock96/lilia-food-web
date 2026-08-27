# Refonte visuelle du site client — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'habillage sombre et sophistiqué de `apps/web` par une direction « chaleur du marché » — crème et rouge tomate du logo, Bricolage Grotesque, hero à slider de vendeurs — sur la home, le catalogue et la fiche vendeur.

**Architecture :** Quatre vagues successives, le site restant déployable après chacune. On commence par les tokens CSS (tout le site change de couleur sans qu'aucune mise en page bouge), puis la home, puis catalogue et fiche vendeur, puis la reprise des composants `ui/` partagés. La seule logique métier introduite — la sélection des vendeurs du hero — est isolée dans une fonction pure testée unitairement.

**Tech Stack :** Next.js 16 (App Router), React 19, Tailwind CSS v4 (`@theme` dans `globals.css`), TypeScript, pnpm + Turbo, framer-motion (existant), Vitest (introduit en Task 4).

## Global Constraints

- **Périmètre : `apps/web` uniquement.** Ne jamais modifier `apps/admin` ni `packages/*` sauf mention explicite d'un fichier précis.
- **Aucune modification de logique métier.** Panier mono-mode, précommandes, points de fidélité, paiement : intouchables. Cette refonte est visuelle.
- **Gestionnaire de paquets : `pnpm`** (`pnpm@9.15.0`). Jamais `npm` ni `yarn`. Les commandes tournent depuis la racine du monorepo `lilia-food-web/`.
- **Contrastes imposés** (valeurs exactes, vérifiées WCAG sur fond crème `#FDF4E8`) :
  - `#EF4423` — aplats, bordures, titres ≥ 24 px. **Interdit pour du texte courant** (3,5:1).
  - `#D2371A` — **fond des boutons** à texte blanc (4,9:1). Un bouton `#EF4423` à texte blanc est un défaut.
  - `#B8300F` — **texte rouge sur crème** (5,6:1).
- **Le fond de page est `#FDF4E8`, jamais `#FFFFFF`.** Le blanc est réservé aux cartes.
- **Aucune classe `dark:` ne doit subsister** dans `apps/web` à la fin.
- **Aucune image de banque d'images.** Ni `images.unsplash.com`, ni `i.pravatar.cc`.
- **Langue de l'interface : français**, tutoiement (registre existant du site).
- Après **chaque** task : `pnpm turbo lint type-check --filter=web` doit passer.
- Spec de référence : `docs/superpowers/specs/2026-08-26-refonte-web-design.md`.

---

## Structure des fichiers

**Créés**
| Fichier | Responsabilité |
|---|---|
| `apps/web/lib/hero-slides.ts` | Fonction pure `selectHeroSlides()` : filtre, trie et limite les vendeurs éligibles au hero. Réutilise `coverImage()` de @lilia/utils. Aucune dépendance React. |
| `apps/web/lib/hero-slides.test.ts` | Tests unitaires de `selectHeroSlides()`. |
| `apps/web/components/home/hero-slider.tsx` | Le hero : photo de fond, titre fixe, cartes vendeurs. Remplace `hero-section.tsx`. |
| `apps/web/vitest.config.ts` | Configuration Vitest. |
| `apps/web/public/hero-fallback.jpg` | Photo statique du hero quand aucun vendeur n'est éligible. |

**Supprimés**
`components/home/testimonials.tsx`, `components/home/app-download-banner.tsx`, `components/home/promo-strip.tsx`, `components/home/hero-section.tsx`, `components/theme-provider.tsx`.

**Modifiés** — voir le détail par task.

---

## Task 1 : Tokens de couleur et de typographie, suppression du mode sombre

Cette task change les couleurs de **tout** le site d'un coup, sans toucher à aucune mise en page. À la fin, le site est crème et rouge, et fonctionne.

**Files:**
- Modify: `apps/web/app/globals.css` (réécriture des `@theme`, `:root`, suppression du bloc `.dark` et du thème « noir » lignes ~200-298)
- Modify: `apps/web/app/layout.tsx` (retrait de `ThemeProvider`)
- Modify: `apps/web/components/providers.tsx` (retrait de `ThemeProvider`)
- Delete: `apps/web/components/theme-provider.tsx`

**Interfaces:**
- Consumes: rien (première task).
- Produces: les variables CSS `--color-tomato-500|600|700`, `--color-cream-100|200`, `--color-ink-900|500`, `--font-display`, `--font-sans`, et les classes utilitaires Tailwind correspondantes (`bg-tomato-600`, `text-ink-500`, `bg-cream-100`…). Toutes les tasks suivantes s'appuient dessus.

- [ ] **Step 1 : Remplacer l'import de polices en tête de `globals.css`**

Remplacer la ligne 2 (`@import url("https://fonts.googleapis.com/css2?family=Fraunces...")`) par :

```css
@import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap");
```

Fraunces disparaît : c'est une famille de moins à télécharger.

- [ ] **Step 2 : Remplacer le bloc `@theme`**

Remplacer l'intégralité du bloc `@theme { ... }` par :

```css
@theme {
  /* ── Rouge tomate du logo ──
     Trois nuances imposées par le contraste, pas par l'esthétique :
     500 = aplats et gros titres (3,5:1 sur crème — pas de texte courant)
     600 = fond de bouton à texte blanc (4,9:1)
     700 = texte rouge sur crème (5,6:1)                              */
  --color-tomato-500: #EF4423;
  --color-tomato-600: #D2371A;
  --color-tomato-700: #B8300F;
  --color-tomato-100: #FBD9D1;

  /* ── Crème ── */
  --color-cream-100: #FDF4E8;
  --color-cream-200: #F6E7D2;
  --color-cream-300: #EBD9BF;

  /* ── Encre ── */
  --color-ink-900: #1C1815;
  --color-ink-700: #3B342E;
  --color-ink-500: #6B615A;
  --color-ink-300: #A79C92;

  /* ── Sémantiques ──
     Le danger est volontairement plus sombre et plus froid que le rouge
     de marque : sans cet écart, « Commander » et « Paiement refusé » se
     confondent.                                                        */
  --color-success: #0F7B4A;
  --color-warning: #A96A00;
  --color-danger:  #B3261E;

  /* ── Typographie ── */
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;

  /* ── Ombres ── */
  --shadow-sm: 0 1px 3px rgba(28,24,21,.07), 0 1px 2px rgba(28,24,21,.04);
  --shadow-md: 0 4px 16px rgba(28,24,21,.09), 0 2px 6px rgba(28,24,21,.05);
  --shadow-lg: 0 8px 32px rgba(28,24,21,.13);

  --radius-pill: 999px;
}
```

- [ ] **Step 3 : Remplacer les variables sémantiques et supprimer `.dark`**

Remplacer le bloc `:root { ... }` par celui-ci, et **supprimer entièrement le bloc `.dark { ... }`** :

```css
:root {
  --bg-primary:     #FDF4E8;
  --bg-secondary:   #FFFFFF;
  --bg-elevated:    #FFFFFF;
  --bg-muted:       #F6E7D2;
  --bg-overlay:     rgba(28,24,21,.55);
  --text-primary:   #1C1815;
  --text-secondary: #6B615A;
  --text-muted:     #A79C92;
  --text-inverse:   #FDF4E8;
  --action-primary: #D2371A;
  --action-hover:   #B8300F;
  --border:         #EBD9BF;
  --border-focus:   #EF4423;
  --success:        #0F7B4A;
  --warning:        #A96A00;
  --danger:         #B3261E;
}
```

- [ ] **Step 4 : Supprimer la variante dark et le thème « noir »**

Dans `globals.css` :
- supprimer la ligne `@variant dark (&:where(.dark, .dark *));`
- supprimer **tout le bloc du thème noir** (à partir du commentaire contenant `--noir-900` jusqu'à la fin du fichier) : les variables `--noir-*`, `--ember-*`, `--gold-400`, et les classes `.text-ember`, `.glass-noir`, `.ember-glow`, `.ring-ember`, `.grain`, `.noir-canvas`, `.ember-breathe`, `.scroll-cue` et leurs `@keyframes`.

Ces classes ne sont utilisées que par les composants supprimés ou réécrits en Task 5 à 9. Si `pnpm turbo build --filter=web` échoue sur une classe manquante, c'est un composant non encore traité : le noter, ne pas réintroduire la classe.

- [ ] **Step 5 : Retirer le ThemeProvider**

Dans `apps/web/components/providers.tsx`, supprimer l'import et l'usage de `ThemeProvider` (conserver tous les autres providers : React Query, auth, etc.). Puis :

```bash
rm apps/web/components/theme-provider.tsx
```

Si `app/layout.tsx` importe `ThemeProvider` ou pose une classe `dark` sur `<html>`, retirer aussi. Conserver `suppressHydrationWarning`.

- [ ] **Step 6 : Purger les classes `dark:` du site**

```bash
grep -rn "dark:" apps/web --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules
```

Supprimer chaque occurrence — uniquement la portion `dark:…` de l'attribut `className`, en laissant intacte la classe claire correspondante. Exemple :
`'bg-cream-200 text-charcoal-500 dark:bg-dark-muted dark:text-charcoal-300'` devient `'bg-cream-200 text-charcoal-500'`.

- [ ] **Step 7 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
grep -rn "dark:" apps/web --include="*.tsx" --include="*.css" | grep -v node_modules
grep -rn "Fraunces" apps/web | grep -v node_modules
```

Attendu : build vert, et les deux `grep` ne renvoient **rien**.

Les anciens noms de couleurs (`primary-500`, `charcoal-*`, `cream-50`) ne résolvent plus. Tailwind v4 ne casse pas le build pour une classe inconnue : elle est simplement ignorée. C'est attendu à ce stade — les tasks 2 à 10 les remplacent composant par composant.

- [ ] **Step 8 : Commit**

```bash
git add apps/web/app/globals.css apps/web/components/providers.tsx apps/web/app/layout.tsx
git rm apps/web/components/theme-provider.tsx
git commit -m "feat(web): palette crème/tomate, Bricolage Grotesque, suppression du mode sombre"
```

---

## Task 2 : Composants `ui/` réaccordés aux nouveaux tokens

**Files:**
- Modify: `apps/web/components/ui/button.tsx`
- Modify: `apps/web/components/ui/badge.tsx`
- Modify: `apps/web/components/ui/chip.tsx`
- Modify: `apps/web/components/ui/input.tsx`
- Modify: `apps/web/components/ui/empty-state.tsx`

**Interfaces:**
- Consumes: les tokens de Task 1.
- Produces: `Button` conserve exactement sa signature actuelle — `variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'muted'`, `size: 'xs' | 'sm' | 'md' | 'lg'`, plus `loading`, `fullWidth`, `leftIcon`, `rightIcon`. **Ne pas renommer ni retirer de variante** : elles sont utilisées dans tout le tunnel de commande, hors périmètre.

- [ ] **Step 1 : Remplacer les classes de variantes du bouton**

Dans `components/ui/button.tsx`, remplacer `variantClasses` par :

```ts
const variantClasses: Record<ButtonVariant, string> = {
  // bg-tomato-600 (et non 500) : c'est le seul rouge qui passe 4,5:1 avec du blanc
  primary:   'bg-tomato-600 text-white hover:bg-tomato-700 shadow-sm hover:shadow-md',
  secondary: 'border-[1.5px] border-tomato-600 text-tomato-700 hover:bg-tomato-100',
  ghost:     'bg-cream-200 text-ink-700 hover:bg-cream-300',
  danger:    'bg-danger text-white hover:opacity-90',
  muted:     'bg-cream-200 text-ink-500 hover:bg-cream-300',
};
```

Retirer aussi `hover:-translate-y-px active:translate-y-0` de la variante `primary` et `active:scale-[0.97]` du `cn(...)` : le soulèvement au survol fait partie du registre « sophistiqué » qu'on retire.

- [ ] **Step 2 : Réaccorder les quatre autres composants**

Appliquer la même substitution de tokens dans `badge.tsx`, `chip.tsx`, `input.tsx`, `empty-state.tsx` :

| Ancien | Nouveau |
|---|---|
| `primary-500` / `primary-600` | `tomato-600` / `tomato-700` |
| `primary-50` / `primary-100` | `tomato-100` |
| `charcoal-500` / `charcoal-600` / `charcoal-700` | `ink-700` / `ink-900` |
| `charcoal-400` / `charcoal-300` | `ink-500` / `ink-300` |
| `charcoal-100` | `cream-300` |
| `cream-50` | `cream-100` |
| `cream-100` | `cream-100` |
| `cream-200` | `cream-200` |

Pour `input.tsx` : fond `bg-white`, bordure `border-cream-300`, anneau de focus `focus:border-tomato-500 focus:ring-2 focus:ring-tomato-100`.

Pour `empty-state.tsx` : fond `bg-cream-200`, texte `text-ink-500`, icône `text-ink-300`.

Pour les badges de statut, utiliser `bg-success text-white` (ouvert) et `bg-ink-300 text-white` (fermé) — **pas** de rose ni de violet.

- [ ] **Step 3 : Vérifier qu'aucun ancien token ne subsiste dans `ui/`**

```bash
grep -rnE "primary-[0-9]|charcoal-|dark-(bg|surface|card|muted|border)|ember-|noir-" apps/web/components/ui/
```

Attendu : aucun résultat.

- [ ] **Step 4 : Vérifier**

```bash
pnpm turbo lint type-check --filter=web
```

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/ui/
git commit -m "feat(web): composants ui/ sur la palette crème/tomate"
```

---

## Task 3 : Header et Footer

**Files:**
- Modify: `apps/web/components/layout/header.tsx`
- Modify: `apps/web/components/layout/footer.tsx`

**Interfaces:**
- Consumes: tokens de Task 1, `Button` de Task 2.
- Produces: rien que d'autres tasks consomment.

- [ ] **Step 1 : Retirer le bouton de bascule de thème du header**

Dans `header.tsx`, supprimer le bouton lune/soleil, son état, et tout import de `next-themes` ou du `theme-provider` supprimé. Conserver : logo, liens de navigation, icône panier, bouton Connexion.

- [ ] **Step 2 : Rehabiller le header**

- Fond : `bg-cream-100`, bordure basse `border-b border-cream-300`.
- Le header reste `sticky top-0 z-50`. **Retirer** tout effet de flou (`backdrop-blur`) ou de transparence liée au défilement.
- Logo : `font-display font-extrabold`, « Food » en `text-tomato-600`.
- Liens : `text-ink-500`, lien actif `text-ink-900 font-semibold`.

- [ ] **Step 3 : Rehabiller le footer**

- Fond `bg-ink-900`, texte `text-cream-100`.
- Titres de colonnes en `font-display font-bold`.
- Retirer toute référence aux applications mobiles (badges de stores) — traité en Task 7.
- Conserver l'adresse `contact@liliafood.com` déjà présente.

- [ ] **Step 4 : Vérifier**

```bash
pnpm turbo lint type-check --filter=web
grep -rn "next-themes\|useTheme\|theme-provider" apps/web/components/layout/
```

Attendu : lint vert, `grep` vide.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/layout/
git commit -m "feat(web): header et footer sur la nouvelle charte, bascule de thème retirée"
```

---

## Task 4 : Sélection des vendeurs du hero (fonction pure, en TDD)

C'est la seule logique de cette refonte, et c'est là que le site casse si on se trompe : en production il n'y a **qu'un seul vendeur**. On l'écrit en test d'abord.

Cette task introduit Vitest — le monorepo n'a aucun test aujourd'hui. On l'installe pour cette fonction, sans toucher au reste de l'outillage.

**Files:**
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/lib/hero-slides.ts`
- Test: `apps/web/lib/hero-slides.test.ts`
- Modify: `apps/web/package.json` (dépendance et script `test`)

**Interfaces:**
- Consumes: le type `Restaurant` de `@lilia/types` — champs utilisés : `id`, `nom`, `adresse`, `imageUrl`, `photos`, `isActive`, `isOpen`, `adminApproved`, `estimatedDeliveryTimeMin`, `estimatedDeliveryTimeMax`, `vendorType`. **Attention : le champ du nom est `nom`, pas `name`.**
- Produces:
  ```ts
  export interface HeroSlide {
    id: string;
    nom: string;
    imageUrl: string;
    adresse: string;
    isOpen: boolean;
    delay: string;   // ex. "15–20 min"
  }
  export function selectHeroSlides(restaurants: Restaurant[]): HeroSlide[]
  ```
  Task 5 consomme exactement cette signature.

- [ ] **Step 1 : Installer Vitest**

```bash
pnpm add -D --filter web vitest
```

Puis créer `apps/web/vitest.config.ts` :

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

Ajouter dans `apps/web/package.json`, section `scripts` : `"test": "vitest run"`.

- [ ] **Step 2 : Écrire les tests qui échouent**

Créer `apps/web/lib/hero-slides.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import type { Restaurant } from '@lilia/types';
import { selectHeroSlides } from './hero-slides';

function vendor(over: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'v1',
    nom: 'Chez Maman Lili',
    adresse: '15, Rue Banziris Poto-Poto',
    phone: '+242000000',
    imageUrl: 'https://res.cloudinary.com/x/cover.jpg',
    latitude: null,
    longitude: null,
    ownerId: 'o1',
    isActive: true,
    isOpen: true,
    manualOverride: false,
    deliveryPriceMode: 'FIXED',
    fixedDeliveryFee: 1000,
    estimatedDeliveryTimeMin: 15,
    estimatedDeliveryTimeMax: 20,
    minimumOrderAmount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    adminApproved: true,
    ...over,
  } as Restaurant;
}

describe('selectHeroSlides', () => {
  it('retourne un tableau vide quand aucun vendeur', () => {
    expect(selectHeroSlides([])).toEqual([]);
  });

  it('exclut les vendeurs inactifs, non approuvés ou sans photo', () => {
    const list = [
      vendor({ id: 'a', isActive: false }),
      vendor({ id: 'b', adminApproved: false }),
      vendor({ id: 'c', imageUrl: null, photos: [] }),
    ];
    expect(selectHeroSlides(list)).toEqual([]);
  });

  it('retient un vendeur éligible et compose son délai', () => {
    const out = selectHeroSlides([vendor()]);
    expect(out).toHaveLength(1);
    expect(out[0].nom).toBe('Chez Maman Lili');
    expect(out[0].delay).toBe('15–20 min');
    expect(out[0].imageUrl).toBe('https://res.cloudinary.com/x/cover.jpg');
  });

  // La galerie Cloudinary prime sur le champ `imageUrl` hérité, qui pointe
  // souvent vers un hôte tiers non maîtrisé. C'est le comportement de
  // `coverImage()` de @lilia/utils, déjà employé par les cartes vendeur : le
  // hero doit afficher la même image que la carte du même vendeur.
  it('préfère la galerie au champ imageUrl hérité', () => {
    const out = selectHeroSlides([
      vendor({
        imageUrl: 'https://un-site-tiers.example/photo.jpg',
        // `vendor()` accepte déjà Partial<Restaurant> et applique `as Restaurant`
        // en sortie : pas de cast supplémentaire ici. Si le type GalleryImage
        // exige d'autres champs, les compléter plutôt que d'élargir le cast.
        photos: [
          { id: 'p1', url: 'https://res.cloudinary.com/x/grillades.jpg', isCover: true },
        ] as Restaurant['photos'],
      }),
    ]);
    expect(out[0].imageUrl).toBe('https://res.cloudinary.com/x/grillades.jpg');
  });

  it('retombe sur imageUrl quand la galerie est vide', () => {
    const out = selectHeroSlides([
      vendor({ imageUrl: 'https://un-site-tiers.example/photo.jpg', photos: [] }),
    ]);
    expect(out[0].imageUrl).toBe('https://un-site-tiers.example/photo.jpg');
  });

  it('place les vendeurs ouverts avant les fermés', () => {
    const out = selectHeroSlides([
      vendor({ id: 'ferme', isOpen: false }),
      vendor({ id: 'ouvert', isOpen: true }),
    ]);
    expect(out.map((s) => s.id)).toEqual(['ouvert', 'ferme']);
  });

  it('limite à cinq slides', () => {
    const many = Array.from({ length: 9 }, (_, i) => vendor({ id: `v${i}` }));
    expect(selectHeroSlides(many)).toHaveLength(5);
  });
});
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

```bash
pnpm --filter web test
```

Attendu : ÉCHEC — `Failed to resolve import "./hero-slides"`.

- [ ] **Step 4 : Écrire l'implémentation minimale**

Créer `apps/web/lib/hero-slides.ts` :

```ts
import type { Restaurant } from '@lilia/types';
import { coverImage } from '@lilia/utils';

/** Vendeur affiché dans le hero de la home. */
export interface HeroSlide {
  id: string;
  nom: string;
  imageUrl: string;
  adresse: string;
  isOpen: boolean;
  /** Fourchette de livraison prête à afficher, ex. « 15–20 min ». */
  delay: string;
}

/** Nombre maximum de slides — au-delà, plus personne ne les regarde. */
const MAX_SLIDES = 5;

/**
 * Sélectionne les vendeurs éligibles au hero : actifs, approuvés, et dotés
 * d'une photo. Les vendeurs ouverts passent devant.
 *
 * Retourner moins de 2 slides est un cas normal, pas une erreur : au
 * lancement le catalogue ne compte qu'un vendeur. C'est à l'appelant de
 * basculer en affichage statique — voir HeroSlider.
 */
export function selectHeroSlides(restaurants: Restaurant[]): HeroSlide[] {
  return restaurants
    .filter((r) => r.isActive && r.adminApproved !== false && coverImage(r) !== null)
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen))
    .slice(0, MAX_SLIDES)
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      imageUrl: coverImage(r) as string,
      adresse: r.adresse,
      isOpen: r.isOpen,
      delay: `${r.estimatedDeliveryTimeMin}–${r.estimatedDeliveryTimeMax} min`,
    }));
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

```bash
pnpm --filter web test
```

Attendu : 6 tests passés.

- [ ] **Step 6 : Vérifier que le tri est stable**

`Array.prototype.sort` est stable depuis ES2019 : à statut d'ouverture égal, l'ordre d'origine renvoyé par l'API est conservé. Ne pas ajouter de critère de tri supplémentaire.

```bash
pnpm turbo lint type-check --filter=web
```

- [ ] **Step 7 : Commit**

```bash
git add apps/web/lib/hero-slides.ts apps/web/lib/hero-slides.test.ts apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): sélection des vendeurs du hero avec repli, couverte par des tests"
```

---

## Task 5 : Le hero

**Files:**
- Create: `apps/web/components/home/hero-slider.tsx`
- Create: `apps/web/public/hero-fallback.jpg`
- Delete: `apps/web/components/home/hero-section.tsx`
- Modify: `apps/web/app/(public)/page.tsx`

**Interfaces:**
- Consumes: `selectHeroSlides`, `HeroSlide` de Task 4.
- Produces: `export function HeroSlider({ restaurants }: { restaurants: Restaurant[] })`.

- [ ] **Step 1 : Déposer la photo de repli**

Placer une photo de plat congolais dans `apps/web/public/hero-fallback.jpg` (format paysage, ≥ 1600 px de large, compressée sous 250 Ko). En attendant les photos du founder, réutiliser la couverture de Chez Maman Lili téléchargée localement — **jamais** une URL de banque d'images.

- [ ] **Step 2 : Écrire le composant**

Créer `apps/web/components/home/hero-slider.tsx` :

```tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import type { Restaurant } from '@lilia/types';
import { selectHeroSlides } from '@/lib/hero-slides';

/** Intervalle de rotation. Assez lent pour qu'on ait le temps de lire. */
const ROTATE_MS = 6000;

export function HeroSlider({ restaurants }: { restaurants: Restaurant[] }) {
  const slides = selectHeroSlides(restaurants);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // En dessous de 2 vendeurs il n'y a rien à faire tourner : le hero devient
  // une simple photo. C'est l'état du site au lancement, pas un cas dégradé.
  const rotating = slides.length >= 2 && !reduced && !paused;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [rotating, slides.length]);

  const current = slides[active];
  const background = current?.imageUrl ?? '/hero-fallback.jpg';

  return (
    <section
      className="relative h-[19rem] overflow-hidden sm:h-[22rem]"
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Seule la première image est prioritaire ; les suivantes ne doivent
          pas concurrencer le LCP sur une connexion lente. */}
      {slides.length === 0 ? (
        <Image
          src="/hero-fallback.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        slides.map((s, i) => (
          <Image
            key={s.id}
            src={s.imageUrl}
            alt=""
            fill
            priority={i === 0}
            loading={i === 0 ? undefined : 'lazy'}
            sizes="100vw"
            className={`object-cover transition-opacity duration-[400ms] ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))
      )}

      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/55 to-ink-900/10"
      />

      {/* Titre et bouton sont rendus immédiatement, sans animation d'entrée :
          c'est ce qui évite la page vide de plusieurs secondes. */}
      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
        <h1 className="font-display max-w-lg text-4xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-5xl">
          Le goût de Brazza, livré.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">
          Grillades, cuisines maison, boulangeries — livré chez toi à Brazzaville.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/restaurants"
            className="rounded-pill bg-tomato-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-tomato-700"
          >
            Commander maintenant
          </Link>
          <Link
            href="/restaurants"
            className="border-b-[1.5px] border-white/50 pb-0.5 text-sm text-white transition-colors hover:border-white"
          >
            Voir tous les vendeurs
          </Link>
        </div>
      </div>

      {slides.length >= 2 && (
        <div
          className="absolute inset-x-0 bottom-4 mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8"
          aria-live="polite"
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              className={`min-w-[9.5rem] shrink-0 rounded-xl px-3 py-2 text-left transition-colors ${
                i === active
                  ? 'border-2 border-tomato-500 bg-cream-100'
                  : 'bg-cream-100/70 hover:bg-cream-100/90'
              }`}
            >
              <span className="font-display block text-[13px] font-bold text-ink-900">
                {s.nom}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-500">
                {s.delay} · {s.adresse}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3 : Brancher le hero sur la home**

Dans `apps/web/app/(public)/page.tsx` : remplacer l'import et l'usage de `HeroSection` par `HeroSlider`, en lui passant la liste des vendeurs déjà récupérée par la page. Si la page ne dispose pas encore des vendeurs à cet endroit, réutiliser le même appel que celui qui alimente la section des vendeurs mis en avant plutôt que d'en ajouter un second.

```bash
rm apps/web/components/home/hero-section.tsx
```

- [ ] **Step 4 : Vérifier les trois états du hero**

```bash
pnpm --filter web dev
```

Ouvrir `http://localhost:3000` et contrôler :
1. **0 vendeur éligible** → `/hero-fallback.jpg`, titre et bouton visibles, **aucune carte, aucune rotation**.
2. **1 vendeur** (état réel de la production) → sa photo, **aucune carte, aucune rotation**.
3. **3 vendeurs et plus** → trois cartes, rotation toutes les 6 s, arrêt au survol, clic sur une carte qui change la photo.

Pour simuler les états 1 et 3 sans toucher à la base, passer temporairement un tableau construit à la main à `HeroSlider`, puis rétablir.

- [ ] **Step 5 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
pnpm --filter web test
```

- [ ] **Step 6 : Commit**

```bash
git add apps/web/components/home/hero-slider.tsx apps/web/public/hero-fallback.jpg apps/web/app/\(public\)/page.tsx
git rm apps/web/components/home/hero-section.tsx
git commit -m "feat(web): nouveau hero à slider de vendeurs, sans animation d'entrée"
```

---

## Task 6 : Catégories et catalogue de la home

**Files:**
- Modify: `apps/web/components/home/category-rail.tsx`
- Modify: `apps/web/components/home/featured-restaurants.tsx`
- Modify: `apps/web/lib/home-content.ts`

**Interfaces:**
- Consumes: tokens de Task 1.
- Produces: `HOME_CATEGORIES` conserve son nom mais **perd son champ `image`** et gagne `tone`. Aucune autre task ne consomme ce type.

- [ ] **Step 1 : Retirer les images de banque des catégories**

Dans `lib/home-content.ts`, remplacer l'interface et les données `HOME_CATEGORIES` :

```ts
export interface HomeCategory {
  type: VendorType;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Aplat de la tuile, tant qu'il n'y a pas de vraie photo. */
  tone: 'photo' | 'tomato' | 'cream' | 'ink';
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { type: 'RESTAURANT',    label: 'Restaurants',     tagline: 'Les saveurs du quartier',      icon: UtensilsCrossed, tone: 'photo'  },
  { type: 'HOME_COOK',     label: 'Cuisines maison', tagline: 'Le fait-main du quartier',     icon: CookingPot,      tone: 'tomato' },
  { type: 'BAKERY',        label: 'Boulangeries',    tagline: 'Pain chaud dès 6h',            icon: Croissant,       tone: 'cream'  },
  { type: 'BEVERAGE_SHOP', label: 'Boissons',        tagline: 'Fraîches, livrées',            icon: CupSoda,        tone: 'ink'    },
];
```

`GROCERY` reste exclu, comme aujourd'hui. Retirer les imports d'icônes devenus inutilisés (`CakeSlice`, et tout ce que le lint signalera).

- [ ] **Step 2 : Réécrire les tuiles de catégories**

Dans `category-rail.tsx`, produire une grille de 4 tuiles (`grid-cols-2 lg:grid-cols-4`, hauteur `h-28`), chacune un `Link` vers `/restaurants?vendorType=${type}`. Classes par `tone` :

```ts
const toneClasses: Record<HomeCategory['tone'], string> = {
  photo:  'bg-cream-300 text-ink-900',
  // tomato-600 et non 500 : du texte blanc de 14 px sur #EF4423 donne 3,8:1,
  // sous le seuil de 4,5:1 posé par les contraintes globales.
  tomato: 'bg-tomato-600 text-white',
  cream:  'bg-cream-200 text-ink-900',
  ink:    'bg-ink-900 text-cream-100',
};
```

Le libellé en `font-display font-bold text-sm`, la tagline en `text-[11px] opacity-80`, les deux alignés en bas de la tuile (`flex flex-col justify-end p-3`). Retirer les halos (`GlowOrb`) et toute animation d'apparition au défilement.

- [ ] **Step 3 : Réécrire la grille des vendeurs avec ses emplacements vides**

Dans `featured-restaurants.tsx`, après la grille des vendeurs réels, compléter jusqu'à 4 cases avec des emplacements :

```tsx
{Array.from({ length: Math.max(0, 4 - vendors.length) }).map((_, i) => (
  <div
    key={`empty-${i}`}
    aria-hidden
    className="grid min-h-[10.5rem] place-items-center rounded-xl border-[1.5px] border-dashed border-cream-300 bg-cream-200 text-[11.5px] text-ink-300"
  >
    {i === 0 ? 'Prochain vendeur ici' : ''}
  </div>
))}
```

Seul le premier emplacement porte le texte ; les suivants sont muets, avec une opacité décroissante si souhaité. Retirer les animations d'apparition au défilement.

- [ ] **Step 4 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
grep -rn "unsplash" apps/web/lib/home-content.ts
```

Attendu : build vert, `grep` sans résultat pour les catégories.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/home/category-rail.tsx apps/web/components/home/featured-restaurants.tsx apps/web/lib/home-content.ts
git commit -m "feat(web): catégories en aplats et emplacements vendeurs explicites"
```

---

## Task 7 : Suppression des sections à contenu fabriqué

**Files:**
- Delete: `apps/web/components/home/testimonials.tsx`
- Delete: `apps/web/components/home/app-download-banner.tsx`
- Delete: `apps/web/components/home/promo-strip.tsx`
- Modify: `apps/web/lib/home-content.ts`
- Modify: `apps/web/app/(public)/page.tsx`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Consumes: rien.
- Produces: rien.

- [ ] **Step 1 : Supprimer les trois composants et leurs données**

```bash
rm apps/web/components/home/testimonials.tsx \
   apps/web/components/home/app-download-banner.tsx \
   apps/web/components/home/promo-strip.tsx
```

Dans `lib/home-content.ts`, supprimer `HOME_PROMOS`, `HOME_TESTIMONIALS`, leurs interfaces, et les imports d'icônes devenus inutilisés.

Les témoignages étaient des avis **fabriqués** — avatars `i.pravatar.cc` et textes en dur — affichés comme réels. Ils sont retirés, pas redessinés.

- [ ] **Step 2 : Retirer les sections de la home**

Dans `app/(public)/page.tsx`, retirer les imports et les rendus de `PromoStrip`, `Testimonials`, `AppDownloadBanner`. Ordre final des sections :

```
<HeroSlider />
<CategoryRail />
<FeaturedRestaurants />
<HowItWorks />
<BecomePartner />
```

- [ ] **Step 3 : Fermer la porte aux images de banque**

Dans `next.config.ts`, retirer de `images.remotePatterns` les deux entrées `i.pravatar.cc` et `images.unsplash.com`, ainsi que leurs commentaires. Conserver `res.cloudinary.com`, `firebasestorage.googleapis.com` et `lh3.googleusercontent.com`.

Retirer ces hôtes garantit qu'aucune image de stock ne se réintroduise plus tard sans qu'on s'en aperçoive : `next/image` refusera le domaine.

- [ ] **Step 4 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
grep -rn "pravatar\|unsplash" apps/web --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Attendu : build vert et `grep` **totalement vide**. S'il reste une occurrence, c'est un composant hors home qui utilisait ces images : la traiter avant de committer.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/lib/home-content.ts apps/web/next.config.ts apps/web/app/\(public\)/page.tsx
git rm apps/web/components/home/testimonials.tsx apps/web/components/home/app-download-banner.tsx apps/web/components/home/promo-strip.tsx
git commit -m "feat(web): retrait des témoignages fabriqués, des promos en dur et du bandeau appli"
```

---

## Task 8 : Bande « Comment ça marche » et bloc partenaire

**Files:**
- Modify: `apps/web/components/home/how-it-works.tsx`
- Modify: `apps/web/components/home/become-partner.tsx`

**Interfaces:**
- Consumes: tokens de Task 1.
- Produces: rien.

- [ ] **Step 1 : Compacter « Comment ça marche »**

Réécrire en une bande unique `bg-cream-200`, `py-6`, contenant une grille `grid-cols-1 sm:grid-cols-3 gap-6`. Chaque étape : une pastille ronde `h-6 w-6 rounded-full bg-tomato-600 text-white text-xs font-extrabold` portant le numéro, puis titre `font-display text-sm font-bold` et description `text-[11.5px] text-ink-500`.

Contenu des trois étapes :
1. « Choisis ton vendeur » — « Restaurants, cuisines maison, boulangeries près de chez toi. »
2. « Paie en Mobile Money » — « MTN MoMo ou Airtel Money, confirmé en quelques minutes. »
3. « On te livre » — « Suivi de la commande jusqu'à ta porte. »

Retirer le titre de section, l'eyebrow en capitales espacées et les animations d'apparition.

- [ ] **Step 2 : Refaire le bloc partenaire**

Un bloc `rounded-2xl bg-tomato-600 text-white p-7`, en `flex` avec titre et texte à gauche, bouton à droite (`bg-white text-tomato-700 rounded-pill px-6 py-3 font-extrabold`), qui passe en colonne sous `sm`.

Le fond est `tomato-600`, pas `tomato-500` : le paragraphe de ce bloc fait 13 px, et du texte blanc de cette taille sur `#EF4423` ne donne que 3,8:1. Le paragraphe est en opacité pleine, sans `opacity-*` — une opacité réduite sur fond coloré repasse sous le seuil.

- Titre : « Tu cuisines ? Vends sur Lilia Food. »
- Texte : « Restaurant, cuisine maison, boulangerie ou boissons — inscris-toi, on s'occupe des commandes et de la livraison. »
- Bouton : « Devenir vendeur », vers la même destination qu'aujourd'hui.

Le texte du bouton est `text-tomato-700` sur blanc, pas `tomato-500` : c'est la contrainte de contraste.

- [ ] **Step 3 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
```

- [ ] **Step 4 : Commit**

```bash
git add apps/web/components/home/how-it-works.tsx apps/web/components/home/become-partner.tsx
git commit -m "feat(web): bande comment ça marche compacte et bloc partenaire"
```

---

## Task 9 : Page catalogue et filtres

**Files:**
- Modify: `apps/web/app/(public)/restaurants/page.tsx`
- Modify: `apps/web/components/restaurants/restaurants-filters.tsx`
- Modify: `apps/web/components/restaurants/vendor-type-chips.tsx`
- Modify: `apps/web/components/restaurants/restaurant-card.tsx`
- Modify: `apps/web/components/restaurants/vendor-card.tsx`
- Modify: `apps/web/components/restaurants/vendor-type-badge.tsx`
- Modify: `apps/web/components/restaurants/restaurant-grid.tsx`
- Modify: `apps/web/components/restaurants/vendor-grid.tsx`

**Interfaces:**
- Consumes: tokens de Task 1, `Button`/`Chip`/`Badge` de Task 2, les emplacements vides de Task 6.
- Produces: rien.

- [ ] **Step 1 : Refaire l'en-tête de page**

Dans `restaurants/page.tsx` : titre en `font-display text-3xl font-extrabold text-ink-900`, **sans italique, sans second membre coloré, sans eyebrow en capitales espacées**. Remplacer « Tous les vendeurs *de Brazza.* » par « Tous les vendeurs ». Sous-titre en `text-sm text-ink-500`.

- [ ] **Step 2 : Refaire les chips de filtre**

Dans `vendor-type-chips.tsx` et `restaurants-filters.tsx` :
- **Retirer les emojis** des libellés.
- Chip inactive : `border-[1.5px] border-cream-300 bg-cream-100 text-ink-700`.
- Chip active : `bg-tomato-600 text-white border-tomato-600`.
- Champ de recherche : `bg-white border-cream-300`, focus `border-tomato-500 ring-2 ring-tomato-100`.

- [ ] **Step 3 : Refaire les cartes vendeur**

Dans `restaurant-card.tsx` et `vendor-card.tsx` :
- Carte : `bg-white border border-cream-300 rounded-xl overflow-hidden`. Retirer l'effet de soulèvement au survol ; garder un simple passage de `shadow-sm` à `shadow-md`.
- Badge « Ouvert » : `bg-success text-white`. Badge « Fermé » : `bg-ink-300 text-white`.
- **Réduire les badges superposés à un seul.** Aujourd'hui « 🔥 Populaire » et « ⚡ Rapide » s'empilent en rose et orange sur la photo. Ne conserver que le plus significatif, dans un seul style : `bg-ink-900/80 text-white text-[10px] font-bold rounded-pill px-2 py-0.5`, sans emoji. Priorité : `Nouveau` > `Populaire` > `Rapide`.
- Nom en `font-display font-bold text-ink-900`, métadonnées en `text-[11px] text-ink-500`.
- Image manquante → aplat `bg-cream-200` portant l'initiale du vendeur en `font-display text-2xl text-ink-300`, jamais une icône d'image cassée.

- [ ] **Step 4 : Ajouter l'état d'échec de chargement**

Dans `restaurant-grid.tsx` / `vendor-grid.tsx`, si la requête échoue, afficher un `EmptyState` avec « Impossible de charger les vendeurs » et un bouton « Réessayer » qui relance la requête. **Ne jamais laisser une page blanche.**

- [ ] **Step 5 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
```

Puis, avec `pnpm --filter web dev`, contrôler `/restaurants` : filtres cliquables, carte du vendeur réel correcte, emplacements vides visibles.

- [ ] **Step 6 : Commit**

```bash
git add apps/web/app/\(public\)/restaurants/ apps/web/components/restaurants/
git commit -m "feat(web): catalogue vendeurs sur la nouvelle charte, badges réduits"
```

---

## Task 10 : Fiche vendeur

**Files:**
- Modify: `apps/web/components/restaurants/restaurant-hero.tsx`
- Modify: `apps/web/components/restaurants/restaurant-menu.tsx`
- Modify: `apps/web/components/restaurants/vendor-info-section.tsx`
- Modify: `apps/web/components/restaurants/restaurant-reviews.tsx`
- Modify: `apps/web/components/restaurants/operating-hours-list.tsx`
- Modify: `apps/web/components/restaurants/expandable-bio.tsx`

**Interfaces:**
- Consumes: tokens de Task 1, composants `ui/` de Task 2.
- Produces: rien.

- [ ] **Step 1 : Abaisser la couverture**

Dans `restaurant-hero.tsx`, réduire la hauteur de la photo de couverture à `h-48 sm:h-56` pour que le menu remonte au-dessus de la ligne de flottaison. Nom du vendeur en `font-display font-extrabold`, sur un voile `bg-gradient-to-t from-ink-900/85`.

- [ ] **Step 2 : Rehabiller le menu**

Dans `restaurant-menu.tsx` : cartes produit `bg-white border border-cream-300`, nom en `font-display font-bold text-ink-900`, **prix en `text-tomato-700 font-extrabold`** (le rouge de texte, pas le 500), en-têtes de catégorie en `font-display text-lg font-bold`. Produit épuisé : `opacity-60` et badge `bg-ink-300 text-white`.

- [ ] **Step 3 : Rehabiller les trois blocs restants**

`vendor-info-section.tsx`, `restaurant-reviews.tsx`, `operating-hours-list.tsx`, `expandable-bio.tsx` : appliquer la table de substitution de tokens de la Task 2, Step 2. Fond de section `bg-cream-100`, cartes `bg-white`, séparateurs `border-cream-300`. Les étoiles d'avis restent en `text-warning`.

- [ ] **Step 4 : Vérifier**

```bash
pnpm turbo lint type-check build --filter=web
```

Puis contrôler une fiche vendeur réelle en local.

- [ ] **Step 5 : Commit**

```bash
git add apps/web/components/restaurants/
git commit -m "feat(web): fiche vendeur sur la nouvelle charte, menu remonté"
```

---

## Task 11 : Vérification finale et nettoyage

**Files:**
- Modify: tout fichier révélé par les contrôles ci-dessous.

**Interfaces:**
- Consumes: l'ensemble des tasks précédentes.
- Produces: rien.

- [ ] **Step 1 : Vérifier qu'aucune trace de l'ancienne charte ne subsiste**

```bash
grep -rn "dark:" apps/web --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules
grep -rn "Fraunces\|pravatar\|unsplash" apps/web --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules
grep -rnE "ember-|noir-|glass-noir|GlowOrb|primary-[0-9]|charcoal-" apps/web --include="*.tsx" --include="*.css" | grep -v node_modules
```

Les trois doivent être **vides**. Chaque résultat est un composant oublié : le traiter avec la table de substitution de la Task 2.

- [ ] **Step 2 : Vérifier que `_ui.tsx` n'est plus utilisé**

```bash
grep -rn "from './_ui'\|from '@/components/home/_ui'" apps/web | grep -v node_modules
```

Si le résultat est vide, `components/home/_ui.tsx` (qui contient `GlowOrb`, `CountUp`, `usePointerParallax` — le vocabulaire visuel qu'on retire) est mort : `rm apps/web/components/home/_ui.tsx`. S'il reste des usages, les traiter d'abord.

- [ ] **Step 3 : Chaîne complète**

```bash
pnpm turbo lint type-check build --filter=web
pnpm --filter web test
```

Tout doit être vert.

- [ ] **Step 4 : Contrôle visuel aux trois largeurs**

Avec `pnpm --filter web dev`, contrôler **360 px, 768 px et 1440 px** sur `/`, `/restaurants` et une fiche vendeur. Points à vérifier :
- aucun défilement horizontal de la page ;
- les cartes vendeurs du hero défilent horizontalement sur mobile sans déborder ;
- le fond est bien crème partout, jamais blanc ;
- aucun texte rouge `#EF4423` sur crème (doit être `#B8300F`) ;
- aucun bouton `#EF4423` à texte blanc (doit être `#D2371A`).

- [ ] **Step 5 : Contrôle des écrans hérités**

Ouvrir panier, commandes, profil, favoris et connexion. Ils ne sont pas redessinés, mais doivent avoir **changé de couleurs sans être cassés** : pas de texte illisible, pas de fond resté sombre, pas de bouton invisible. Corriger uniquement les défauts de lisibilité — **ne pas refondre ces écrans**.

- [ ] **Step 6 : Commit final**

```bash
git add -A
git commit -m "chore(web): nettoyage final de l'ancienne charte et vérifications"
```

---

## Ce que ce plan ne fait pas

- **Il ne refond pas le tunnel de commande.** Panier, commandes, profil, favoris et authentification héritent des tokens, rien de plus.
- **Il ne touche pas à `apps/admin`.**
- **Il n'introduit pas de tests de composants.** Vitest n'est ajouté que pour `selectHeroSlides`, la seule logique de la refonte. Monter une infrastructure de tests de rendu React est un chantier distinct.
- **Il ne fournit pas les photos.** Task 5 dépose une photo de repli ; les visuels définitifs viennent du founder et se substituent sans changement de code.
