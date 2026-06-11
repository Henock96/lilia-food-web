'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Download, Bell, MapPin, Wallet } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

const APP_FEATURES = [
  { icon: Bell, label: 'Notifications en temps réel' },
  { icon: MapPin, label: 'Suivi GPS du livreur' },
  { icon: Wallet, label: 'Paiement MoMo intégré' },
];

export function AppDownloadBanner() {
  const reduced = useReducedMotion();

  return (
    <section className="grain noir-canvas relative overflow-hidden py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={reduced ? {} : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex flex-col gap-6"
          >
            <span className="glass-noir inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80">
              <span className="h-2 w-2 rounded-full bg-[var(--ember-400)]" aria-hidden />
              Application mobile
            </span>

            <h2
              className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Toute ta ville, <span className="text-ember italic">dans ta poche.</span>
            </h2>

            <p className="max-w-md leading-relaxed text-white/60">
              Commande en deux taps, suis ton livreur en direct et cumule tes points fidélité.
              L’expérience Lilia, encore plus rapide sur mobile.
            </p>

            <ul className="flex flex-col gap-3">
              {APP_FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ember-500)]/15 text-[var(--ember-400)]">
                    <f.icon className="h-4 w-4" aria-hidden />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <div className="flex" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-sm text-white/50">4.8/5 sur 200+ avis</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://play.google.com/store/apps/details?id=com.dreesis.lilia.lilia_app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[var(--noir-900)] transition-colors hover:bg-white/90"
              >
                <Download className="h-4 w-4" aria-hidden />
                Google Play
              </a>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                <Download className="h-4 w-4" aria-hidden />
                App Store
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={reduced ? {} : { opacity: 0, scale: 0.9, x: 32 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="relative flex justify-center"
          >
            <div aria-hidden className="ember-glow absolute inset-0 m-auto h-72 w-72" />
            <motion.div
              animate={reduced ? {} : { y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative h-[28rem] w-60"
            >
              <div className="ring-ember relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-[var(--noir-700)]">
                <div className="absolute inset-x-0 top-0 flex justify-center pt-3">
                  <span className="h-1.5 w-16 rounded-full bg-white/15" />
                </div>
                <Image
                  src="/logo.jpg"
                  alt="Application Lilia Food"
                  width={200}
                  height={200}
                  className="h-24 w-24 rounded-3xl object-contain"
                />
                <p
                  className="mt-5 text-xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Lilia Food
                </p>
                <p className="mt-1 text-xs text-white/45">Brazzaville · Congo</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
