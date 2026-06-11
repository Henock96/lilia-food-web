'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Tag, ArrowRight } from 'lucide-react';
import { HOME_PROMOS, type HomePromo } from '@/lib/home-content';
import { SectionHeading } from './_ui';

const EASE = [0.22, 1, 0.36, 1] as const;

const TONE: Record<HomePromo['tone'], string> = {
  ember: 'from-[var(--ember-500)]/90 to-[#9E3012]/80',
  gold: 'from-[#E9B873]/90 to-[#9E6B12]/80',
  plum: 'from-[#9D4EDD]/85 to-[#5A189A]/80',
};

export function PromoStrip() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[var(--noir-850)] py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Bons plans"
          title="Offres &"
          accent="nouveautés."
          description="Des raisons de te régaler maintenant — promos, codes et derniers arrivés."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {HOME_PROMOS.map((promo, i) => (
            <motion.article
              key={promo.title}
              initial={reduced ? {} : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
              whileHover={reduced ? {} : { y: -6 }}
              className="group relative h-64 overflow-hidden rounded-[1.75rem] border border-white/8"
            >
              <img
                src={promo.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <div className={`absolute inset-0 bg-gradient-to-br ${TONE[promo.tone]} mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="relative flex h-full flex-col justify-between p-6">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {promo.badge}
                </span>

                <div>
                  <h3
                    className="text-2xl font-bold leading-tight text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {promo.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/80">{promo.description}</p>

                  <div className="mt-4 flex items-center justify-between">
                    {promo.code ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/50 bg-black/20 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-white">
                        <Tag className="h-3.5 w-3.5" aria-hidden />
                        {promo.code}
                      </span>
                    ) : (
                      <span />
                    )}
                    <Link
                      href="/restaurants"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-white transition-transform group-hover:translate-x-1"
                    >
                      J’en profite
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
