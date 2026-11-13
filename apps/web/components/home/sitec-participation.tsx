import Image from 'next/image';
import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react';

/**
 * URL officielle du salon. Le logo et la photo de salle de
 * `public/sitec/` viennent de ce site (bannière d'accueil et en-tête).
 */
const SITEC_URL = 'https://sitec.cg/';

/**
 * Faits repris tels quels de sitec.cg (édition 2026). Ne rien y ajouter qui
 * n'y figure pas : prix, classement ou chiffre de fréquentation propre à
 * Lilia Food seraient des promesses que personne ne peut vérifier.
 */
const FACTS = [
  { icon: CalendarDays, label: '11 et 12 novembre 2026' },
  { icon: MapPin, label: 'Pointe-Noire · IFC & Hôtel Elaïs' },
  { icon: Users, label: '500+ participants · 3ᵉ édition' },
];

/**
 * « Lilia Food au SITEC » — preuve sociale en bas de page d'accueil.
 *
 * Le fond reprend la photo de salle de sitec.cg, déjà assombrie en indigo
 * par le salon ; le voile `#0E0B45` (indigo du SITEC) la pousse assez pour
 * que le texte blanc dépasse 7:1 partout. Le logo SITEC est blanc sur
 * transparent : il n'existe pas en version claire.
 */
export function SitecParticipation() {
  return (
    <section aria-labelledby="sitec-titre" className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-2xl bg-[#0E0B45]">
          <Image
            src="/sitec/salle-conference.jpg"
            alt=""
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0E0B45] via-[#0E0B45]/85 to-[#0E0B45]/20" />

          <div className="grid gap-10 p-8 text-white sm:p-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:p-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                Startup innovante · Made in Congo
              </p>
              <h2
                id="sitec-titre"
                className="mt-5 font-display text-3xl font-extrabold leading-tight sm:text-4xl"
              >
                Lilia Food au SITEC 2026
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white sm:text-base">
                Nous avons présenté Lilia Food sur notre stand au Salon de
                l&apos;Innovation, de la Technologie et de l&apos;Entrepreneuriat au
                Congo, organisé par la Fondation BantuHub sur le thème
                «&nbsp;Jeunesse et entrepreneuriat&nbsp;». Une vitrine pour montrer
                qu&apos;une plateforme de commande pensée au Congo, pour les
                vendeurs d&apos;ici, peut rivaliser avec les meilleures.
              </p>

              <ul className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6">
                {FACTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-white">
                    <Icon className="h-4 w-4 shrink-0 text-tomato-200" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>

              <a
                href={SITEC_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-id="sitec_link_click"
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-pill bg-white px-7 py-3 text-sm font-extrabold text-[#0E0B45] transition-colors hover:bg-cream-100"
              >
                Découvrir le SITEC
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>

            <div className="flex flex-col items-center gap-6 rounded-2xl bg-white/5 p-8 text-center ring-1 ring-white/15 backdrop-blur-sm">
              <Image
                src="/sitec/logo-sitec.png"
                alt="SITEC — Salon de l'Innovation, de la Technologie et de l'Entrepreneuriat au Congo"
                width={510}
                height={86}
                className="h-auto w-56 sm:w-64"
              />
              <div className="h-px w-16 bg-white/30" aria-hidden />
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.jpg"
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div className="text-left leading-tight">
                  <p className="text-xs font-medium uppercase tracking-wider text-white">
                    Exposant
                  </p>
                  <p className="font-display text-lg font-extrabold">Lilia Food</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
