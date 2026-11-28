import type { Metadata } from 'next';
import Image from 'next/image';
import { Store, Truck, Wallet, MessageCircle, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { BreadcrumbJsonLd } from '@/components/seo/json-ld';
import { CONTACT } from '@/lib/site';

/**
 * Parcours d'inscription vendeur.
 *
 * Les CTA « Devenir vendeur » (home) et « Devenir partenaire » (footer)
 * pointaient vers `/inscription?role=vendor`. Or la page d'inscription ignore
 * totalement ce paramètre : un restaurateur qui cliquait créait un compte
 * client ordinaire et n'avait aucun moyen de référencer son commerce. Le
 * recrutement de vendeurs — décrit dans le code comme la priorité du
 * catalogue — n'avait donc aucun canal fonctionnel.
 *
 * On ne passe volontairement pas par un formulaire applicatif : aucun endpoint
 * backend n'existe pour une candidature vendeur, et en inventer un côté web
 * créerait une promesse sans destinataire. Le contact direct — WhatsApp en
 * tête, canal dominant à Brazzaville — est à la fois immédiatement fonctionnel
 * et mieux converti qu'un formulaire.
 *
 * Bénéfice secondaire : cette page est une cible SEO réelle pour
 * « devenir partenaire livraison Brazzaville », que le site ne couvrait pas.
 */
export const metadata: Metadata = {
  title: 'Devenir vendeur partenaire à Brazzaville',
  description:
    'Inscrivez votre restaurant, cuisine maison, boulangerie ou boutique de boissons sur Lilia Food. Inscription gratuite, livraison prise en charge, paiement MTN MoMo et Airtel Money.',
  alternates: { canonical: '/devenir-vendeur' },
};

const BENEFITS = [
  {
    icon: Store,
    title: 'Inscription gratuite',
    text: "Aucun frais d'entrée, aucun abonnement. On se rémunère uniquement sur les commandes livrées.",
  },
  {
    icon: Truck,
    title: 'Livraison prise en charge',
    text: "Nos livreurs s'occupent du dernier kilomètre. Vous n'avez ni véhicule ni coursier à gérer.",
  },
  {
    icon: Wallet,
    title: 'Paiement Mobile Money',
    text: 'Vos clients paient par MTN MoMo ou Airtel Money. Vous suivez vos encaissements depuis votre espace vendeur.',
  },
];

const STEPS = [
  'Vous nous contactez par WhatsApp, téléphone ou email.',
  'Nous prenons ensemble les informations de votre commerce et vos horaires.',
  'Nous mettons votre catalogue en ligne et photographions vos produits si besoin.',
  'Vous recevez vos premières commandes et suivez tout depuis votre espace vendeur.',
];

const WHATSAPP_MESSAGE = encodeURIComponent(
  'Bonjour Lilia Food, je souhaite inscrire mon commerce sur la plateforme.',
);

export default function DevenirVendeurPage() {
  return (
    <div className="bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: 'Devenir vendeur', path: '/devenir-vendeur' },
        ]}
      />

      {/* Hero */}
      <section className="bg-[#faf7f2]">
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <Breadcrumbs links={[{ label: 'Accueil', href: '/' }]} current="Devenir vendeur" />
        </div>
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pt-4 pb-12 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:pb-16">
          <div className="lg:w-7/12">
            <h1 className="font-display text-ink-900 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Vendez vos plats sur <span className="text-tomato-600">Lilia&nbsp;Food</span>
            </h1>
            <p className="text-ink-700 mt-5 max-w-xl text-base leading-relaxed">
              Restaurant, cuisine maison, boulangerie, pâtisserie ou boutique de boissons à
              Brazzaville&nbsp;: rejoignez la marketplace et recevez des commandes sans gérer la
              livraison ni l&apos;encaissement.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={`${CONTACT.whatsapp}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
                data-analytics-id="vendor_cta_click"
                className="bg-tomato-600 hover:bg-tomato-700 inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition-colors sm:px-6"
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Nous écrire sur WhatsApp
              </a>
              <a
                href={`tel:${CONTACT.phonePrimary.e164}`}
                data-analytics-id="phone_click"
                className="border-ink-100 text-ink-900 hover:border-tomato-200 hover:bg-tomato-50 inline-flex min-h-12 items-center gap-2 rounded-full border bg-white px-5 py-3 text-sm font-bold transition-colors sm:px-6"
              >
                <Phone className="h-5 w-5" aria-hidden />
                Appeler
              </a>
            </div>
          </div>

          <div className="relative h-64 w-full overflow-hidden rounded-2xl sm:h-80 lg:h-96 lg:w-5/12">
            <Image
              src="/become-partner/chef-banani.jpg"
              alt="Une cheffe présente un plat dans sa cuisine"
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover object-[57%_42%]"
            />
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-display text-ink-900 text-2xl font-extrabold sm:text-3xl">
          Ce que Lilia Food prend en charge
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border-ink-100 rounded-2xl border p-6">
              <span className="bg-tomato-50 text-tomato-600 flex h-11 w-11 items-center justify-center rounded-xl">
                <b.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="font-display text-ink-900 mt-4 text-base font-bold">{b.title}</h3>
              <p className="text-ink-500 mt-2 text-sm leading-relaxed">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Étapes */}
      <section className="border-ink-100 border-y bg-[#faf7f2]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="font-display text-ink-900 text-2xl font-extrabold sm:text-3xl">
            Comment ça se passe
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <li
                key={step}
                className="border-ink-100 flex items-start gap-3 rounded-2xl border bg-white p-4 sm:p-5"
              >
                <span className="bg-tomato-600 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-ink-700 pt-0.5 text-sm leading-relaxed sm:text-base">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <p className="text-ink-700 mt-8 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="text-tomato-600 h-4 w-4 shrink-0" aria-hidden />
            Aucun engagement de durée. Vous pouvez suspendre votre boutique à tout moment.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="font-display text-ink-900 text-2xl font-extrabold sm:text-3xl">
          Parlons de votre commerce
        </h2>
        <p className="text-ink-500 mt-2 text-sm">
          Notre équipe répond du lundi au samedi, de 8h à 22h.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href={`${CONTACT.whatsapp}?text=${WHATSAPP_MESSAGE}`}
            target="_blank"
            rel="noopener noreferrer"
            data-analytics-id="whatsapp_click"
            className="border-ink-100 hover:border-tomato-200 hover:bg-tomato-50/30 flex items-start gap-4 rounded-xl border p-5 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="text-ink-900 block text-sm font-bold">WhatsApp</span>
              <span className="text-ink-700 mt-0.5 block text-sm">
                {CONTACT.phonePrimary.display}
              </span>
              <span className="text-ink-500 mt-0.5 block text-xs">Réponse rapide</span>
            </span>
          </a>

          <a
            href={`tel:${CONTACT.phonePrimary.e164}`}
            data-analytics-id="phone_click"
            className="border-ink-100 hover:border-tomato-200 hover:bg-tomato-50/30 flex items-start gap-4 rounded-xl border p-5 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Phone className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="text-ink-900 block text-sm font-bold">Téléphone</span>
              <span className="text-ink-700 mt-0.5 block text-sm">
                {CONTACT.phonePrimary.display}
              </span>
              <span className="text-ink-500 mt-0.5 block text-xs">
                {CONTACT.phoneSecondary.display}
              </span>
            </span>
          </a>

          <a
            href={`mailto:${CONTACT.email}?subject=${encodeURIComponent('Inscription vendeur')}`}
            data-analytics-id="contact_click"
            className="border-ink-100 hover:border-tomato-200 hover:bg-tomato-50/30 flex items-start gap-4 rounded-xl border p-5 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Mail className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="text-ink-900 block text-sm font-bold">Email</span>
              <span className="text-ink-700 mt-0.5 block text-sm">{CONTACT.email}</span>
              <span className="text-ink-500 mt-0.5 block text-xs">Réponse sous 24h</span>
            </span>
          </a>
        </div>
      </section>
    </div>
  );
}
