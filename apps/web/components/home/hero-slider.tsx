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
const SITE_HEADLINE = 'Commande tes repas à Brazzaville, on te les livre.';

/**
 * Accroche factuelle : elle dit ce que fait Lilia Food (commander, payer en
 * Mobile Money, suivre) et ne cite que ce qui existe. Une version précédente
 * affirmait « tout est livré » et citait des boulangeries absentes du
 * catalogue.
 */
const SITE_SUBHEADLINE =
  'Restaurants et cuisines maison sur une seule app. Paie en MTN MoMo ou Airtel Money, suis ta commande en temps réel, ou récupère-la sur place.';

/**
 * Hero de la home. `slides` est calculé côté serveur (voir
 * `app/(public)/page.tsx`) : `fetchBanners()` récupère les bannières actives
 * depuis le backend. Ce composant ne fait aucun appel réseau — il ne fait
 * que rendre ce qu'on lui donne.
 *
 * Le texte vit sur un aplat `tomato-600`, jamais sur l'image : les bannières
 * portent leur propre texte, et deux voiles sombres n'empêchaient pas les deux
 * messages de se superposer. L'image est à côté du texte, ou dessous sur
 * mobile.
 *
 * Modes :
 * - 0 slide → texte seul.
 * - 1 slide → image fixe.
 * - 2+ slides → rotation auto entre les slides.
 *
 * `pending` : repli affiché pendant que les bannières arrivent. Il réserve la
 * place de l'image ; sans elle, leur arrivée poussait la suite de la page de
 * 308 px (CLS 0,18 en visite de retour, audit du 06/11/2026, PERF-04).
 *
 * ⚠️ La réservation suppose au moins deux bannières (quatre en production le
 * 08/11/2026) : avec une seule, la rangée de contrôles n'existe pas et la page
 * se contracte de 52 px ; sans bannière, de tout le bloc image. Le repli ne
 * peut pas connaître ce nombre avant les données.
 */
export function HeroSlider({
  slides,
  pending = false,
}: {
  slides: HeroBannerSlide[];
  pending?: boolean;
}) {
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
      className="bg-tomato-600"
      aria-label="Accueil Lilia Food"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-10 lg:grid-cols-2 lg:gap-12 lg:px-16 lg:py-14">
      {/* Titre et bouton sont rendus immédiatement, sans animation d'entrée :
          c'est ce qui évite la page vide de plusieurs secondes. */}
      <div className="flex w-full flex-col items-start">
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
            // `w-0` : un `<input>` a une largeur propre (~200 px ici) qui
            // imposait 349 px au formulaire, donc à toute la colonne, et
            // faisait déborder la page à 360 px (UX-01). `flex-1` l'étire.
            className="min-h-11 w-0 min-w-0 flex-1 bg-transparent px-2 text-base text-ink-900 placeholder:text-ink-500 focus:outline-none"
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
        {/* Place de la rangée de contrôles : apparue à l'arrivée des
            bannières, elle repoussait encore l'image de 52 px. */}
        {pending && !hasImage && <div className="mt-2 h-11" aria-hidden />}
      </div>

      {pending && !hasImage && (
        <div className="aspect-[16/10] w-full rounded-2xl bg-white/10" aria-hidden />
      )}
      {hasImage && (
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
          {mountedIndexes.map((i) => {
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
