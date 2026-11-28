import Image from 'next/image';
import Link from 'next/link';
import { Store, Truck, Wallet } from 'lucide-react';

export function BecomePartner() {
  return (
    <section id="devenir-vendeur" className="scroll-mt-20 py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-ink-900 relative isolate overflow-hidden rounded-2xl">
          <Image
            src="/become-partner/chef-banani.jpg"
            alt=""
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="-z-20 object-cover object-[57%_36%]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-r from-tomato-700 via-tomato-700/80 via-45% to-ink-900/55 lg:via-35% lg:to-ink-900/10"
          />
          <div className="max-w-3xl p-7 text-white sm:p-10 lg:p-12">
            <h2 className="font-display text-3xl leading-tight font-extrabold sm:text-4xl">
              Tu cuisines ?
              <br />
              <span className="text-cream-100">Gagne de l&apos;argent</span> sur Lilia Food.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white sm:text-base">
              Inscris ton restaurant, ta cuisine maison, ta boulangerie ou ta boutique de boissons.
              On s&apos;occupe des commandes, du paiement et de la livraison — tu te concentres sur
              ce que tu fais le mieux : cuisiner.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
              <div className="flex items-center gap-2 text-sm text-white">
                <Store className="text-cream-100 h-4 w-4 shrink-0" />
                Inscription gratuite
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <Truck className="text-cream-100 h-4 w-4 shrink-0" />
                Livraison prise en charge
              </div>
              <div className="flex items-center gap-2 text-sm text-white">
                <Wallet className="text-cream-100 h-4 w-4 shrink-0" />
                Paiement MoMo / Airtel
              </div>
            </div>

            <Link
              href="/devenir-vendeur"
              data-analytics-id="vendor_cta_click"
              className="rounded-pill text-tomato-700 hover:bg-cream-100 mt-8 inline-flex w-fit items-center gap-2 bg-white px-8 py-3.5 text-base font-extrabold transition-colors"
            >
              Devenir vendeur
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
