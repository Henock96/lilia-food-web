'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { HOME_CATEGORIES } from '@/lib/home-content';
import { SectionHeading } from './_ui';

const EASE = [0.22, 1, 0.36, 1] as const;

export function CategoryRail() {
  const reduced = useReducedMotion();

  return (
    <section className="grain noir-canvas relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="La marketplace"
          title="Cinq univers,"
          accent="une seule faim."
          description="Du resto du coin à la cuisine de maman, du croissant du matin au gâteau d’anniversaire."
          action={
            <Link
              href="/restaurants"
              className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[var(--ember-400)]/50 hover:text-white"
            >
              Tout explorer
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          }
        />

        <div className="mt-12 -mx-4 overflow-x-auto px-4 pb-4 scrollbar-none sm:mx-0 sm:px-0">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="flex gap-5"
          >
            {HOME_CATEGORIES.map((c) => (
              <motion.div
                key={c.label}
                variants={{
                  hidden: reduced ? {} : { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                }}
                className="snap-start"
              >
                <Link
                  href={`/restaurants?vendorType=${c.type}`}
                  className="group relative block h-72 w-60 shrink-0 overflow-hidden rounded-[1.75rem] border border-white/8"
                  aria-label={`${c.label} — ${c.tagline}`}
                >
                  <img
                    src={c.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
                  {/* halo couleur au hover */}
                  <div
                    aria-hidden
                    className="absolute -bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: c.accent }}
                  />
                  <div className="relative flex h-full flex-col justify-end p-5">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-md transition-colors group-hover:border-[var(--ember-400)]/40">
                      <c.icon className="h-5 w-5 text-white" aria-hidden />
                    </span>
                    <h3
                      className="text-xl font-bold text-white"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {c.label}
                    </h3>
                    <p className="mt-1 text-sm text-white/60">{c.tagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ember-400)] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      Commander <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
