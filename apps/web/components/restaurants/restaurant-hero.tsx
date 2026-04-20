'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Star, Clock, Bike, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { formatCurrency, formatDeliveryTime } from '@lilia/utils';

interface RestaurantHeroProps {
  restaurant: Restaurant;
}

export function RestaurantHero({ restaurant }: RestaurantHeroProps) {
  return (
    <div className="relative">
      {/* Image hero avec parallax */}
      <div className="relative h-56 sm:h-72 lg:h-80 overflow-hidden bg-zinc-200">
        {restaurant.imageUrl ? (
          <Image
            src={restaurant.imageUrl}
            alt={restaurant.nom}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center">
            <span className="text-7xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Info card flottante */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="-mt-12 relative bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-zinc-100 dark:border-dark-border p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{restaurant.nom}</h1>
                {restaurant.isOpen ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    Ouvert
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-dark-surface text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-full">
                    <XCircle className="w-3 h-3" />
                    Fermé
                  </span>
                )}
              </div>

              {restaurant.specialties && restaurant.specialties.length > 0 && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3">
                  {restaurant.specialties.map((s) => s.name).join(' · ')}
                </p>
              )}

              <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-sm mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0 text-zinc-400" />
                {restaurant.adresse}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {restaurant.averageRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {restaurant.averageRating.toFixed(1)}
                    </span>
                    {restaurant.totalReviews && (
                      <span className="text-zinc-400 dark:text-zinc-500">({restaurant.totalReviews} avis)</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                  <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  {formatDeliveryTime(
                    restaurant.estimatedDeliveryTimeMin,
                    restaurant.estimatedDeliveryTimeMax,
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Bike className="w-4 h-4 text-zinc-400" />
                  {restaurant.fixedDeliveryFee === 0
                    ? 'Livraison gratuite'
                    : `Livraison ${formatCurrency(restaurant.fixedDeliveryFee)}`}
                </div>
                {restaurant.minimumOrderAmount > 0 && (
                  <div className="text-zinc-400 text-xs">
                    Minimum {formatCurrency(restaurant.minimumOrderAmount)}
                  </div>
                )}
              </div>
            </div>

            <a
              href={`tel:${restaurant.phone}`}
              className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-dark-border rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-dark-surface transition-colors flex-shrink-0"
            >
              <Phone className="w-4 h-4" />
              Appeler
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
