'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { containerVariants } from '@lilia/motion';
import { VendorCard } from './vendor-card';

interface VendorGridProps {
  restaurants: Restaurant[];
  emptyHint?: string;
}

export function VendorGrid({ restaurants, emptyHint }: VendorGridProps) {
  const reduced = useReducedMotion();

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-white/8 bg-white/[0.02] py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <UtensilsCrossed className="h-6 w-6 text-white/40" aria-hidden />
        </span>
        <p className="text-lg font-semibold text-white">Aucun restaurant disponible</p>
        <p className="mt-1 text-sm text-white/45">{emptyHint ?? 'Reviens bientôt, ça arrive !'}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={reduced ? {} : containerVariants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {restaurants.map((r) => (
        <VendorCard key={r.id} restaurant={r} />
      ))}
    </motion.div>
  );
}
