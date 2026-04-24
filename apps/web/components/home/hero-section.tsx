'use client';

import { useReducedMotion, motion } from 'framer-motion';
import Link from 'next/link';
import { Search, ArrowRight, Star, Clock, Bike } from 'lucide-react';
import { buttonTap } from '@lilia/motion';

const stats = [
  { icon: Star,  value: '4.8/5',  label: 'Note moyenne' },
  { icon: Clock, value: '25 min', label: 'Livraison rapide' },
  { icon: Bike,  value: '15+',    label: 'Restaurants' },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const reduced = useReducedMotion();

  return (
    <section
      className="relative min-h-screen flex items-start overflow-hidden bg-linear-to-br from-orange-50 via-white to-amber-50/30 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card pt-16"
      aria-label="Section d'accueil"
    >
      {/* Blobs décoratifs */}
      <div className="absolute top-20 right-0 w-150 h-150 bg-primary-100/30 dark:bg-primary-900/10 rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" aria-hidden />
      <div className="absolute bottom-0 left-0 w-100 h-100 bg-amber-100/20 dark:bg-amber-900/10 rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Content */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05, duration: 0.4, ease }}
              className="inline-flex items-center gap-2 w-fit px-4 py-2 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-full"
            >
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" aria-hidden />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Livraison disponible à Brazzaville
              </span>
            </motion.div>

            {/* Titre */}
            <motion.h1
              initial={reduced ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight"
            >
              T’as faim ?{' '}
              <span className="text-primary-500" style={{ fontFamily: 'var(--font-display)' }}>
                On livre.
              </span>
              
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.4, ease }}
              className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md"
            >
              Commande tes plats préférés en quelques clics et fais-toi livrer rapidement, où que tu sois.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.4, ease }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <motion.div whileTap={reduced ? {} : buttonTap}>
                <Link
                  href="/restaurants"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-primary-200 dark:shadow-primary-900/50 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Search className="w-4 h-4" aria-hidden />
                  Voir les restaurants
                  <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </motion.div>
              <motion.div whileTap={reduced ? {} : buttonTap}>
                <Link
                  href="/inscription"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-dark-card hover:bg-zinc-50 dark:hover:bg-dark-border text-zinc-800 dark:text-zinc-200 font-semibold rounded-2xl border border-zinc-200 dark:border-dark-border transition-all hover:-translate-y-0.5"
                >
                  Créer un compte
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="flex flex-wrap gap-6 mt-4"
            >
              {stats.map(({ icon: Icon, value, label }, i) => (
                <motion.div
                  key={label}
                  initial={reduced ? {} : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.35, ease }}
                  className="flex items-center gap-2"
                >
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" aria-hidden />
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 leading-none">{value}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Image hero */}
          <motion.div
            initial={reduced ? {} : { opacity: 0, scale: 0.92, x: 32 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease }}
            className="relative hidden lg:block"
          >
            <div className="relative w-full aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-linear-to-br from-primary-400 to-accent-500 rounded-[3rem] rotate-6 opacity-10 dark:opacity-5" aria-hidden />
              <div className="relative bg-white dark:bg-dark-card rounded-4xl overflow-hidden shadow-2xl border border-zinc-100 dark:border-dark-border">
                <img
                  src="https://images.unsplash.com/photo-1665332561290-cc6757172890?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                  alt="Plats savoureux Lilia Food"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {/* Floating cards */}
              <motion.div
                animate={reduced ? {} : { y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-6 top-1/4 bg-white dark:bg-dark-card rounded-2xl shadow-xl p-3 flex items-center gap-3 border border-zinc-100 dark:border-dark-border"
                aria-hidden
              >
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">20-30 min</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Temps de livraison</div>
                </div>
              </motion.div>

              <motion.div
                animate={reduced ? {} : { y: [0, 8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -right-4 bottom-1/4 bg-white dark:bg-dark-card rounded-2xl shadow-xl p-3 flex items-center gap-3 border border-zinc-100 dark:border-dark-border"
                aria-hidden
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">4.9 ★★★★★</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">200+ avis</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
