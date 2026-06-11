'use client';

import { useState } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Clock } from 'lucide-react';
import { TRUST_STATS, HOME_CATEGORIES } from '@/lib/home-content';
import { GlowOrb, CountUp, usePointerParallax } from './_ui';

const EASE = [0.22, 1, 0.36, 1] as const;

const HERO_DISHES = [
  {
    src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=900&auto=format&fit=crop',
    label: 'Pizza feu de bois',
    meta: 'Da Vinci · 25 min',
    pos: 'left-0 top-10',
    depth: 1.4,
    size: 'w-44 h-56',
  },
  {
    src: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=900&auto=format&fit=crop',
    label: 'Burger maison',
    meta: '4.9 ★ · 200+ avis',
    pos: 'right-0 top-0',
    depth: 2.1,
    size: 'w-52 h-64',
  },
  {
    src: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=900&auto=format&fit=crop',
    label: 'Bowl frais',
    meta: 'Livraison gratuite',
    pos: 'right-12 bottom-2',
    depth: 1.1,
    size: 'w-40 h-44',
  },
];

const TITLE_WORDS = ['Tout', 'Brazzaville,'];

export function HeroSection() {
  const reduced = useReducedMotion();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { onMove, onLeave, sx, sy } = usePointerParallax(26);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    router.push(`/restaurants${params}`);
  }

  return (
    <section
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="grain noir-canvas relative min-h-[100svh] overflow-hidden pt-28 pb-16 lg:pt-32"
      aria-label="Accueil Lilia Food"
    >
      <GlowOrb className="-left-32 top-10 h-[34rem] w-[34rem]" />
      <GlowOrb className="right-0 top-1/3 h-80 w-80 opacity-70" breathe={false} />
      {/* grille fine décor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(circle at 30% 20%, black, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at 30% 20%, black, transparent 70%)',
        }}
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* ── Colonne contenu ── */}
        <div className="flex flex-col gap-7">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass-noir inline-flex w-fit items-center gap-2.5 rounded-full px-4 py-2"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ember-400)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--ember-400)]" />
            </span>
            <span className="text-sm font-medium text-white/80">
              Livraison en cours à Brazzaville
            </span>
          </motion.div>

          <h1
            className="text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {TITLE_WORDS.map((word, i) => (
              <motion.span
                key={word}
                initial={reduced ? {} : { opacity: 0, y: 28, rotateX: -40 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: EASE }}
                className="mr-3 inline-block"
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              initial={reduced ? {} : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
              className="text-ember italic"
            >
              livré chez toi.
            </motion.span>
          </h1>

          <motion.p
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38, duration: 0.5, ease: EASE }}
            className="max-w-md text-lg leading-relaxed text-white/60"
          >
            Restaurants, cuisines maison, boulangeries, pâtisseries et boissons.
            Toute la ville réunie dans une seule appli — payée par MoMo, livrée chaude.
          </motion.p>

          <motion.form
            onSubmit={handleSearch}
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.5, ease: EASE }}
            className="glass-noir flex w-full max-w-md items-center gap-2 rounded-2xl p-2"
            role="search"
            aria-label="Rechercher un plat ou un vendeur"
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sushi, poulet braisé, pizza…"
                className="w-full bg-transparent py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <motion.button
              type="submit"
              whileTap={reduced ? {} : { scale: 0.96 }}
              className="flex items-center gap-2 rounded-xl bg-[var(--ember-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--ember-500)]/30 transition-colors hover:bg-[var(--ember-400)]"
            >
              Chercher
              <ArrowRight className="h-4 w-4" aria-hidden />
            </motion.button>
          </motion.form>

          {/* chips catégories rapides */}
          <motion.div
            initial={reduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.56, duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {HOME_CATEGORIES.slice(0, 5).map((c) => (
              <Link
                key={c.label}
                href={`/restaurants?vendorType=${c.type}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70 transition-all hover:border-[var(--ember-400)]/50 hover:text-white"
              >
                <c.icon className="h-3.5 w-3.5 text-[var(--ember-400)]" aria-hidden />
                {c.label}
              </Link>
            ))}
          </motion.div>

          {/* stats */}
          <motion.dl
            initial={reduced ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.64, duration: 0.5, ease: EASE }}
            className="mt-2 grid max-w-lg grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4 sm:gap-x-6"
          >
            {TRUST_STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <dt className="order-2 text-xs text-white/45">{s.label}</dt>
                <dd
                  className="order-1 text-2xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </dd>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* ── Colonne visuelle (parallax) ── */}
        <div className="relative hidden h-[34rem] lg:block">
          <motion.div
            initial={reduced ? {} : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: EASE }}
            className="relative h-full w-full"
          >
            {/* assiette principale */}
            <ParallaxCard
              sx={sx}
              sy={sy}
              depth={1.7}
              className="absolute left-1/2 top-1/2 z-10 h-[26rem] w-80 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="ring-ember relative h-full w-full overflow-hidden rounded-[2rem]">
                <img
                  src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=900&auto=format&fit=crop"
                  alt="Plat savoureux livré par Lilia Food"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-xs uppercase tracking-widest text-[var(--gold-400)]">À la une</p>
                  <p
                    className="mt-1 text-lg font-bold text-white"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Le menu du jour
                  </p>
                </div>
              </div>
            </ParallaxCard>

            {/* vignettes flottantes */}
            {HERO_DISHES.map((d, i) => (
              <ParallaxCard
                key={d.label}
                sx={sx}
                sy={sy}
                depth={d.depth}
                float={i % 2 === 0 ? 'up' : 'down'}
                className={`absolute ${d.pos} ${d.size} z-20`}
              >
                <div className="glass-noir h-full w-full overflow-hidden rounded-3xl p-1.5">
                  <div className="relative h-full w-full overflow-hidden rounded-[1.25rem]">
                    <img src={d.src} alt={d.label} className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                      <p className="text-sm font-semibold text-white">{d.label}</p>
                      <p className="text-[11px] text-white/60">{d.meta}</p>
                    </div>
                  </div>
                </div>
              </ParallaxCard>
            ))}

            {/* pastille livraison */}
            <motion.div
              animate={reduced ? {} : { y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="glass-noir absolute -left-4 bottom-8 z-30 flex items-center gap-3 rounded-2xl px-4 py-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ember-500)]/20">
                <Clock className="h-5 w-5 text-[var(--ember-400)]" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">20–30 min</p>
                <p className="text-[11px] text-white/55">Livraison express</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* indice de scroll */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/40">Découvrir</span>
        <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1.5">
          <span className="scroll-cue h-1.5 w-1.5 rounded-full bg-[var(--ember-400)]" />
        </span>
      </div>
    </section>
  );
}

/* Carte avec décalage parallax lié au pointeur + flottement optionnel */
function ParallaxCard({
  sx,
  sy,
  depth,
  float,
  className = '',
  children,
}: {
  sx: ReturnType<typeof usePointerParallax>['sx'];
  sy: ReturnType<typeof usePointerParallax>['sy'];
  depth: number;
  float?: 'up' | 'down';
  className?: string;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const tx = useTransform(sx, (v) => v * depth);
  const ty = useTransform(sy, (v) => v * depth);

  return (
    <motion.div style={{ x: tx, y: ty }} className={className}>
      <motion.div
        animate={reduced || !float ? {} : { y: float === 'up' ? [0, -12, 0] : [0, 12, 0] }}
        transition={{ duration: 4.5 + depth, repeat: Infinity, ease: 'easeInOut' }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
