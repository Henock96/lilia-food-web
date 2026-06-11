'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Mail, Instagram, Facebook, Send, ArrowRight } from 'lucide-react';
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
    <footer className="grain relative overflow-hidden border-t border-white/8 bg-[var(--noir-900)] text-white/55">
      <div aria-hidden className="ember-glow absolute -left-24 -top-24 h-72 w-72 opacity-50" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="col-span-2">
            <Link href="/" className="mb-5 flex items-center gap-2.5" aria-label="Lilia Food">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/15">
                <Image src="/logo.jpg" alt="" width={72} height={72} className="h-full w-full object-cover" />
              </span>
              <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Lilia<span className="text-ember"> Food</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed">
              La marketplace gourmande de Brazzaville. Restaurants, cuisines maison, boulangeries,
              pâtisseries et boissons — livrés chauds, payés par MoMo.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 text-sm">
              <span className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-[var(--ember-400)]" />Brazzaville, Congo
              </span>
              <a href="tel:+242067454610" className="flex items-center gap-2.5 transition-colors hover:text-white">
                <Phone className="h-4 w-4 shrink-0 text-[var(--ember-400)]" />+242 06 745 46 10
              </a>
              <a href="mailto:contact@liliafood.com" className="flex items-center gap-2.5 transition-colors hover:text-white">
                <Mail className="h-4 w-4 shrink-0 text-[var(--ember-400)]" />contact@liliafood.com
              </a>
            </div>
          </div>

          {/* Catégories */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Catégories</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              {HOME_CATEGORIES.map((c) => (
                <li key={c.label}>
                  <Link
                    href={`/restaurants?vendorType=${c.type}`}
                    className="transition-colors hover:text-white"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Navigation</h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              {NAV.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/80">Newsletter</h4>
            <p className="text-sm">Les bons plans gourmands, une fois par semaine.</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5"
            >
              <input
                type="email"
                required
                placeholder="ton@email.com"
                aria-label="Adresse e-mail"
                className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="S'inscrire"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ember-500)] text-white transition-colors hover:bg-[var(--ember-400)]"
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[var(--ember-400)]/40 hover:text-white"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* App bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:flex-row">
          <p className="text-sm text-white/70">
            <span className="font-semibold text-white">Télécharge l’app</span> et commande encore plus vite.
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.dreesis.lilia.lilia_app"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--noir-900)] transition-colors hover:bg-white/90"
          >
            Google Play
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-8 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} Lilia Food. Tous droits réservés.</p>
          <div className="flex items-center gap-5">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-white">{l.label}</Link>
            ))}
          </div>
          <p>Fait avec ❤️ à Brazzaville · DreesisLab</p>
        </div>
      </div>
    </footer>
  );
}
