'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  useReducedMotion,
  useInView,
  useMotionValue,
  useSpring,
  animate,
} from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

/* ── Halo orange diffus ──────────────────────────────── */
export function GlowOrb({
  className = '',
  breathe = true,
}: {
  className?: string;
  breathe?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full ember-glow ${
        breathe ? 'ember-breathe' : ''
      } ${className}`}
    />
  );
}

/* ── En-tête de section éditorial ────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = 'left',
  action,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  align?: 'left' | 'center';
  action?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const centered = align === 'center';
  return (
    <div
      className={`flex flex-col gap-4 ${
        centered ? 'items-center text-center' : 'sm:flex-row sm:items-end sm:justify-between'
      }`}
    >
      <motion.div
        initial={reduced ? {} : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: EASE }}
        className={`max-w-2xl ${centered ? 'mx-auto' : ''}`}
      >
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ember">
          <span className="h-px w-6 bg-[var(--ember-400)]/60" aria-hidden />
          {eyebrow}
        </span>
        <h2
          className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.75rem]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}{' '}
          {accent && <span className="text-ember italic">{accent}</span>}
        </h2>
        {description && (
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">{description}</p>
        )}
      </motion.div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Compteur animé (count-up au scroll) ─────────────── */
export function CountUp({
  value,
  suffix = '',
  decimals = 0,
  className = '',
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration: 1.4,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, reduced]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ── Parallax au pointeur (desktop) ──────────────────── */
export function usePointerParallax(strength = 18) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 120, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 120, damping: 18, mass: 0.6 });

  function onMove(e: React.MouseEvent<HTMLElement>) {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    x.set(px * strength);
    y.set(py * strength);
  }
  function onLeave() {
    x.set(0);
    y.set(0);
  }
  return { onMove, onLeave, sx, sy };
}
