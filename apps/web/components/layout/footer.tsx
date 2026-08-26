'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Mail, Instagram, Facebook, Send } from 'lucide-react';
import { HOME_CATEGORIES } from '@/lib/home-content';

const NAV = [
  { href: '/restaurants', label: 'Tous les vendeurs' },
  { href: '/commandes', label: 'Mes commandes' },
  { href: '/favoris', label: 'Mes favoris' },
  { href: '/inscription?role=vendor', label: 'Devenir partenaire' },
];

const LEGAL = [
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/conditions', label: "Conditions d'utilisation" },
];

export function Footer() {
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
                <MapPin className="h-4 w-4 shrink-0 text-tomato-500" />Brazzaville, Congo
              </span>
              <a href="tel:+242067454610" className="flex items-center gap-2.5 text-cream-100/85 transition-colors hover:text-cream-100">
                <Phone className="h-4 w-4 shrink-0 text-tomato-500" />+242 06 561 42 94 - +242 05 372 03 93
              </a>
              <a href="mailto:contact@liliafood.com" className="flex items-center gap-2.5 text-cream-100/85 transition-colors hover:text-cream-100">
                <Mail className="h-4 w-4 shrink-0 text-tomato-500" />contact@liliafood.com
              </a>
            </div>
          </div>

          {/* Catégories */}
          <div>
            <h4 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Catégories</h4>
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
            <h4 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Navigation</h4>
            <ul className="flex flex-col gap-2.5 text-sm text-cream-100/75">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-cream-100">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.15em] text-cream-100">Newsletter</h4>
            <p className="text-sm text-cream-100/75">Les bons plans gourmands, une fois par semaine.</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-4 flex items-center gap-2 rounded-xl border border-cream-100/15 bg-cream-100/5 p-1.5"
            >
              <input
                type="email"
                required
                placeholder="ton@email.com"
                aria-label="Adresse e-mail"
                className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-cream-100 placeholder:text-cream-100/40 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="S'inscrire"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tomato-600 text-white transition-colors hover:bg-tomato-700"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 flex items-center gap-3">
              {[
                { icon: Instagram, label: 'Instagram', href: '#' },
                { icon: Facebook, label: 'Facebook', href: '#' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-cream-100/15 bg-cream-100/5 text-cream-100/70 transition-colors hover:border-tomato-500/50 hover:text-cream-100"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
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
