import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Store, Truck, Wallet } from 'lucide-react';

/**
 * Section « Devenir vendeur » — recruter est la priorité #1 du catalogue.
 * Fond `tomato-600` (#D2371A, 4,88:1 avec du blanc — passe AA).
 * Layout horizontal : image à gauche, texte + avantages à droite.
 */
export function BecomePartner() {
  return (
    <section className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-2xl bg-tomato-600">
          <div className="flex flex-col lg:flex-row">
            {/* Image */}
            <div className="relative h-64 w-full shrink-0 overflow-hidden sm:h-72 lg:h-[26rem] lg:w-5/12">
              <Image
                src="/become-partner/chef5.jpg"
                alt="Un vendeur préparant un plat savoureux"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-tomato-600/30 lg:bg-gradient-to-r lg:from-transparent lg:to-tomato-600" />
            </div>

            {/* Texte */}
            <div className="flex flex-col justify-center p-8 text-white lg:w-7/12 lg:p-12">
              <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                Tu cuisines ?
                <br />
                <span className="text-cream-100">Gagne de l&apos;argent</span> sur Lilia Food.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/90 sm:text-base">
                Inscris ton restaurant, ta cuisine maison, ta boulangerie ou ta boutique de
                boissons. On s&apos;occupe des commandes, du paiement et de la livraison — tu
                te concentres sur ce que tu fais le mieux : cuisiner.
              </p>

              {/* Avantages */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2 text-sm text-white/85">
                  <Store className="h-4 w-4 shrink-0 text-cream-100" />
                  Inscription gratuite
                </div>
                <div className="flex items-center gap-2 text-sm text-white/85">
                  <Truck className="h-4 w-4 shrink-0 text-cream-100" />
                  Livraison prise en charge
                </div>
                <div className="flex items-center gap-2 text-sm text-white/85">
                  <Wallet className="h-4 w-4 shrink-0 text-cream-100" />
                  Paiement MoMo / Airtel
                </div>
              </div>

              <Link
                href="/inscription?role=vendor"
                className="mt-8 inline-flex w-fit items-center gap-2 rounded-pill bg-white px-8 py-3.5 text-base font-extrabold text-tomato-700 transition-colors hover:bg-cream-100"
              >
                Devenir vendeur
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
