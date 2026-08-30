'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import type { HeroBannerSlide } from '@/lib/hero-slides';

/** Intervalle de rotation. Assez lent pour qu'on ait le temps de lire. */
const ROTATE_MS = 6000;

/**
 * Titre principal de la page d'accueil — stable, quel que soit le slide
 * affiché. Il porte à la fois le message de marque et l'ancrage
 * géographique, absent du `h1` précédent alors que Brazzaville est le mot
 * décisif pour le référencement local.
 */
const SITE_HEADLINE = "T'as faim ? On te livre à Brazzaville.";

const SITE_SUBHEADLINE =
  'La marketplace locale qui connecte les meilleurs vendeurs de Brazzaville à ta porte. Restaurant, cuisine maison, boulangerie — tout est livré.';

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
  // Deux causes de pause distinctes. Un état unique faisait qu'en sortant la
  // souris de la section on relançait le défilement alors que la personne
  // venait de cliquer sur « pause » : son choix explicite était écrasé par un
  // simple mouvement de souris.
  const [pausedByUser, setPausedByUser] = useState(false);
  const [hovered, setHovered] = useState(false);

  const hasImage = slides.length > 0;
  const rotating =
    hasImage && slides.length >= 2 && !reduced && !pausedByUser && !hovered;

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

  // Le titre de bannière n'est affiché que s'il apporte quelque chose : les
  // bannières sans titre héritaient d'un texte de repli identique au h1, ce
  // qui affichait deux fois la même phrase.
  const bannerHeadline =
    currentSlide?.title && currentSlide.title !== SITE_HEADLINE ? currentSlide.title : null;

  return (
    <section
      className={`relative h-[24rem] overflow-hidden sm:h-[28rem] ${hasImage ? '' : 'bg-tomato-600'}`}
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
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
          {/* Deux voiles superposés. L'ancien dégradé seul retombait à 20 %
              d'opacité en milieu de hauteur, exactement là où se trouvent le
              titre et le paragraphe : le texte blanc passait sur des zones
              claires de la bannière, parfois sur du texte incrusté dans
              l'image. Le voile plat garantit un plancher de contraste sur
              toute la surface, le dégradé garde la profondeur en bas. */}
          <div aria-hidden className="absolute inset-0 bg-ink-900/45" />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/25 to-transparent"
          />
        </>
      )}

      {/* Titre et bouton sont rendus immédiatement, sans animation d'entrée :
          c'est ce qui évite la page vide de plusieurs secondes. */}
      <div className="relative mx-auto flex h-full max-w-7xl flex-col items-start justify-end pb-10 px-6 sm:px-10 lg:px-16">
        {/* Le titre de la bannière s'affiche ici, au-dessus du h1, et non
            DANS le h1. Auparavant le h1 prenait la valeur du slide actif : il
            changeait donc toutes les six secondes. Un titre de niveau 1 est
            censé décrire la page — le voir muter brouille le message pour
            Google comme pour un lecteur d'écran. `aria-live="polite"`
            annonce désormais le changement au lieu de le taire. */}
        {bannerHeadline && (
          <span
            aria-live="polite"
            className="mb-3 inline-flex rounded-pill bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm"
          >
            {bannerHeadline}
          </span>
        )}
        <h1 className="font-display max-w-xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl">
          {SITE_HEADLINE}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white sm:text-base">
          {currentSlide?.description || SITE_SUBHEADLINE}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <Link
            href={currentSlide?.linkUrl ?? '/restaurants'}
            data-analytics-id="order_cta_click"
            className={
              hasImage
                ? 'rounded-pill bg-tomato-600 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-tomato-700'
                : 'rounded-pill bg-white px-8 py-3.5 text-base font-bold text-tomato-700 transition-colors hover:bg-cream-100'
            }
          >
            Commander maintenant
          </Link>
        </div>

        {/* Contrôles du carrousel.
            WCAG 2.2.2 (Pause, Stop, Hide) : tout contenu qui défile
            automatiquement plus de cinq secondes doit offrir un moyen de
            l'arrêter. Le seul mécanisme existant était la mise en pause au
            survol de la souris — inopérante au tactile, où se trouve pourtant
            l'essentiel de l'audience. Rien n'indiquait non plus qu'il y avait
            plusieurs bannières. */}
        {slides.length >= 2 && (
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPausedByUser((p) => !p)}
              aria-label={
                pausedByUser ? 'Reprendre le défilement' : 'Mettre le défilement en pause'
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/50 text-white transition-colors hover:bg-ink-900/70 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {pausedByUser ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Bannières">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Bannière ${i + 1} sur ${slides.length}`}
                  onClick={() => setActive(i)}
                  className={`h-2.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${
                    i === active ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
