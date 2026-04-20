'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Restaurant } from '@lilia/types';
import { RestaurantCard } from './restaurant-card';
import { containerVariants } from '@lilia/motion';

interface RestaurantGridProps {
  restaurants: Restaurant[];
}

export function RestaurantGrid({ restaurants }: RestaurantGridProps) {
  const prefersReduced = useReducedMotion();

  if (restaurants.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-500">
        <p className="text-lg font-medium">Aucun restaurant disponible pour le moment</p>
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
