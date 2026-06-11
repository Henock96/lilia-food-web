'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Search, ShoppingBag, Bike } from 'lucide-react';
import { SectionHeading } from './_ui';

const EASE = [0.22, 1, 0.36, 1] as const;

const steps = [
  {
    icon: Search,
    title: 'Choisis ton vendeur',
    description: 'Parcours restaurants, cuisines maison, boulangeries et boissons près de chez toi.',
    step: '01',
  },
  {
    icon: ShoppingBag,
    title: 'Compose ta commande',
    description: 'Ajoute tes plats au panier, applique un code promo, paie par MTN MoMo ou Airtel.',
    step: '02',
  },
  {
    icon: Bike,
    title: 'Reçois, c’est chaud',
    description: 'Suis ton livreur en temps réel et cumule des points fidélité à chaque commande.',
    step: '03',
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[var(--noir-850)] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Simple comme bonjour"
          title="Trois gestes,"
          accent="et c’est servi."
          align="center"
        />

        <div className="relative mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* trait de liaison */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-white/12 to-transparent md:block"
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={reduced ? {} : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: EASE }}
              className="group relative flex flex-col items-center text-center"
            >
              <div className="relative mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center">
                <span className="ember-glow absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="glass-noir relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl text-[var(--ember-400)] transition-transform duration-300 group-hover:-translate-y-1">
                  <s.icon className="h-7 w-7" aria-hidden />
                </span>
                <span
                  className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ember-500)] text-xs font-bold text-white"
                  aria-hidden
                >
                  {s.step}
                </span>
              </div>
              <h3
                className="text-xl font-bold text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {s.title}
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
