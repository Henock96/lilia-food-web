'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Star, Clock, Bike, MapPin, Heart } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { cardVariants, buttonTap } from '@lilia/motion';
import { formatCurrency, formatDeliveryTime, cn, coverImage } from '@lilia/utils';
import { useFavorites, useToggleFavorite, usePopularRestaurants } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { VendorTypeBadge } from './vendor-type-badge';

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const reduced = useReducedMotion();
  // Timestamp figé au montage : évite un appel impur à Date.now() pendant le render.
  const [now] = useState(() => Date.now());
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

  // Un seul badge superposé sur la photo — priorité Nouveau > Populaire > Rapide
  // (cf. brief refonte : plus d'empilement rose/orange avec emoji).
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
        onSuccess: () =>
          toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris'),
        onError: () => toast.error('Erreur, veuillez réessayer'),
      },
    );
  }

  return (
    <motion.div variants={reduced ? {} : cardVariants} whileTap={reduced ? {} : buttonTap}>
      <Link
        href={`/restaurants/${restaurant.id}`}
        className="group block overflow-hidden rounded-xl border border-cream-300 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato-500"
        aria-label={`${restaurant.nom} — ${restaurant.isOpen ? 'Ouvert' : 'Fermé'}`}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-cream-200">
          {cover ? (
            <Image
              src={cover}
              alt={restaurant.nom}
              fill
              // Image vendeur = URL externe arbitraire → on contourne
              // l'optimiseur next/image (allowlist stricte conservée pour les
              // visuels curés). Voir choix LIL-107/108/109.
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-cream-200">
              <span className="font-display text-2xl text-ink-300" aria-hidden>
                {restaurant.nom.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Badge ouvert/fermé + vendor type (LIL-119, masqué pour RESTAURANT) */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={cn(
              'px-2.5 py-1 text-xs font-semibold rounded-full',
              restaurant.isOpen ? 'bg-success text-white' : 'bg-ink-500 text-white',
            )}>
              {restaurant.isOpen ? 'Ouvert' : 'Fermé'}
            </span>
            {restaurant.vendorType && (
              <VendorTypeBadge vendorType={restaurant.vendorType} />
            )}
          </div>

          {/* Bouton favori */}
          <button
            onClick={handleFavorite}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow-sm hover:scale-110 transition-transform"
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart
              className={cn(
                'w-4 h-4 transition-colors',
                isFavorite ? 'fill-tomato-600 text-tomato-600' : 'text-ink-300',
              )}
            />
          </button>

          {/* Badge unique bas-gauche (Nouveau > Populaire > Rapide) — jamais empilé */}
          {overlayBadge && (
            <div className="absolute bottom-3 left-3">
              <span className="rounded-pill bg-ink-900/80 px-2 py-0.5 text-[10px] font-bold text-white">
                {overlayBadge}
              </span>
            </div>
          )}

          {/* Spécialités — masquées si un badge est présent pour éviter le chevauchement */}
          {!overlayBadge && restaurant.specialties && restaurant.specialties.length > 0 && (
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
              {restaurant.specialties.slice(0, 2).map((s) => (
                <span key={s.id} className="rounded-pill bg-ink-900/70 px-2 py-0.5 text-[11px] text-white">
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-display font-bold text-ink-900 text-base leading-snug line-clamp-1">
              {restaurant.nom}
            </h3>
            {restaurant.averageRating && (
              <div className="flex items-center gap-1 flex-shrink-0" aria-label={`Note: ${restaurant.averageRating.toFixed(1)}`}>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden />
                <span className="text-sm font-semibold text-ink-700">
                  {restaurant.averageRating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-ink-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span className="line-clamp-1">{restaurant.adresse}</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-ink-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {formatDeliveryTime(restaurant.estimatedDeliveryTimeMin, restaurant.estimatedDeliveryTimeMax)}
            </span>
            <span className="flex items-center gap-1">
              <Bike className="w-3.5 h-3.5" aria-hidden />
              {restaurant.fixedDeliveryFee === 0 ? 'Livraison gratuite' : formatCurrency(restaurant.fixedDeliveryFee)}
            </span>
            {restaurant.minimumOrderAmount > 0 && (
              <span className="text-ink-500">
                Min. {formatCurrency(restaurant.minimumOrderAmount)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
