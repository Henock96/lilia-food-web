'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import type { Restaurant } from '@lilia/types';
import { RestaurantCard } from './restaurant-card';
import { containerVariants } from '@lilia/motion';
import { ErrorState } from '@/components/ui';

interface RestaurantGridProps {
  restaurants: Restaurant[];
  /** La requête ayant alimenté `restaurants` a échoué : on affiche un état
   * d'erreur avec retry plutôt que de laisser croire à un catalogue vide. */
  failed?: boolean;
}

export function RestaurantGrid({ restaurants, failed = false }: RestaurantGridProps) {
  const prefersReduced = useReducedMotion();
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
      <div className="text-center py-20 text-ink-500">
        <p className="text-lg font-medium text-ink-900">Aucun restaurant disponible pour le moment</p>
        <p className="text-sm mt-1">Revenez bientôt !</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={prefersReduced ? {} : containerVariants}
      initial="initial"
      animate="animate"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </motion.div>
  );
}
