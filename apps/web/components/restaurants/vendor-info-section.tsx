import type { Restaurant } from '@lilia/types';
import { VendorTypeBadge, VENDOR_TYPE_LABELS } from './vendor-type-badge';
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

  if (!story && hours.length === 0 && !since && !showBadge) return null;

  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-dark-border p-5 mb-6">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {showBadge && restaurant.vendorType && (
          <VendorTypeBadge vendorType={restaurant.vendorType} />
        )}
        {since && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {vendorTypeLabel && !showBadge ? `${vendorTypeLabel} · ` : ''}
            Sur Lilia depuis {since}
          </span>
        )}
      </div>

      {story && (
        <div className="mb-4">
          <ExpandableBio story={story} />
        </div>
      )}

      {hours.length > 0 && (
        <div className="pt-3 border-t border-zinc-100 dark:border-dark-border">
          <OperatingHoursList hours={hours} />
        </div>
      )}
    </div>
  );
}
