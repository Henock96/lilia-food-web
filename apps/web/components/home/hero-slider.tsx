'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Bike, MapPin, Pause, Play, Search, Smartphone } from 'lucide-react';
import type { HeroBannerSlide } from '@/lib/hero-slides';

/** Intervalle de rotation. Assez lent pour qu'on ait le temps de lire. */
const ROTATE_MS = 6000;

/**
 * Titre principal de la page d'accueil — stable, quel que soit le slide
 * affiché. Il porte à la fois le message de marque et l'ancrage
 * géographique, absent du `h1` précédent alors que Brazzaville est le mot
 * décisif pour le référencement local.
 */
const SITE_HEADLINE = 'Commande tes repas à Brazzaville, on te les livre.';

/**
 * Accroche factuelle : elle dit ce que fait Lilia Food (commander, payer en
 * Mobile Money, suivre) et ne cite que ce qui existe. Une version précédente
 * affirmait « tout est livré » et citait des boulangeries absentes du
 * catalogue.
 */
const SITE_SUBHEADLINE =
  'Restaurants et cuisines maison sur une seule app. Paie en MTN MoMo ou Airtel Money, suis ta commande en temps réel, ou récupère-la sur place.';

export function HeroSlider({
  slides,
  pending = false,
  activity,
}: {
  slides: HeroBannerSlide[];
  pending?: boolean;
  activity?: string;
}) {
  const reduced = useReducedMotion();
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Deux causes de pause distinctes. Un état unique faisait qu'en sortant la
  // souris de la section on relançait le défilement alors que la personne
  // venait de cliquer sur « pause » : son choix explicite était écrasé par un
  // simple mouvement de souris.
  const [pausedByUser, setPausedByUser] = useState(false);
  const [hovered, setHovered] = useState(false);

  const slideCount = slides.length;
  // Les bannières peuvent être retirées pendant que le carrousel est affiché.
  const active = selectedIndex < slideCount ? selectedIndex : 0;
  if (active !== selectedIndex) setSelectedIndex(active);
  const rotating = slideCount > 1 && !reduced && !pausedByUser && !hovered;

  useEffect(() => {
    if (!rotating) return;
    const id = setInterval(() => setSelectedIndex((i) => (i + 1) % slideCount), ROTATE_MS);
    return () => clearInterval(id);
  }, [rotating, slideCount]);

  // Ne monter que le slide actif et, au plus, le suivant (préchargé pour
  // une transition immédiate) : jamais plus de 2 <Image> en concurrence.
  const mountedIndexes = slideCount > 0 ? new Set([active, (active + 1) % slideCount]) : [];

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
      className="bg-[#faf7f2]"
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-16">
        <div className="flex min-w-0 flex-col items-start">
          {activity && (
            <span className="rounded-pill bg-tomato-50 text-tomato-700 mb-4 px-3 py-1.5 text-sm font-semibold">
              {activity}
            </span>
          )}
          <h1 className="font-display text-ink-900 text-[clamp(2.35rem,4.5vw,3.5rem)] leading-[1.04] font-extrabold tracking-tight">
            Commande tes repas <span className="text-tomato-600 block">à Brazzaville,</span>
            on te les livre.
          </h1>
          <p className="text-ink-500 mt-5 max-w-md text-base leading-relaxed">
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
            className="border-cream-300 focus-within:ring-tomato-600 mt-6 flex w-full max-w-xl items-center gap-1 rounded-2xl border bg-white p-1.5 shadow-sm focus-within:ring-2"
          >
            <label htmlFor="hero-recherche" className="sr-only">
              Rechercher un vendeur ou une spécialité
            </label>
            <Search className="text-ink-500 ml-3 h-4 w-4 shrink-0" aria-hidden />
            <input
              id="hero-recherche"
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Vendeur ou spécialité…"
              // `w-0` : un `<input>` a une largeur propre (~200 px ici) qui
              // imposait 349 px au formulaire, donc à toute la colonne, et
              // faisait déborder la page à 360 px (UX-01). `flex-1` l'étire.
              className="text-ink-900 placeholder:text-ink-500 min-h-11 w-0 min-w-0 flex-1 bg-transparent px-2 text-base focus:outline-none"
            />
            <button
              type="submit"
              data-analytics-id="order_cta_click"
              className="bg-tomato-600 hover:bg-tomato-700 focus-visible:ring-tomato-600 min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none! sm:px-5"
            >
              Chercher
            </button>
          </form>
          <ul
            className="text-ink-500 mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
            aria-label="Services"
          >
            <li className="flex items-center gap-1.5">
              <Smartphone className="text-tomato-600 size-4" aria-hidden /> Mobile Money
            </li>
            <li className="flex items-center gap-1.5">
              <Bike className="text-tomato-600 size-4" aria-hidden /> Livraison et retrait
            </li>
            <li className="flex items-center gap-1.5">
              <MapPin className="text-tomato-600 size-4" aria-hidden /> Brazzaville
            </li>
          </ul>
          {bannerHeadline && !offerLink && (
            <p aria-live="polite" className="text-tomato-700 mt-3 text-sm font-semibold">
              {bannerHeadline}
            </p>
          )}
          {offerLink && (
            <Link
              href={offerLink}
              className="text-tomato-700 mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
            >
              {bannerHeadline || 'Voir l’offre en cours'}
            </Link>
          )}

          {/* Contrôles du carrousel.
            WCAG 2.2.2 (Pause, Stop, Hide) : tout contenu qui défile
            automatiquement plus de cinq secondes doit offrir un moyen de
            l'arrêter. Le seul mécanisme existant était la mise en pause au
            survol de la souris — inopérante au tactile, où se trouve pourtant
            l'essentiel de l'audience. Rien n'indiquait non plus qu'il y avait
            plusieurs bannières. */}
          {slideCount > 1 && (
            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPausedByUser((p) => !p)}
                aria-label={
                  pausedByUser ? 'Reprendre le défilement' : 'Mettre le défilement en pause'
                }
                className="group/ctl flex h-11 w-11 items-center justify-center rounded-full focus:outline-none!"
              >
                <span className="bg-ink-900/60 group-hover/ctl:bg-ink-900/80 group-focus-visible/ctl:ring-tomato-600 flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors group-focus-visible/ctl:ring-2">
                  {pausedByUser ? (
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Pause className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
              </button>

              <div className="flex items-center" role="tablist" aria-label="Bannières">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    aria-label={`Bannière ${i + 1} sur ${slideCount}`}
                    onClick={() => setSelectedIndex(i)}
                    className="group/dot flex h-11 min-w-8 items-center justify-center focus:outline-none!"
                  >
                    {/* Point visuel inchangé ; la zone tactile, elle, fait 44 px
                      de haut (elle faisait 10 × 10 px). */}
                    <span
                      aria-hidden
                      className={`group-focus-visible/dot:ring-tomato-600 block h-2.5 rounded-full transition-[width,background-color] group-focus-visible/dot:ring-2 ${
                        i === active
                          ? 'bg-tomato-600 w-6'
                          : 'bg-ink-300 group-hover/dot:bg-ink-500 w-2.5'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Place de la rangée de contrôles : apparue à l'arrivée des
            bannières, elle repoussait encore l'image de 52 px. */}
          {pending && <div className="mt-2 h-11" aria-hidden />}
        </div>

        {(pending || slideCount > 0) && (
          <div className="bg-cream-200 relative aspect-[16/11] w-full overflow-hidden rounded-2xl shadow-md">
            {Array.from(mountedIndexes, (i) => {
              const s = slides[i];
              return (
                <Image
                  key={s.id}
                  src={s.imageUrl}
                  alt=""
                  fill
                  // Image LCP de l'accueil. `priority` (déprécié en Next 16) ne
                  // posait pas `fetchpriority` : elle partait en priorité basse,
                  // derrière les scripts, et son préchargement arrivait au milieu
                  // du HTML streamé (audit du 06/11/2026, PERF-03).
                  loading={i === 0 ? 'eager' : undefined}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className={`object-cover transition-opacity duration-[400ms] ${
                    i === active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
