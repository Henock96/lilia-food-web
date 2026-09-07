'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { useVendorPreview } from '@lilia/api-client';
import type { VendorType } from '@lilia/types';
import { PhotoGalleryEditor } from '@/components/photo-gallery-editor';
import { DeliverySettingsPanel } from '@/components/vendors/delivery-settings-panel';
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
  // La livraison d'abord : c'est ce qui décide de ce que paie le client, alors
  // que la galerie est cosmétique. L'onglet par défaut est celui qu'on vient
  // corriger le plus souvent.
  const [tab, setTab] = useState<'livraison' | 'photos'>('livraison');

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

      {/* Onglets — la page ne portait que la galerie. La configuration de
          livraison n'était administrable nulle part : `/zones` renvoyait vers
          « le niveau de chaque restaurant » et `/mon-restaurant` vers « Zones,
          par l'admin ». Elle a sa place ici, sur le vendeur qu'on administre. */}
      <nav className="flex gap-1 border-b border-zinc-200 dark:border-dark-border">
        {(
          [
            ['livraison', 'Livraison'],
            ['photos', 'Photos'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'livraison' ? (
        <DeliverySettingsPanel vendorId={id} token={token} />
      ) : (
        <section className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-200 dark:border-dark-border shadow-card p-5">
          <h2 className="mb-3 text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Photos
          </h2>
          <PhotoGalleryEditor entity="vendor" parentId={id} token={token} />
        </section>
      )}
    </div>
  );
}
