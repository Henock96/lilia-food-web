import Image from 'next/image';
import Link from 'next/link';
import { cacheLife } from 'next/cache';
import { MapPin, Phone, Mail, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { HOME_CATEGORIES } from '@/lib/home-content';
import { CONTACT, SOCIAL_LINKS } from '@/lib/site';

/**
 * Ce composant était marqué `'use client'` uniquement pour porter le
 * `onSubmit` du formulaire newsletter. Ce formulaire ayant été retiré (voir
 * plus bas), plus rien ici n'a besoin du navigateur : le footer redevient un
 * Server Component et sort du bundle JavaScript envoyé à chaque visiteur.
 */

const NAV = [
  { href: '/restaurants', label: 'Tous les vendeurs' },
  { href: '/commandes', label: 'Mes commandes' },
  { href: '/favoris', label: 'Mes favoris' },
  { href: '/devenir-vendeur', label: 'Devenir partenaire' },
  { href: '/support', label: 'Support' },
];

const LEGAL = [
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/conditions', label: "Conditions d'utilisation" },
];

// Une icône n'est rendue que si son URL est réellement renseignée dans
// `lib/site.ts`. Auparavant les deux pointaient vers `href="#"` : des liens
// morts, qui font lire le site comme inachevé.
const SOCIALS = [
  { icon: Instagram, label: 'Instagram', href: SOCIAL_LINKS.instagram },
  { icon: Facebook, label: 'Facebook', href: SOCIAL_LINKS.facebook },
].filter((s): s is { icon: typeof Instagram; label: string; href: string } =>
  Boolean(s.href),
);

export async function Footer() {
  // `'use cache'` est requis, pas décoratif : avec `cacheComponents: true`,
  // lire l'heure courante (`new Date()`, pour l'année du copyright) dans un
  // Server Component prérendu est une erreur de build — le résultat serait
  // figé au moment du build sans que Next puisse le garantir. Marquer le
  // footer comme composant caché rend cette lecture licite et bornée dans le
  // temps. `cacheLife('days')` suffit amplement pour une année.
  'use cache';
  cacheLife('days');

  return (
    <footer className="bg-ink-900 text-cream-100">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="col-span-2">
            <Link href="/" className="mb-5 flex items-center gap-2.5" aria-label="Lilia Food">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
                <Image src="/logo.jpg" alt="" width={72} height={72} className="h-full w-full object-cover" />
              </span>
              <span className="font-display text-xl font-extrabold text-cream-100">
                Lilia<span className="text-tomato-500"> Food</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-cream-100/75">
              La marketplace gourmande de Brazzaville. Restaurants, cuisines maison, boulangeries,
              pâtisseries et boissons — livrés chauds, payés par MoMo.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <span className="flex items-center gap-2.5 text-cream-100/85">
                <MapPin className="h-4 w-4 shrink-0 text-tomato-500" />
                {CONTACT.city}, {CONTACT.countryName}
              </span>
              {/* Le `href` appelait le 06 745 46 10 alors que le texte affichait
                  le 06 561 42 94 : on composait un autre numéro que celui lu.
                  Les deux viennent désormais de la même constante. */}
              <a
                href={`tel:${CONTACT.phonePrimary.e164}`}
                data-analytics-id="phone_click"
                className="flex items-center gap-2.5 text-cream-100/85 transition-colors hover:text-cream-100"
              >
                <Phone className="h-4 w-4 shrink-0 text-tomato-500" />
                {CONTACT.phonePrimary.display}
              </a>
              <a
                href={`tel:${CONTACT.phoneSecondary.e164}`}
                data-analytics-id="phone_click"
                className="flex items-center gap-2.5 text-cream-100/85 transition-colors hover:text-cream-100"
              >
                <Phone className="h-4 w-4 shrink-0 text-tomato-500" />
                {CONTACT.phoneSecondary.display}
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                data-analytics-id="contact_click"
                className="flex items-center gap-2.5 text-cream-100/85 transition-colors hover:text-cream-100"
              >
                <Mail className="h-4 w-4 shrink-0 text-tomato-500" />
                {CONTACT.email}
              </a>
            </div>
          </div>

          {/* Catégories */}
          <div>
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Catégories</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-cream-100/75">
              {HOME_CATEGORIES.map((c) => (
                <li key={c.label}>
                  <Link
                    href={`/restaurants?vendorType=${c.type}`}
                    className="transition-colors hover:text-cream-100"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Navigation</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-cream-100/75">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-cream-100">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact direct — remplace le formulaire newsletter, qui se
              contentait d'un `preventDefault()` : aucun backend d'inscription
              n'existe, le visiteur croyait s'abonner sans que rien ne parte. */}
          <div className="col-span-2 md:col-span-1">
            <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Une question ?</h2>
            <p className="text-sm text-cream-100/75">
              Notre équipe répond du lundi au samedi, de 8h à 22h.
            </p>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              data-analytics-id="whatsapp_click"
              className="mt-4 inline-flex items-center gap-2 rounded-pill bg-tomato-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-tomato-700"
            >
              <MessageCircle className="h-4 w-4" aria-hidden />
              Écrire sur WhatsApp
            </a>

            {SOCIALS.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                {SOCIALS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-100/15 bg-cream-100/5 text-cream-100/70 transition-colors hover:border-tomato-500/50 hover:text-cream-100"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-cream-100/10 pt-8 text-xs text-cream-100/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Lilia Food. Tous droits réservés.</p>
          <div className="flex items-center gap-5">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-cream-100">{l.label}</Link>
            ))}
          </div>
          <p>Fait avec ❤️ à Brazzaville · DreesisLab</p>
        </div>
      </div>
    </footer>
  );
}
