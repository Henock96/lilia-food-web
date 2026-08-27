'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import type { HeroBannerSlide } from '@/lib/hero-slides';

/** Intervalle de rotation. Assez lent pour qu'on ait le temps de lire. */
const ROTATE_MS = 6000;

/**
 * Hero de la home. `slides` est calculé côté serveur (voir
 * `app/(public)/page.tsx`) : `fetchBanners()` récupère les bannières actives
 * depuis le backend. Ce composant ne fait aucun appel réseau — il ne fait
 * que rendre ce qu'on lui donne.
 *
 * Modes :
 * - 0 slide → bannière statique, aplat `tomato-600`.
 * - 1 slide → bannière statique avec image en fond.
 * - 2+ slides → cartes cliquables en bas, rotation auto entre les slides.
 *   L'image active sert de fond, overlay sombre pour la lisibilité.
 */
export function HeroSlider({ slides }: { slides: HeroBannerSlide[] }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const hasImage = slides.length > 0;
  const rotating = hasImage && slides.length >= 2 && !reduced && !paused;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [rotating, slides.length]);

  // Ne monter que le slide actif et, au plus, le suivant (préchargé pour
  // une transition immédiate) : jamais plus de 2 <Image> en concurrence.
  const mountedIndexes = hasImage
    ? Array.from(new Set([active, (active + 1) % slides.length]))
    : [];

  const currentSlide = slides[active];

  return (
    <section
      className={`relative h-[24rem] overflow-hidden sm:h-[28rem] ${hasImage ? '' : 'bg-tomato-600'}`}
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {hasImage && (
        <>
          {mountedIndexes.map((i) => {
            const s = slides[i];
            return (
              <Image
                key={s.id}
                src={s.imageUrl}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className={`object-cover transition-opacity duration-[400ms] ${
                  i === active ? 'opacity-100' : 'opacity-0'
                }`}
              />
            );
          })}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/20 to-transparent"
          />
        </>
      )}

      {/* Titre et bouton sont rendus immédiatement, sans animation d'entrée :
          c'est ce qui évite la page vide de plusieurs secondes. */}
      <div className="relative mx-auto flex h-full max-w-7xl flex-col items-start justify-end pb-10 px-6 sm:px-10 lg:px-16">
        <h1 className="font-display max-w-xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl">
          {currentSlide?.title ?? "T'as faim ? On te livre !"}
        </h1>
        <p
          className={`mt-3 max-w-md text-sm leading-relaxed sm:text-base ${
            hasImage ? 'text-white/85' : 'text-white'
          }`}
        >
          {currentSlide?.description || 'La marketplace locale qui connecte les meilleurs vendeurs de Brazzaville à ta porte. Restaurant, cuisine maison, boulangerie — tout est livré.'}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href={currentSlide?.linkUrl ?? '/restaurants'}
            className={
              hasImage
                ? 'rounded-pill bg-tomato-600 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-tomato-700'
                : 'rounded-pill bg-white px-8 py-3.5 text-base font-bold text-tomato-700 transition-colors hover:bg-cream-100'
            }
          >
            Commander maintenant
          </Link>

        </div>
      </div>

      
    </section>
  );
}
