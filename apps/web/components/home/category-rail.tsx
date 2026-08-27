import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { HOME_CATEGORIES, type HomeCategory } from '@/lib/home-content';

/**
 * Tuiles catégorie avec image de fond + overlay sombre pour la lisibilité.
 * L'icône reste visible en haut à gauche, le label et la tagline en bas.
 */
export function CategoryRail() {
  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Quatre univers, une seule faim
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Du resto du quartier au pain chaud du matin.
            </p>
          </div>
          <Link
            href="/restaurants"
            className="group hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-tomato-700 transition-colors hover:text-tomato-600 sm:inline-flex"
          >
            Tout explorer
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {HOME_CATEGORIES.map((c) => (
            <Link
              key={c.type}
              href={`/restaurants?vendorType=${c.type}`}
              aria-label={`${c.label} — ${c.tagline}`}
              className="group relative flex h-32 flex-col justify-end overflow-hidden rounded-xl p-3 transition-opacity hover:opacity-90"
            >
              <Image
                src={c.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/30 to-transparent" />
              <div className="relative">
                <c.icon className="mb-auto h-5 w-5 text-white/80" aria-hidden />
                <span className="font-display font-bold text-sm text-white">
                  {c.label}
                </span>
                <span className="mt-0.5 block text-[11px] text-white/80">
                  {c.tagline}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
