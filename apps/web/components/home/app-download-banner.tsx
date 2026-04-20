'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Smartphone, Star, Download } from 'lucide-react';

export function AppDownloadBanner() {
  const prefersReduced = useReducedMotion();

  return (
    <section className="py-20 bg-gradient-to-br from-zinc-900 to-zinc-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-2 w-fit px-4 py-2 bg-white/10 rounded-full border border-white/20">
              <Smartphone className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-white/80">Application mobile disponible</span>
            </div>

            <h2
              className="text-3xl sm:text-4xl font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Téléchargez l'app{' '}
              <span className="text-primary-400">Lilia Food</span>
            </h2>

            <p className="text-zinc-400 leading-relaxed">
              Commandez encore plus facilement depuis votre téléphone. Notifications en temps réel,
              paiement MTN MoMo intégré, suivi GPS de votre livreur.
            </p>

            <div className="flex items-center gap-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-zinc-400 text-sm">4.8/5 sur 200+ avis</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-zinc-900 font-semibold rounded-2xl hover:bg-zinc-100 transition-colors">
                <Download className="w-4 h-4" />
                Google Play
              </button>
              <button className="flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
                <Download className="w-4 h-4" />
                App Store
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReduced ? {} : { opacity: 0, scale: 0.9, x: 32 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-48 h-96 bg-white/5 rounded-[2.5rem] border-2 border-white/20 flex items-center justify-center">
                <Smartphone className="w-16 h-16 text-white/20" />
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
