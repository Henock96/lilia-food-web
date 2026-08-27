'use client';

import { motion } from 'framer-motion';
import { Star, Clock, Bike, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { formatCurrency, formatDeliveryTime, galleryImages } from '@lilia/utils';
import { ImageCarousel } from '@/components/ui';

interface RestaurantHeroProps {
  restaurant: Restaurant;
}

export function RestaurantHero({ restaurant }: RestaurantHeroProps) {
  return (
    <div className="relative">
      {/* Couverture — hauteur abaissée pour que le menu remonte au-dessus de
          la ligne de flottaison. Ne pas ré-agrandir : les photos vendeur
          réelles sont basse résolution (259×194 / 500×500 pour le seul
          vendeur de prod), une couverture plus haute les afficherait floues. */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-cream-200">
        <ImageCarousel
          images={galleryImages(restaurant, restaurant.nom)}
          className="h-full w-full"
          priority
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-cream-200">
              <span className="font-display text-6xl text-ink-300" aria-hidden>
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          }
        />
        {/* Voile — via-stop relevé (pas seulement le from du brief) pour
            garantir ≥4.5:1 au texte blanc même sur une photo très claire :
            voir calculs dans le rapport de tâche. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 pb-12">
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white">
              {restaurant.nom}
            </h1>
            {restaurant.isOpen ? (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-success text-white text-xs font-semibold rounded-full">
                <CheckCircle className="w-3 h-3" />
                Ouvert
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-ink-500 text-white text-xs font-semibold rounded-full">
                <XCircle className="w-3 h-3" />
                Fermé
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info card flottante */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="-mt-8 relative bg-white rounded-2xl shadow-lg border border-cream-300 p-5 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              {restaurant.specialties && restaurant.specialties.length > 0 && (
                <p className="text-ink-500 text-sm mb-3">
                  {restaurant.specialties.map((s) => s.name).join(' · ')}
                </p>
              )}

              <div className="flex items-center gap-1 text-ink-500 text-sm mb-3">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {restaurant.adresse}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {restaurant.averageRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span className="font-semibold text-ink-900">
                      {restaurant.averageRating.toFixed(1)}
                    </span>
                    {restaurant.totalReviews && (
                      <span className="text-ink-500">({restaurant.totalReviews} avis)</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-ink-700">
                  <Clock className="w-4 h-4 text-ink-500" />
                  {formatDeliveryTime(
                    restaurant.estimatedDeliveryTimeMin,
                    restaurant.estimatedDeliveryTimeMax,
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-ink-700">
                  <Bike className="w-4 h-4 text-ink-500" />
                  {restaurant.fixedDeliveryFee === 0
                    ? 'Livraison gratuite'
                    : `Livraison ${formatCurrency(restaurant.fixedDeliveryFee)}`}
                </div>
                {restaurant.minimumOrderAmount > 0 && (
                  <div className="text-ink-500 text-xs">
                    Minimum {formatCurrency(restaurant.minimumOrderAmount)}
                  </div>
                )}
              </div>
            </div>

            <a
              href={`tel:${restaurant.phone}`}
              className="flex items-center gap-2 px-4 py-2.5 border border-cream-300 rounded-xl text-sm font-medium text-ink-700 hover:bg-cream-100 transition-colors flex-shrink-0"
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
