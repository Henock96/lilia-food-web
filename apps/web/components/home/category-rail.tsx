import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HOME_CATEGORIES } from '@/lib/home-content';
import { getVendorFacets } from '@/lib/vendors';

/**
 * Univers de la marketplace — l'entrée « par envie » vers le catalogue filtré.
 *
 * Une tuile n'apparaît que si le serveur compte au moins un vendeur de ce
 * type, et elle dit combien. L'accueil proposait « Boulangeries » alors
 * qu'aucune boulangerie n'est publiée : la tuile menait à un filtre vide.
 *
 * Si les compteurs sont indisponibles, on garde les quatre univers sans
 * chiffre plutôt que de faire disparaître la section — c'est une navigation,
 * pas une affirmation.
 */
export function CategoryRail() {
  return (
    <section aria-labelledby="univers-titre" className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2
          id="univers-titre"
          className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
        >
          Qu&apos;est-ce qui te ferait plaisir&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Choisis un univers, on te montre qui le sert à Brazzaville.
        </p>
        <Suspense fallback={<TilesFallback />}>
          <Tiles />
        </Suspense>
      </div>
    </section>
  );
}

const TILES_CLASSNAME = 'mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]';

async function Tiles() {
  const facets = await getVendorFacets();
  const categories =
    facets.status === 'ok'
      ? HOME_CATEGORIES.filter((c) => facets.value.byType[c.type] > 0)
      : HOME_CATEGORIES;
  if (categories.length === 0) return null;

  return (
    <ul role="list" className={TILES_CLASSNAME}>
      {categories.map((c) => {
        const count = facets.status === 'ok' ? facets.value.byType[c.type] : null;
        return (
          <li key={c.type}>
            <Link
              href={`/restaurants?vendorType=${c.type}`}
              className="group relative flex h-28 flex-col justify-end overflow-hidden rounded-xl p-3.5 focus-visible:outline-none! focus-visible:ring-2 focus-visible:ring-tomato-600 focus-visible:ring-offset-2 sm:h-32"
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-[filter] duration-200 group-hover:brightness-110"
              />
              {/* Voile de lisibilité du texte blanc, pas une décoration. */}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/35 to-transparent" />
              <span className="relative font-display text-base font-bold text-white">
                {c.label}
              </span>
              <span className="relative text-[13px] text-white/90">
                {count !== null ? `${count} vendeur${count > 1 ? 's' : ''} · ` : ''}
                {c.tagline}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TilesFallback() {
  return (
    <div className={TILES_CLASSNAME} aria-hidden>
      {HOME_CATEGORIES.slice(0, 3).map((c) => (
        <div key={c.type} className="skeleton h-28 rounded-xl sm:h-32" />
      ))}
    </div>
  );
}
