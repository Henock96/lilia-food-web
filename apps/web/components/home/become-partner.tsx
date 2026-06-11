'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChefHat } from 'lucide-react';
import { PARTNER_PERKS } from '@/lib/home-content';

const EASE = [0.22, 1, 0.36, 1] as const;

export function BecomePartner() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[var(--noir-850)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-gradient-to-br from-[var(--noir-700)] to-[var(--noir-850)] p-8 sm:p-12 lg:p-16">
          {/* halo + photo ambiance */}
          <div aria-hidden className="ember-glow absolute -right-20 -top-20 h-96 w-96" />
          <img
            aria-hidden
            src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=1200&auto=format&fit=crop"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
          />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <motion.span
                initial={reduced ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE }}
                className="glass-noir inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/80"
              >
                <ChefHat className="h-4 w-4 text-[var(--ember-400)]" aria-hidden />
                Espace vendeurs
              </motion.span>

              <motion.h2
                initial={reduced ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
                className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Tu cuisines ?{' '}
                <span className="text-ember italic">Vends sur Lilia.</span>
              </motion.h2>

              <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
                Restaurant, cuisine maison, boulangerie ou pâtisserie : ouvre ta boutique en
                ligne, reçois des commandes dès aujourd’hui et fais grandir ton activité à Brazzaville.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/inscription?role=vendor"
                  className="group inline-flex items-center gap-2 rounded-2xl bg-[var(--ember-500)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[var(--ember-500)]/30 transition-colors hover:bg-[var(--ember-400)]"
                >
                  Devenir partenaire
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <span className="text-sm text-white/45">Inscription gratuite · validation 48h</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PARTNER_PERKS.map((perk, i) => (
                <motion.div
                  key={perk.title}
                  initial={reduced ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.08, ease: EASE }}
                  className="glass-noir rounded-2xl p-5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ember-500)]/15 text-[var(--ember-400)]">
                    <perk.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-white">{perk.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/55">{perk.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
