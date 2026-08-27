'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Clock, Bike, Heart } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { cardVariants, buttonTap } from '@lilia/motion';
import { formatCurrency, formatDeliveryTime, cn, coverImage } from '@lilia/utils';
import { useFavorites, useToggleFavorite, usePopularRestaurants } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { VendorTypeBadge } from './vendor-type-badge';

/**
 * Carte vendeur utilisée sur la home (« Les plus courus ») et sur /restaurants.
 * Volontairement séparée de RestaurantCard (conservée pour /favoris) pour ne
 * pas devoir toucher deux fois la même page, mais les deux composants
 * partagent désormais exactement le même habillage (charte de la refonte) :
 * ne pas laisser les deux diverger visuellement.
 */
interface VendorCardProps {
  restaurant: Restaurant;
}

export function VendorCard({ restaurant }: VendorCardProps) {
  const reduced = useReducedMotion();
  // Timestamp figé au montage : évite un appel impur à Date.now() pendant le render.
  const [now] = useState(() => Date.now());
  // `coverImage()` peut renvoyer une URL périmée (ex. lien tiers documenté
  // comme périssable dans next.config.ts) : si <Image> échoue au chargement,
  // on bascule sur le même aplat à initiale que « pas d'image du tout »,
  // jamais l'icône de lien cassé.
  const [imgError, setImgError] = useState(false);
  const { token } = useAuthStore();
  const { data: favorites } = useFavorites(token);
  const { data: popularList } = usePopularRestaurants();
  const toggleFavorite = useToggleFavorite(token);

  const cover = coverImage(restaurant);
  const isFavorite = favorites?.some((f) => f.id === restaurant.id) ?? false;
  const isPopular = popularList?.some((r) => r.id === restaurant.id) ?? false;
  const isFastDelivery = restaurant.estimatedDeliveryTimeMax <= 30;
  const isNew = restaurant.createdAt
    ? (now - new Date(restaurant.createdAt).getTime()) / 86_400_000 <= 7
    : false;
  const vendorType = restaurant.vendorType ?? 'RESTAURANT';

  // Un seul badge superposé sur la photo — priorité Nouveau > Populaire > Rapide.
  const overlayBadge = isNew ? 'Nouveau' : isPopular ? 'Populaire' : isFastDelivery ? 'Rapide' : null;

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
    <motion.div variants={reduced ? {} : cardVariants} whileTap={reduced ? {} : buttonTap} className="h-full">
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl border border-cream-300 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato-500"
        aria-label={`${restaurant.nom} — ${restaurant.isOpen ? 'Ouvert' : 'Fermé'}`}
      >
        {/* Image */}
        <div className="relative h-44 overflow-hidden bg-cream-200">
          {cover && !imgError ? (
            <Image
              src={cover}
              alt={restaurant.nom}
              fill
              // Image vendeur = URL externe arbitraire → unoptimized (cf. restaurant-card).
              unoptimized
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-200">
              <span className="font-display text-2xl text-ink-300" aria-hidden>
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* statut + type */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                restaurant.isOpen ? 'bg-success text-white' : 'bg-ink-500 text-white',
              )}
            >
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
            <VendorTypeBadge vendorType={vendorType} />
          </div>

          {/* favori */}
          <button
            onClick={handleFavorite}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-110"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-colors',
                isFavorite ? 'fill-tomato-600 text-tomato-600' : 'text-ink-300',
              )}
            />
          </button>

          {/* badge unique bas-gauche (Nouveau > Populaire > Rapide) */}
          {overlayBadge && (
            <div className="absolute bottom-3 left-3">
              <span className="rounded-pill bg-ink-900/80 px-2 py-0.5 text-[10px] font-bold text-white">
                {overlayBadge}
              </span>
            </div>
          )}
        </div>

        {/* Contenu */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-display text-base font-bold text-ink-900">
              {restaurant.nom}
            </h3>
            {restaurant.averageRating ? (
              <span
                className="flex shrink-0 items-center gap-1"
                aria-label={`Note ${restaurant.averageRating.toFixed(1)} sur 5`}
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
                <span className="text-sm font-semibold text-ink-700">
                  {restaurant.averageRating.toFixed(1)}
                </span>
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-1 text-[11px] text-ink-500">{restaurant.adresse}</p>

          <div className="mt-auto flex items-center gap-4 pt-4 text-[11px] text-ink-500">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatDeliveryTime(restaurant.estimatedDeliveryTimeMin, restaurant.estimatedDeliveryTimeMax)}
            </span>
            <span className="flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5" aria-hidden />
              {restaurant.fixedDeliveryFee === 0 ? 'Gratuit' : formatCurrency(restaurant.fixedDeliveryFee)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
