import type { Metadata } from 'next';
import {
  HelpCircle,
  Mail,
  Phone,
  MessageCircle,
  ChevronDown,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/json-ld';
import { CONTACT } from '@/lib/site';

// Le titre ne porte pas « | Lilia Food » : le template du layout racine
// (`%s | Lilia Food`) l'ajoute déjà. Le suffixe manuel produisait
// « Support | Lilia Food | Lilia Food » dans les résultats de recherche.
export const metadata: Metadata = {
  title: 'Support et FAQ',
  description:
    "Besoin d'aide ? Consultez notre FAQ ou contactez Lilia Food par téléphone, email ou WhatsApp à Brazzaville.",
  alternates: { canonical: '/support' },
};

const FAQ_ITEMS = [
  {
    question: 'Comment passer une commande ?',
    answer:
      'Choisis un vendeur, ajoute les produits à ton panier, valide et paye par MTN MoMo ou Airtel Money. Tu recevras une confirmation et pourras suivre ta livraison en temps réel.',
  },
  {
    question: 'Quels sont les moyens de paiement acceptés ?',
    answer:
      'Nous acceptons MTN Mobile Money et Airtel Money. Le paiement est sécurisé et confirmé en quelques secondes directement depuis ton téléphone.',
  },
  {
    question: 'Combien de temps dure la livraison ?',
    answer:
      'La livraison prend en moyenne 15 à 30 minutes selon ta localisation et le vendeur choisi. Tu peux suivre ton livreur en temps réel depuis l\'application.',
  },
  {
    question: 'Comment devenir vendeur sur Lilia Food ?',
    answer:
      'Contacte notre équipe par téléphone, email ou WhatsApp. Nous nous occupons de ton inscription et de la mise en ligne de ton commerce sur la plateforme.',
  },
  {
    question: 'Puis-je annuler ma commande ?',
    answer:
      'Tu peux annuler ta commande tant qu\'elle n\'a pas été acceptée par le vendeur. Une fois la préparation commencée, contacte-nous directement pour voir les possibilités.',
  },
  {
    question: 'Comment signaler un problème ?',
    answer:
      'Contacte-nous par téléphone, email ou WhatsApp. Notre équipe est disponible du lundi au samedi pour t\'aider à résoudre tout problème rencontré.',
  },
];

// Coordonnées lues depuis `lib/site.ts` — source unique, partagée avec le
// footer et les données structurées, pour qu'elles ne puissent plus diverger.
const CONTACT_INFO = [
  {
    icon: Phone,
    label: 'Téléphone',
    value: CONTACT.phonePrimary.display,
    secondary: CONTACT.phoneSecondary.display,
    href: `tel:${CONTACT.phonePrimary.e164}`,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Mail,
    label: 'Email',
    value: CONTACT.email,
    secondary: 'Réponse sous 24h',
    href: `mailto:${CONTACT.email}`,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: CONTACT.phonePrimary.display,
    secondary: 'Réponse rapide',
    href: CONTACT.whatsapp,
    color: 'bg-green-50 text-green-600',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-ink-100 last:border-b-0">
      <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-semibold text-ink-900 transition-colors hover:text-tomato-600 sm:text-base">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180" />
      </summary>
      <p className="pb-4 text-sm leading-relaxed text-ink-500">
        {answer}
      </p>
    </details>
  );
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <FaqJsonLd items={FAQ_ITEMS} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: 'Support', path: '/support' },
        ]}
      />
      {/* Hero */}
      <section className="bg-cream-100 py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-tomato-600">
            <HelpCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Comment pouvons-nous t&apos;aider ?
          </h1>
          <p className="mt-3 text-sm text-ink-500 sm:text-base">
            Trouve rapidement la réponse à ta question ou contacte-nous directement.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* FAQ — 2 colonnes */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
              Questions fréquentes
            </h2>
            <div className="mt-6 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white p-6">
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.question} {...item} />
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
              Nous contacter
            </h2>
            <div className="mt-6 flex flex-col gap-4">
              {CONTACT_INFO.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group flex items-start gap-4 rounded-xl border border-ink-100 p-4 transition-colors hover:border-tomato-200 hover:bg-tomato-50/30"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.color}`}
                  >
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="text-sm font-bold text-ink-900">{c.label}</span>
                    <p className="mt-0.5 text-sm text-ink-700">{c.value}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{c.secondary}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Horaires */}
            <div className="mt-6 rounded-xl border border-ink-100 bg-cream-100/50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <Clock className="h-4 w-4 text-tomato-600" />
                Horaires
              </div>
              <p className="mt-2 text-sm text-ink-500">
                Lundi — Samedi : 8h — 22h
              </p>
              <p className="text-sm text-ink-500">Dimanche : 10h — 20h</p>
            </div>

            {/* Adresse */}
            <div className="mt-4 rounded-xl border border-ink-100 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                <MapPin className="h-4 w-4 text-tomato-600" />
                Adresse
              </div>
              <p className="mt-2 text-sm text-ink-500">
                {CONTACT.city}, {CONTACT.countryName}
              </p>
            </div>
          </div>
        </div>

        {/* CTA contact rapide */}
        <div className="mt-16 rounded-2xl bg-tomato-600 p-8 text-center sm:p-10">
          <h2 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
            Tu n&apos;as pas trouvé ta réponse ?
          </h2>
          <p className="mt-3 text-sm text-white/85 sm:text-base">
            Notre équipe est disponible pour t&apos;aider du lundi au samedi.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`tel:${CONTACT.phonePrimary.e164}`}
              className="inline-flex items-center gap-2 rounded-pill bg-white px-6 py-3 text-sm font-bold text-tomato-700 transition-colors hover:bg-cream-100"
            >
              <Phone className="h-4 w-4" />
              Appeler
            </a>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-pill bg-green-500 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-green-600"
            >
              <Send className="h-4 w-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
