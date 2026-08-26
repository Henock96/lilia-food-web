'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { UtensilsCrossed } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { containerVariants } from '@lilia/motion';
import { ErrorState } from '@/components/ui';
import { VendorCard } from './vendor-card';
import { EmptyVendorSlot } from './empty-vendor-slot';

interface VendorGridProps {
  restaurants: Restaurant[];
  emptyHint?: string;
  /** La requête ayant alimenté `restaurants` a échoué : on affiche un état
   * d'erreur avec retry plutôt que de laisser croire à un catalogue vide. */
  failed?: boolean;
  /** Complète la grille jusqu'à ce nombre de cases avec des emplacements en
   * pointillés (cf. `FeaturedRestaurants`). À ne passer que sur la vue non
   * filtrée : sur un résultat de recherche/filtre, ces pointillés seraient
   * trompeurs (« Prochain vendeur ici » n'a pas de sens sur 0 résultat de
   * recherche). */
  minSlots?: number;
}

export function VendorGrid({ restaurants, emptyHint, failed = false, minSlots }: VendorGridProps) {
  const reduced = useReducedMotion();
  const router = useRouter();

  if (failed) {
    return (
      <ErrorState
        title="Impossible de charger les vendeurs"
        subtitle="Vérifie ta connexion et réessaie."
        onRetry={() => router.refresh()}
        className="rounded-3xl border border-cream-300 bg-white py-20"
      />
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-cream-300 bg-white py-20 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-200">
          <UtensilsCrossed className="h-6 w-6 text-ink-300" aria-hidden />
        </span>
        <p className="text-lg font-semibold text-ink-900">Aucun restaurant disponible</p>
        <p className="mt-1 text-sm text-ink-500">{emptyHint ?? 'Reviens bientôt, ça arrive !'}</p>
      </div>
    );
  }

  const emptySlots = Math.max(0, (minSlots ?? 0) - restaurants.length);

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
      {Array.from({ length: emptySlots }).map((_, i) => (
        <EmptyVendorSlot key={`empty-${i}`} label={i === 0 ? 'Prochain vendeur ici' : undefined} />
      ))}
    </motion.div>
  );
}
