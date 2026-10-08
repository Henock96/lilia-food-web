'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play, Search } from 'lucide-react';
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

/**
 * Accroche factuelle : la marketplace réunit plusieurs types de vendeurs, et
 * chacun propose la livraison, le retrait ou les deux. L'ancienne version
 * affirmait « tout est livré » et citait des boulangeries absentes du
 * catalogue.
 */
const SITE_SUBHEADLINE =
  'Restaurants, cuisines maison et boutiques de Brazzaville, au même endroit. Livraison ou retrait, selon le vendeur.';

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

  // Lien de la bannière active, s'il mène ailleurs que le catalogue. Saisi en
  // administration : on n'accepte qu'un chemin interne ou une URL https.
  const bannerLink = currentSlide?.linkUrl;
  const offerLink =
    bannerLink &&
    bannerLink !== '/restaurants' &&
    ((bannerLink.startsWith('/') && !bannerLink.startsWith('//')) ||
      bannerLink.startsWith('https://'))
      ? bannerLink
      : null;

  return (
    <section
      className={`relative flex min-h-[28rem] overflow-hidden sm:min-h-[30rem] ${hasImage ? '' : 'bg-tomato-600'}`}
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
      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-start justify-end px-4 pb-8 pt-16 sm:px-10 lg:px-16">
        {/* Le titre de la bannière s'affiche ici, au-dessus du h1, et non
            DANS le h1. Auparavant le h1 prenait la valeur du slide actif : il
            changeait donc toutes les six secondes. Un titre de niveau 1 est
            censé décrire la page — le voir muter brouille le message pour
            Google comme pour un lecteur d'écran. `aria-live="polite"`
            annonce désormais le changement au lieu de le taire. */}
        {bannerHeadline && (
          <span
            aria-live="polite"
            className="mb-3 inline-flex rounded-pill bg-ink-900/70 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
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
        {/* Recherche : le geste que l'accueil n'offrait pas. Un simple
            formulaire GET vers le catalogue — il fonctionne sans JavaScript,
            et l'URL obtenue se partage. Il cherche des vendeurs (nom,
            spécialité, adresse) ; il ne promet pas de chercher des plats tant
            que la recherche produit n'existe pas sur le site. */}
        <form
          action="/restaurants"
          role="search"
          className="mt-6 flex w-full max-w-xl items-center gap-1 rounded-pill bg-white p-1.5 shadow-lg"
        >
          <label htmlFor="hero-recherche" className="sr-only">
            Rechercher un vendeur ou une spécialité
          </label>
          <Search className="ml-3 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
          <input
            id="hero-recherche"
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder="Vendeur ou spécialité…"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-ink-900 placeholder:text-ink-500 focus:outline-none"
          />
          <button
            type="submit"
            data-analytics-id="order_cta_click"
            className="min-h-11 shrink-0 rounded-pill bg-tomato-600 px-5 text-sm font-bold text-white transition-colors hover:bg-tomato-700 focus-visible:outline-none! focus-visible:ring-2 focus-visible:ring-tomato-600 focus-visible:ring-offset-2"
          >
            Chercher
          </button>
        </form>
        <Link
          href={offerLink ?? '/restaurants'}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-white/60 underline-offset-4 hover:decoration-white"
        >
          {offerLink ? 'Voir l’offre en cours' : 'ou parcourir tous les vendeurs'}
        </Link>

        {/* Contrôles du carrousel.
            WCAG 2.2.2 (Pause, Stop, Hide) : tout contenu qui défile
            automatiquement plus de cinq secondes doit offrir un moyen de
            l'arrêter. Le seul mécanisme existant était la mise en pause au
            survol de la souris — inopérante au tactile, où se trouve pourtant
            l'essentiel de l'audience. Rien n'indiquait non plus qu'il y avait
            plusieurs bannières. */}
        {slides.length >= 2 && (
          <div className="mt-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPausedByUser((p) => !p)}
              aria-label={
                pausedByUser ? 'Reprendre le défilement' : 'Mettre le défilement en pause'
              }
              className="group/ctl flex h-11 w-11 items-center justify-center rounded-full focus:outline-none!"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/60 text-white transition-colors group-hover/ctl:bg-ink-900/80 group-focus-visible/ctl:ring-2 group-focus-visible/ctl:ring-white">
                {pausedByUser ? <Play className="h-3.5 w-3.5" aria-hidden /> : <Pause className="h-3.5 w-3.5" aria-hidden />}
              </span>
            </button>

            <div className="flex items-center" role="tablist" aria-label="Bannières">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Bannière ${i + 1} sur ${slides.length}`}
                  onClick={() => setActive(i)}
                  className="group/dot flex h-11 min-w-8 items-center justify-center focus:outline-none!"
                >
                  {/* Point visuel inchangé ; la zone tactile, elle, fait 44 px
                      de haut (elle faisait 10 × 10 px). */}
                  <span
                    aria-hidden
                    className={`block h-2.5 rounded-full transition-[width,background-color] group-focus-visible/dot:ring-2 group-focus-visible/dot:ring-white ${
                      i === active ? 'w-6 bg-white' : 'w-2.5 bg-white/60 group-hover/dot:bg-white/80'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
