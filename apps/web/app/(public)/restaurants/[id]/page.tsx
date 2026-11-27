import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getVendorMenu } from '@/lib/vendor-menu';
import { PageLoadError } from '@/components/ui/page-load-error';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { VendorCartSummary } from '@/components/restaurants/vendor-cart-summary';
import { RestaurantHero } from '@/components/restaurants/restaurant-hero';
import { RestaurantMenu } from '@/components/restaurants/restaurant-menu';
import { DailyMenus } from '@/components/restaurants/daily-menus';
import { VendorInfoSection } from '@/components/restaurants/vendor-info-section';
import { RestaurantReviews } from '@/components/restaurants/restaurant-reviews';
import { BreadcrumbJsonLd, VendorJsonLd } from '@/components/seo/json-ld';
import { TrackRestaurantView } from '@/components/analytics/track-restaurant-view';
import { SITE_URL } from '@/lib/site';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * ⚠️ Cette fonction lisait `GET /restaurants/${id}` derrière un `'use cache'`
 * **sans étiquette ni durée de vie**. Les deux défauts sont corrigés dans
 * `lib/vendor-menu.ts`, qui vise désormais la route canonique `/vendors/:id`,
 * borne la fraîcheur à quelques minutes, expose deux étiquettes
 * d'invalidation, et complète la carte au-delà de la borne serveur.
 */
const getRestaurant = getVendorMenu;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getRestaurant(id);
  // Une fiche introuvable ne doit surtout pas être indexée : sans `noindex`,
  // un vendeur retiré du catalogue laisse une page vide dans l'index.
  if (result.kind === 'missing') {
    return { title: 'Vendeur introuvable', robots: { index: false, follow: false } };
  }
  // Une panne, elle, ne dit rien du vendeur : pas de `noindex`, qui le
  // retirerait de l'index pour un incident de quelques minutes.
  if (result.kind === 'unavailable') {
    return { title: 'Vendeur', alternates: { canonical: `/restaurants/${id}` } };
  }
  const restaurant = result.value;

  const description = restaurant.adresse
    ? `Commander chez ${restaurant.nom} à Brazzaville — ${restaurant.adresse}. Livraison et paiement Mobile Money avec Lilia Food.`
    : `Commander chez ${restaurant.nom} à Brazzaville. Livraison et paiement Mobile Money avec Lilia Food.`;

  return {
    title: restaurant.nom,
    description,
    alternates: { canonical: `/restaurants/${id}` },
    openGraph: {
      title: `${restaurant.nom} — Lilia Food`,
      description,
      url: `${SITE_URL}/restaurants/${id}`,
      type: 'website',
      // La photo du vendeur fait une bien meilleure vignette de partage que
      // l'image générique du site.
      ...(restaurant.imageUrl ? { images: [{ url: restaurant.imageUrl }] } : {}),
    },
  };
}

export default async function RestaurantPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getRestaurant(id);

  if (result.kind === 'missing') notFound();
  if (result.kind === 'unavailable') {
    return <PageLoadError title="Impossible de charger ce vendeur." />;
  }
  const restaurant = result.value;

  return (
    <div className="min-h-screen bg-[#faf7f2]">
      {/* Seul émetteur de `restaurant_view` du site : la fiche est ouverte,
          donc consultée. Les cartes de liste n'émettent rien. */}
      <TrackRestaurantView restaurantId={restaurant.id} restaurantName={restaurant.nom} />
      <VendorJsonLd
        id={restaurant.id}
        nom={restaurant.nom}
        adresse={restaurant.adresse}
        imageUrl={restaurant.imageUrl}
        specialties={restaurant.specialties?.map((s) => s.name)}
      />
      <BreadcrumbJsonLd
        items={[
          { name: 'Accueil', path: '/' },
          { name: 'Vendeurs', path: '/restaurants' },
          { name: restaurant.nom, path: `/restaurants/${restaurant.id}` },
        ]}
      />
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 lg:px-8">
        <Breadcrumbs
          links={[
            { label: 'Accueil', href: '/' },
            { label: 'Nos vendeurs', href: '/restaurants' },
          ]}
          current={restaurant.nom}
        />
        <RestaurantHero restaurant={restaurant} />

        <div className="grid items-start gap-7 pt-7 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.46fr)] lg:gap-9">
          <div className="min-w-0 space-y-8">
            <DailyMenus menus={restaurant.menuDuJour ?? []} restaurantOpen={restaurant.isOpen} />
            <RestaurantMenu restaurant={restaurant} />
            <Suspense fallback={<div className="skeleton h-40 rounded-2xl" aria-hidden />}>
              <RestaurantReviews restaurantId={restaurant.id} />
            </Suspense>
          </div>

          <aside
            aria-label="Panier et informations du vendeur"
            className="space-y-5 lg:sticky lg:top-24"
          >
            <VendorCartSummary />
            <VendorInfoSection restaurant={restaurant} />
          </aside>
        </div>
      </div>
    </div>
  );
}
