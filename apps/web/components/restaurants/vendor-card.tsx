'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Clock, Bike, Heart } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { cardVariants, buttonTap } from '@lilia/motion';
import { formatCurrency, formatDeliveryTime, cn, coverImage } from '@lilia/utils';
import { useFavorites, useToggleFavorite, usePopularRestaurants } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { VENDOR_TYPE_EMOJI, VENDOR_TYPE_LABELS } from './vendor-type-badge';

/**
 * Carte vendeur « Lilia Noir » — variante sombre gourmet utilisée sur la home
 * et la liste /restaurants. Volontairement séparée de RestaurantCard (conservée
 * pour /favoris) afin de ne pas casser les pages thémées clair/sombre.
 * Conserve favoris (optimistic) + badges populaire/rapide/nouveau.
 */
interface VendorCardProps {
  restaurant: Restaurant;
}

export function VendorCard({ restaurant }: VendorCardProps) {
  const reduced = useReducedMotion();
  const { token } = useAuthStore();
  const { data: favorites } = useFavorites(token);
  const { data: popularList } = usePopularRestaurants();
  const toggleFavorite = useToggleFavorite(token);

  const cover = coverImage(restaurant);
  const isFavorite = favorites?.some((f) => f.id === restaurant.id) ?? false;
  const isPopular = popularList?.some((r) => r.id === restaurant.id) ?? false;
  const isFastDelivery = restaurant.estimatedDeliveryTimeMax <= 30;
  const isNew = restaurant.createdAt
    ? (Date.now() - new Date(restaurant.createdAt).getTime()) / 86_400_000 <= 7
    : false;
  const vendorType = restaurant.vendorType ?? 'RESTAURANT';
  const showType = vendorType !== 'RESTAURANT';

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      toast.error('Connectez-vous pour ajouter aux favoris');
      return;
    }
    toggleFavorite.mutate(
      { restaurantId: restaurant.id, isFavorite, restaurant },
      {
        onSuccess: () => toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris'),
        onError: () => toast.error('Erreur, veuillez réessayer'),
      },
    );
  }

  return (
    <motion.div
      variants={reduced ? {} : cardVariants}
      whileHover={reduced ? {} : { y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
      whileTap={reduced ? {} : buttonTap}
      className="group h-full"
    >
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-[var(--noir-700)] transition-all duration-300 group-hover:border-[var(--ember-400)]/40 group-hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8),0_0_50px_-26px_rgba(244,116,48,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]"
        aria-label={`${restaurant.nom} — ${restaurant.isOpen ? 'Ouvert' : 'Fermé'}`}
      >
        {/* Image */}
        <div className="relative h-44 overflow-hidden bg-[var(--noir-600)]">
          {cover ? (
            <Image
              src={cover}
              alt={restaurant.nom}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--noir-600)] to-[var(--noir-800)]">
              <span className="text-5xl opacity-40" role="img" aria-label="Plat">
                {VENDOR_TYPE_EMOJI[vendorType]}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />

          {/* statut + type */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md',
                restaurant.isOpen ? 'bg-[#27A660]/90 text-white' : 'bg-black/60 text-white/80',
              )}
            >
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
            {showType && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                <span aria-hidden>{VENDOR_TYPE_EMOJI[vendorType]}</span>
                {VENDOR_TYPE_LABELS[vendorType]}
              </span>
            )}
          </div>

          {/* favori */}
          <button
            onClick={handleFavorite}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 backdrop-blur-md transition-transform hover:scale-110"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorite ? 'fill-[var(--ember-500)] text-[var(--ember-500)]' : 'text-white/80',
              )}
            />
          </button>

          {/* badges bas */}
          {(isNew || isFastDelivery || isPopular) && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
              {isPopular && (
                <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  🔥 Populaire
                </span>
              )}
              {isFastDelivery && (
                <span className="rounded-full bg-[var(--ember-500)]/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  ⚡ Rapide
                </span>
              )}
              {isNew && (
                <span className="rounded-full bg-blue-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  Nouveau
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="line-clamp-1 text-base font-bold text-white transition-colors group-hover:text-[var(--ember-400)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {restaurant.nom}
            </h3>
            {restaurant.averageRating ? (
              <span
                className="flex shrink-0 items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5"
                aria-label={`Note ${restaurant.averageRating.toFixed(1)} sur 5`}
              >
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
                <span className="text-sm font-semibold text-white/90">
                  {restaurant.averageRating.toFixed(1)}
                </span>
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-1 text-xs text-white/40">{restaurant.adresse}</p>

          <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-white/55">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--ember-400)]" aria-hidden />
              {formatDeliveryTime(restaurant.estimatedDeliveryTimeMin, restaurant.estimatedDeliveryTimeMax)}
            </span>
            <span className="flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5 text-[var(--ember-400)]" aria-hidden />
              {restaurant.fixedDeliveryFee === 0 ? 'Gratuit' : formatCurrency(restaurant.fixedDeliveryFee)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
