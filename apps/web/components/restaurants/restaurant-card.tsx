'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Clock, Bike, MapPin, Heart } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { cardVariants, buttonTap } from '@lilia/motion';
import { formatCurrency, formatDeliveryTime, cn } from '@lilia/utils';
import { useFavorites, useToggleFavorite, usePopularRestaurants } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const reduced = useReducedMotion();
  const { token } = useAuthStore();
  const { data: favorites } = useFavorites(token);
  const { data: popularList } = usePopularRestaurants();
  const toggleFavorite = useToggleFavorite(token);

  const isFavorite = favorites?.some((f) => f.id === restaurant.id) ?? false;
  const isPopular = popularList?.some((r) => r.id === restaurant.id) ?? false;
  const isFastDelivery = restaurant.estimatedDeliveryTimeMax <= 30;
  const isNew = restaurant.createdAt
    ? (Date.now() - new Date(restaurant.createdAt).getTime()) / 86_400_000 <= 7
    : false;

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }
    toggleFavorite.mutate(
      { restaurantId: restaurant.id, isFavorite },
      {
        onSuccess: () =>
          toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris'),
        onError: () => toast.error('Erreur, veuillez réessayer'),
      },
    );
  }

  return (
    <motion.div
      variants={reduced ? {} : cardVariants}
      whileHover={reduced ? {} : { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      whileTap={reduced ? {} : buttonTap}
    >
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="group block bg-white dark:bg-dark-card rounded-2xl overflow-hidden border border-charcoal-100 dark:border-dark-border hover:border-charcoal-200 dark:hover:border-charcoal-600 hover:shadow-md dark:hover:shadow-black/30 transition-all duration-300 focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={`${restaurant.nom} — ${restaurant.isOpen ? 'Ouvert' : 'Fermé'}`}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-charcoal-50 dark:bg-dark-surface">
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
              restaurant.isOpen ? 'bg-[#27A660] text-white' : 'bg-charcoal-700/80 text-white',
            )}>
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
          </div>

          {/* Bouton favori */}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 dark:bg-dark-card/90 rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                isFavorite ? 'fill-primary-500 text-primary-500' : 'text-charcoal-400',
              )}
            />
          </button>

          {/* Badges visuels bas-gauche */}
          {(isNew || isFastDelivery || isPopular) && (
            <div className="absolute bottom-3 left-3 flex gap-1 flex-wrap">
              {isNew && (
                <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                  Nouveau
                </span>
              )}
              {isFastDelivery && (
                <span className="px-2 py-0.5 bg-primary-500 text-white text-xs font-bold rounded-full">
                  ⚡ Rapide
                </span>
              )}
              {isPopular && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                  🔥 Populaire
                </span>
              )}
            </div>
          )}

          {/* Spécialités — masquées si badges présents pour éviter le chevauchement */}
          {!isNew && !isFastDelivery && !isPopular && restaurant.specialties && restaurant.specialties.length > 0 && (
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
            <h3 className="font-bold text-charcoal-700 dark:text-charcoal-50 text-base leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
              {restaurant.nom}
            </h3>
            {restaurant.averageRating && (
              <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Note: ${restaurant.averageRating.toFixed(1)}`}>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                <span className="text-sm font-semibold text-charcoal-600 dark:text-charcoal-300">
                  {restaurant.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-charcoal-400 dark:text-charcoal-400 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span className="line-clamp-1">{restaurant.adresse}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-charcoal-400 dark:text-charcoal-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {formatDeliveryTime(restaurant.estimatedDeliveryTimeMin, restaurant.estimatedDeliveryTimeMax)}
            </span>
            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" aria-hidden />
              {restaurant.fixedDeliveryFee === 0 ? 'Livraison gratuite' : formatCurrency(restaurant.fixedDeliveryFee)}
            </span>
            {restaurant.minimumOrderAmount > 0 && (
              <span className="text-charcoal-400 dark:text-charcoal-500">
                Min. {formatCurrency(restaurant.minimumOrderAmount)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
