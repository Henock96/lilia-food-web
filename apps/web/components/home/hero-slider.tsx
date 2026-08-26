'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import type { HeroSlide } from '@/lib/hero-slides';
import type { HeroMode } from '@/lib/hero-mode';

/** Intervalle de rotation. Assez lent pour qu'on ait le temps de lire. */
const ROTATE_MS = 6000;

/**
 * Hero de la home. `slides` et `mode` sont calculés côté serveur (voir
 * `app/(public)/page.tsx`) : `selectHeroSlides()` pour les vendeurs
 * éligibles, `getHeroMode()` pour savoir si la photo du premier est assez
 * grande pour servir de fond plein écran. Ce composant ne fait aucun appel
 * réseau — il ne fait que rendre ce qu'on lui donne.
 *
 * Trois volumes de slides, deux modes de fond :
 * - 0 ou 1 slide → bannière statique, aucune carte, aucune rotation.
 * - 2+ slides → cartes cliquables + rotation automatique (pause au survol
 *   ou au focus, désactivée si `prefers-reduced-motion`).
 * - `mode: 'photo'` → la ou les photos servent de fond.
 * - `mode: 'flat'` → aplat `tomato-500` : pas d'image trop petite agrandie
 *   en flou sur l'élément le plus visible du site. Les cartes, elles,
 *   restent affichées selon la même règle dans les deux modes.
 */
export function HeroSlider({ slides, mode }: { slides: HeroSlide[]; mode: HeroMode }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // En dessous de 2 vendeurs il n'y a rien à faire tourner : le hero devient
  // une simple bannière statique. C'est l'état du site au lancement, pas un
  // cas dégradé.
  const rotating = slides.length >= 2 && !reduced && !paused;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [rotating, slides.length]);

  const isPhoto = mode === 'photo' && slides.length > 0;

  return (
    <section
      className={`relative h-[19rem] overflow-hidden sm:h-[22rem] ${isPhoto ? '' : 'bg-tomato-500'}`}
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {isPhoto && (
        <>
          {/* Seule la première image est prioritaire ; les suivantes ne
              doivent pas concurrencer le LCP sur une connexion lente. */}
          {slides.map((s, i) => (
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
          ))}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/55 to-ink-900/10"
          />
        </>
      )}

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
            className={
              isPhoto
                ? 'rounded-pill bg-tomato-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-tomato-700'
                : 'rounded-pill bg-white px-6 py-3 text-sm font-bold text-tomato-700 transition-colors hover:bg-cream-100'
            }
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
