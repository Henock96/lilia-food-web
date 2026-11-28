import { Star, Clock, Bike, Phone, MapPin, Store } from 'lucide-react';
import type { Restaurant } from '@lilia/types';
import { formatCurrency, formatDeliveryTime, galleryImages } from '@lilia/utils';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { DeliveryFeeText } from './delivery-fee-text';
import { FavoriteButton } from './favorite-button';
import { ServiceModeTags } from './service-mode-tags';
import { VENDOR_TYPE_LABELS } from './vendor-type-badge';
import { serviceModesOf } from '@/lib/service-modes';
import { openingLabel } from '@/lib/opening-label';

export function RestaurantHero({ restaurant }: { restaurant: Restaurant }) {
  const modes = serviceModesOf(restaurant);

  return (
    <header className="border-ink-100 overflow-hidden rounded-2xl border bg-white">
      <div className="bg-cream-200 relative h-44 sm:h-56 lg:h-64">
        <ImageCarousel
          images={galleryImages(restaurant, restaurant.nom)}
          className="h-full w-full"
          sizes="(min-width: 1280px) 1216px, 100vw"
          priority
          fallback={
            <div className="grid h-full place-items-center">
              <Store className="text-ink-500 size-12" aria-hidden />
            </div>
          }
        />
        <div className="absolute top-2 right-2">
          <FavoriteButton restaurant={restaurant} />
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="font-display text-ink-900 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
              {restaurant.nom}
            </h1>
            <span
              className={
                restaurant.isOpen
                  ? 'text-success rounded-full bg-green-50 px-3 py-1 text-sm font-semibold'
                  : 'bg-cream-100 text-ink-700 rounded-full px-3 py-1 text-sm font-semibold'
              }
            >
              {openingLabel(restaurant)}
            </span>
          </div>
          <p className="text-ink-500 mt-2 flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {VENDOR_TYPE_LABELS[restaurant.vendorType ?? 'RESTAURANT']}
            {restaurant.adresse && ` · ${restaurant.adresse}`}
          </p>
          {!!restaurant.specialties?.length && (
            <p className="text-ink-500 mt-1 text-sm">
              {restaurant.specialties.map((s) => s.name).join(' · ')}
            </p>
          )}
          <div className="text-ink-700 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {!!restaurant.averageRating && (
              <span className="flex items-center gap-1.5">
                <Star className="fill-warning text-warning size-4" aria-hidden />
                <strong>{restaurant.averageRating.toFixed(1)}</strong>
                {!!restaurant.totalReviews && <span>({restaurant.totalReviews} avis)</span>}
              </span>
            )}
            {modes.delivery && (
              <>
                <span className="flex items-center gap-1.5">
                  <Clock className="text-tomato-700 size-4" aria-hidden />
                  {formatDeliveryTime(
                    restaurant.estimatedDeliveryTimeMin,
                    restaurant.estimatedDeliveryTimeMax,
                  )}
                </span>
                <span className="flex items-center gap-1.5">
                  <Bike className="text-tomato-700 size-4" aria-hidden />
                  <DeliveryFeeText
                    fixedDeliveryFee={restaurant.fixedDeliveryFee}
                    prefix="Livraison"
                  />
                </span>
              </>
            )}
            <ServiceModeTags modes={modes} />
            {restaurant.minimumOrderAmount > 0 && (
              <span>Minimum {formatCurrency(restaurant.minimumOrderAmount)}</span>
            )}
          </div>
        </div>
        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="border-ink-100 text-ink-700 hover:border-tomato-600 hover:text-tomato-700 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
          >
            <Phone className="size-4" aria-hidden /> Appeler
          </a>
        )}
      </div>
    </header>
  );
}
