'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { useVendorPreview } from '@lilia/api-client';
import type { VendorType } from '@lilia/types';
import { PhotoGalleryEditor } from '@/components/photo-gallery-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { apiMessage } from '@/lib/api-message';
import { useAuthStore } from '@/store/auth';

const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  RESTAURANT: 'Restaurant',
  HOME_COOK: 'Cuisine maison',
  BAKERY: 'Boulangerie',
  BEVERAGE_SHOP: 'Boissons',
  GROCERY: 'Épicerie',
};

/**
 * Détail d'un vendeur — identité et galerie photos.
 *
 * L'en-tête affichait littéralement « Restaurant {id} », c'est-à-dire le
 * cuid de la ligne. La page ne chargeait rien : elle se contentait du segment
 * d'URL, seule donnée dont elle disposait. Un identifiant ne dit pas de qui il
 * s'agit — et sur un écran qui permet de supprimer des photos, savoir sur
 * quelle boutique on agit n'est pas un confort.
 *
 * La source est `GET /vendors/:id/preview` (ADMIN ou propriétaire) : elle rend
 * le vendeur **sans** frontière de publication, donc aussi celui qui est
 * suspendu ou en cours de configuration — exactement ceux que la liste
 * d'administration donne à ouvrir. `GET /vendors/:id`, publique, aurait
 * répondu 404 sur la moitié du catalogue de production.
 */
export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuthStore();
  const preview = useVendorPreview(token, id);
  const vendor = preview.data?.vendor;

  const vendorType = vendor?.vendorType ?? 'RESTAURANT';
  const statusLabel = !vendor
    ? null
    : !vendor.isActive
      ? 'Suspendu'
      : vendor.onboardingStatus !== 'ACTIVATED'
        ? 'En configuration'
        : !vendor.adminApproved
          ? 'En attente de validation'
          : vendor.isOpen
            ? 'Ouvert'
            : 'Fermé';

  return (
    <div className="max-w-5xl space-y-5">
      <Link
        href="/restaurants"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft size={14} /> Retour aux restaurants
      </Link>

      <header>
        {preview.isLoading ? (
          <Skeleton className="h-8 w-64 rounded-lg" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              {/* Le repli n'est jamais l'identifiant : s'il n'a pas pu être
                  chargé, on le dit, plutôt que d'afficher une chaîne que
                  personne ne peut relier à une boutique. */}
              {vendor?.nom ?? 'Vendeur introuvable'}
            </h1>
            {vendor?.isFeatured && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                <Star size={11} className="fill-amber-500" />
                En vedette
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {vendor
            ? `${VENDOR_TYPE_LABELS[vendorType]}${statusLabel ? ` · ${statusLabel}` : ''} · ${vendor.adresse}`
            : 'Gestion de la galerie photos.'}
        </p>

        {preview.isError && (
          <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
            {apiMessage(preview.error, 'Impossible de charger ce vendeur.')}
          </p>
        )}
      </header>

      <section className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
        <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Photos
        </h2>
        <PhotoGalleryEditor entity="vendor" parentId={id} token={token} />
      </section>
    </div>
  );
}
