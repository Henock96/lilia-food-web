import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Le catalogue de production ne compte qu'un seul vendeur : recruter en
 * importe plus aujourd'hui que convertir des clients. Ce bloc est donc
 * délibérément la section la plus voyante de la home, juste avant le pied de
 * page sombre.
 *
 * `tomato-600`, pas `tomato-500` : le paragraphe fait 13 px, et du texte
 * blanc à cette taille sur `#EF4423` (tomato-500) ne donne que 3,8:1 —
 * sous le seuil AA. `tomato-600` (#D2371A) atteint 4,88:1 avec du blanc
 * plein, donc pas d'`opacity-*` sur le paragraphe. Le bouton est en texte
 * `tomato-700` sur blanc pour la même raison de contraste.
 */
export function BecomePartner() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-6 rounded-2xl bg-tomato-600 p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Tu cuisines ? Vends sur Lilia Food.
            </h2>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed">
              Restaurant, cuisine maison, boulangerie ou boissons — inscris-toi, on s&apos;occupe
              des commandes et de la livraison.
            </p>
          </div>
          <Link
            href="/inscription?role=vendor"
            className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-white px-6 py-3 font-extrabold text-tomato-700 transition-colors hover:bg-cream-100"
          >
            Devenir vendeur
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
