'use client';

import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { useFavorites, useToggleFavorite } from '@lilia/api-client';
import { RestaurantCard } from '@/components/restaurants/restaurant-card';
import { pageVariants, containerVariants, cardVariants } from '@lilia/motion';

export default function FavorisPage() {
  const { token } = useAuthStore();
  const { data: favorites, isLoading, isError } = useFavorites(token);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-10 min-h-screen"
    >
      <h1
        className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-8"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Mes favoris
      </h1>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-zinc-100 dark:bg-dark-surface rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-zinc-500">
          <p className="font-medium">Impossible de charger vos favoris</p>
        </div>
      )}

      {!isLoading && !isError && favorites?.length === 0 && (
        <motion.div
          variants={containerVariants}
          className="flex flex-col items-center justify-center py-24 gap-4 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <Heart className="w-10 h-10 text-red-300" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
            Aucun favori pour l&apos;instant
          </h2>
          <p className="text-sm text-zinc-500 max-w-xs">
            Appuyez sur le cœur d&apos;un restaurant pour le sauvegarder ici.
          </p>
          <Link
            href="/restaurants"
            className="mt-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors"
          >
            Explorer les restaurants
          </Link>
        </motion.div>
      )}

      {!isLoading && favorites && favorites.length > 0 && (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {favorites.map((restaurant) => (
            <motion.div key={restaurant.id} variants={cardVariants}>
              <RestaurantCard restaurant={restaurant} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
