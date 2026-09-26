import type { Restaurant } from '@lilia/types';
import { VendorTypeBadge, VENDOR_TYPE_LABELS } from './vendor-type-badge';
import { OfferBadge } from './offer-badge';
import { ExpandableBio } from './expandable-bio';
import { OperatingHoursList } from './operating-hours-list';

interface VendorInfoSectionProps {
  restaurant: Restaurant;
}

function formatSinceFr(iso: string): string | null {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const formatted = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(d);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return null;
  }
}

export function VendorInfoSection({ restaurant }: VendorInfoSectionProps) {
  const story = restaurant.vendorProfile?.story?.trim() || null;
  const hours = restaurant.operatingHours ?? [];
  const since = formatSinceFr(restaurant.createdAt);
  const showBadge = !!restaurant.vendorType && restaurant.vendorType !== 'RESTAURANT';
  const vendorTypeLabel = restaurant.vendorType
    ? VENDOR_TYPE_LABELS[restaurant.vendorType]
    : null;

  const offer = restaurant.activeOffer ?? null;
  if (!story && hours.length === 0 && !since && !showBadge && !offer) return null;

  return (
    <div className="bg-white rounded-2xl border border-cream-300 p-5 mb-6">
      {/* F3-11 — offre boutique, appliquée d'elle-même au panier */}
      {offer && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <OfferBadge offer={offer} expanded />
          <span className="text-xs text-ink-500">appliquée automatiquement à votre panier</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showBadge && restaurant.vendorType && (
          <VendorTypeBadge vendorType={restaurant.vendorType} />
        )}
        {since && (
          <span className="text-xs text-ink-500">
            {vendorTypeLabel && !showBadge ? `${vendorTypeLabel} · ` : ''}
            Sur Lilia Food depuis {since}
          </span>
        )}
      </div>

      {story && (
        <div className="mb-4">
          <ExpandableBio story={story} />
        </div>
      )}

      {hours.length > 0 && (
        <div className="pt-3 border-t border-cream-300">
          <OperatingHoursList hours={hours} />
        </div>
      )}
    </div>
  );
}
