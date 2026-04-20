'use client';

import Link from 'next/link';
import { ChefHat, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-zinc-900 dark:bg-dark-surface text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label="Lilia Food">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                Lilia Food
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-zinc-400">
              La meilleure expérience de livraison de repas à Brazzaville. Vos plats préférés, livrés rapidement.
            </p>
            <div className="flex flex-col gap-2 mt-4 text-sm">
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary-500 shrink-0" />Brazzaville, Congo</span>
              <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary-500 shrink-0" />+242 06 745 46 10</span>
              <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary-500 shrink-0" />contact@liliafood.com</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Navigation</h4>
            <ul className="flex flex-col gap-2 text-sm">
              {[
                { href: '/restaurants', label: 'Restaurants' },
                { href: '/commandes', label: 'Mes commandes' },
                { href: '/profil', label: 'Mon profil' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="hover:text-white transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wide">Légal</h4>
            <ul className="flex flex-col gap-2 text-sm">
              <li><Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link></li>
              <li><Link href="/conditions" className="hover:text-white transition-colors">Conditions d'utilisation</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 dark:border-dark-border mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} Lilia Food. Tous droits réservés.</p>
          <p>Fait avec ❤️ à Brazzaville. Par DreesisLab</p>
        </div>
      </div>
    </footer>
  );
}
