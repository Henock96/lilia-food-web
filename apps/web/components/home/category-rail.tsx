import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { HOME_CATEGORIES, type HomeCategory } from '@/lib/home-content';

/**
 * Aplats de couleur en attendant de vraies photos de vendeurs (cf.
 * `lib/home-content.ts`). Une seule tuile en `tomato-500` : le hero juste
 * au-dessus est déjà un aplat rouge (`bg-tomato-600`, cf. `hero-slider.tsx`
 * quand aucune photo n'est assez grande) — enchaîner deux blocs rouges
 * pleine largeur ferait lire la page comme un unique bandeau uniforme.
 * Les trois autres tuiles (cream-300, cream-200, ink-900) cassent le rouge
 * et donnent un rythme clair/clair/sombre avant les cartes vendeur.
 */
const toneClasses: Record<HomeCategory['tone'], string> = {
  photo: 'bg-cream-300 text-ink-900',
  tomato: 'bg-tomato-500 text-white',
  cream: 'bg-cream-200 text-ink-900',
  ink: 'bg-ink-900 text-cream-100',
};

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
              className={`flex h-28 flex-col justify-end rounded-xl p-3 transition-opacity hover:opacity-90 ${toneClasses[c.tone]}`}
            >
              <c.icon className="mb-auto h-5 w-5" aria-hidden />
              <span className="font-display font-bold text-sm">{c.label}</span>
              <span className="text-[11px] opacity-80">{c.tagline}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
