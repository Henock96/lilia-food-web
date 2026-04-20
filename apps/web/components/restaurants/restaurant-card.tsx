'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Clock, Bike, MapPin } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { cardVariants, buttonTap } from '@lilia/motion';
import { formatCurrency, formatDeliveryTime, cn } from '@lilia/utils';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={reduced ? {} : cardVariants}
      whileHover={reduced ? {} : { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      whileTap={reduced ? {} : buttonTap}
    >
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="group block bg-white dark:bg-dark-card rounded-2xl overflow-hidden border border-zinc-100 dark:border-dark-border hover:border-zinc-200 dark:hover:border-zinc-600 hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={`${restaurant.nom} — ${restaurant.isOpen ? 'Ouvert' : 'Fermé'}`}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-zinc-100 dark:bg-dark-surface">
          {restaurant.imageUrl ? (
            <Image
              src={restaurant.imageUrl}
              alt={restaurant.nom}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100 dark:from-dark-surface dark:to-dark-card">
              <span className="text-5xl" role="img" aria-label="Restaurant">🍽️</span>
            </div>
          )}

          {/* Badge ouvert/fermé */}
          <div className="absolute top-3 left-3">
            <span className={cn(
              'px-2.5 py-1 text-xs font-semibold rounded-full',
              restaurant.isOpen ? 'bg-emerald-500 text-white' : 'bg-zinc-800/80 text-white',
            )}>
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
          </div>

          {/* Spécialités */}
          {restaurant.specialties && restaurant.specialties.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
              {restaurant.specialties.slice(0, 2).map((s) => (
                <span key={s.id} className="px-2 py-0.5 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
              {restaurant.nom}
            </h3>
            {restaurant.averageRating && (
              <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Note: ${restaurant.averageRating.toFixed(1)}`}>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  {restaurant.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span className="line-clamp-1">{restaurant.adresse}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {formatDeliveryTime(restaurant.estimatedDeliveryTimeMin, restaurant.estimatedDeliveryTimeMax)}
            </span>
            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" aria-hidden />
              {restaurant.fixedDeliveryFee === 0 ? 'Livraison gratuite' : formatCurrency(restaurant.fixedDeliveryFee)}
            </span>
            {restaurant.minimumOrderAmount > 0 && (
              <span className="text-zinc-400 dark:text-zinc-500">
                Min. {formatCurrency(restaurant.minimumOrderAmount)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
