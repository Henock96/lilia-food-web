'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Star, Clock, Bike, Heart } from 'lucide-react';
import { toast } from 'sonner';
import type { Restaurant } from '@lilia/types';
import { formatDeliveryTime, cn, coverImage } from '@lilia/utils';
import { useFavorites, useToggleFavorite } from '@lilia/api-client';
import { useAuthStore } from '@/store/auth';
import { coverFit, type CoverFit } from '@/lib/cover-fit';
import { openingLabel } from '@/lib/opening-label';
import { VENDOR_TYPE_LABELS } from './vendor-type-badge';
import { OfferBadge } from './offer-badge';
import { DeliveryFeeText } from './delivery-fee-text';

/**
 * Carte vendeur — accueil, catalogue et favoris (une seule carte, un seul
 * habillage).
 *
 * ## Structure
 *
 * ```
 * article (relatif)
 *  ├── vignette           décorative (alt vide : le nom est juste à côté)
 *  ├── h3 > a             LE lien de la carte ; son ::after couvre l'article
 *  ├── type · adresse, statut, délai, livraison
 *  └── bouton favori      frère du lien, au-dessus (z-10) — jamais dedans
 * ```
 *
 * L'ancienne carte plaçait le bouton favori **dans** le `<a>` : contenu
 * interactif imbriqué (HTML invalide), annonce ambiguë au lecteur d'écran, et
 * un `preventDefault` pour empêcher le clic de naviguer.
 *
 * ## Moins de badges, plus d'information
 *
 * Retirés : « Rapide » (déduit de l'estimation que le vendeur déclare
 * lui-même), « Populaire » (un appel `/restaurants/popular` par visiteur pour
 * un badge arrivé après coup) et « Mis en avant » (une décision éditoriale qui
 * ne dit rien au client ; elle agit déjà sur l'**ordre** serveur). Restent le
 * statut, avec l'heure de réouverture servie par le serveur, le type, l'offre
 * en cours et « Nouveau » (date de création : une donnée, pas un jugement).
 *
 * Mobile : une ligne (vignette carrée à gauche) — neuf vendeurs tiennent en un
 * écran et demi au lieu de quatre. À partir de `sm` : carte verticale.
 */
interface VendorCardProps {
  restaurant: Restaurant;
}

const NEW_VENDOR_DAYS = 7;

export function VendorCard({ restaurant }: VendorCardProps) {
  // Instant figé au montage : pas d'appel impur à Date.now() pendant le rendu.
  const [now] = useState(() => Date.now());
  // Une URL de couverture peut être morte (lien tiers périssable) : on retombe
  // sur l'initiale, jamais sur l'icône d'image cassée.
  const [imgError, setImgError] = useState(false);
  const [fit, setFit] = useState<CoverFit>('cover');

  const cover = coverImage(restaurant);
  const vendorType = restaurant.vendorType ?? 'RESTAURANT';
  const isNew = restaurant.createdAt
    ? (now - new Date(restaurant.createdAt).getTime()) / 86_400_000 <= NEW_VENDOR_DAYS
    : false;
  const status = openingLabel(restaurant, new Date(now));
  const href = `/restaurants/${restaurant.id}`;

  return (
    <article
      className={cn(
        'relative flex h-full gap-3.5 rounded-xl border border-cream-300 bg-white p-3 transition-shadow duration-200',
        'hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-tomato-600 has-[a:focus-visible]:ring-offset-2',
        'sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0',
      )}
    >
      <div
        className={cn(
          'relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg',
          'sm:aspect-[16/10] sm:w-full sm:rounded-none sm:border-b sm:border-cream-300',
          fit === 'contain' && !imgError ? 'bg-white' : 'bg-cream-200',
        )}
      >
        {cover && !imgError ? (
          <Image
            src={cover}
            alt=""
            fill
            // Image vendeur = URL externe arbitraire (Cloudinary ou lien tiers).
            unoptimized
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 25vw"
            className={cn(fit === 'contain' ? 'object-contain p-3' : 'object-cover')}
            onLoad={(e) =>
              setFit(coverFit(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))
            }
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden>
            <span className="font-display text-2xl font-bold text-ink-300">
              {restaurant.nom.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col sm:p-4">
        <h3 className="pr-10 font-display text-base font-bold leading-snug text-ink-900">
          <Link
            href={href}
            className="line-clamp-2 after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none!"
          >
            {restaurant.nom}
          </Link>
        </h3>

        <p className="mt-0.5 truncate text-[13px] text-ink-500">
          {VENDOR_TYPE_LABELS[vendorType]}
          {restaurant.adresse ? ` · ${restaurant.adresse}` : ''}
        </p>

        <p
          className={cn(
            'mt-2 flex items-center gap-1.5 text-[13px] font-semibold',
            restaurant.isOpen ? 'text-success' : 'text-ink-700',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              restaurant.isOpen ? 'bg-success' : 'bg-ink-300',
            )}
          />
          {status}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[13px] text-ink-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatDeliveryTime(
              restaurant.estimatedDeliveryTimeMin,
              restaurant.estimatedDeliveryTimeMax,
            )}
          </span>
          <span className="flex items-center gap-1">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            <DeliveryFeeText
              fixedDeliveryFee={restaurant.fixedDeliveryFee}
              freeLabel="Livraison offerte"
            />
          </span>
          {restaurant.averageRating ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-semibold text-ink-700">
                {restaurant.averageRating.toFixed(1)}
              </span>
              <span className="sr-only">sur 5</span>
            </span>
          ) : null}
        </div>

        {(isNew || restaurant.activeOffer) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {isNew && (
              <span className="inline-flex items-center rounded-full bg-tomato-50 px-2.5 py-1 text-xs font-semibold text-tomato-700">
                Nouveau
              </span>
            )}
            {/* F3-11 — offre boutique en cours */}
            {restaurant.activeOffer && <OfferBadge offer={restaurant.activeOffer} />}
          </div>
        )}
      </div>

      <FavoriteButton restaurant={restaurant} />
    </article>
  );
}

/**
 * Bouton favori : zone tactile de 44 × 44 px, pastille visuelle de 36 px.
 * Frère du lien de la carte et au-dessus de lui (`z-10`) — le clic ne navigue
 * pas, sans `preventDefault`.
 */
function FavoriteButton({ restaurant }: { restaurant: Restaurant }) {
  const { token } = useAuthStore();
  const { data: favorites } = useFavorites(token);
  const toggleFavorite = useToggleFavorite(token);
  const isFavorite = favorites?.some((f) => f.id === restaurant.id) ?? false;

  function handleClick() {
    if (!token) {
      toast.error('Connecte-toi pour garder tes vendeurs favoris.');
      return;
    }
    toggleFavorite.mutate(
      { restaurantId: restaurant.id, isFavorite, restaurant },
      {
        onSuccess: () =>
          toast.success(isFavorite ? 'Retiré de tes favoris' : 'Ajouté à tes favoris'),
        onError: () => toast.error('Impossible de modifier tes favoris. Réessaie.'),
      },
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorite}
      aria-label={`${restaurant.nom} dans mes favoris`}
      className="group/fav absolute right-0.5 top-0.5 z-10 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none! sm:right-1.5 sm:top-1.5"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-cream-300 transition-colors group-hover/fav:ring-tomato-600 group-focus-visible/fav:ring-2 group-focus-visible/fav:ring-tomato-600">
        <Heart
          aria-hidden
          className={cn(
            'h-4 w-4 transition-colors',
            isFavorite ? 'fill-tomato-600 text-tomato-600' : 'text-ink-500',
          )}
        />
      </span>
    </button>
  );
}
