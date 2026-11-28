import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryRail } from '@/components/home/category-rail';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { BecomePartner } from '@/components/home/become-partner';
import { DownloadApp } from '@/components/home/download-app';
import { SitecParticipation } from '@/components/home/sitec-participation';
import { getVendorFacets } from '@/lib/vendors';
import { vendorCountLabel } from '@/lib/vendor-catalog';
import { fetchBanners } from '@/lib/hero-slides';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/json-ld';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Seuls le hero, les univers et les vendeurs dépendent du réseau ; le reste
 * de la page est prérendu.
 *
 * `fetchBanners()` et les lectures de `lib/vendors.ts` appellent
 * `connection()` : chacune vit sous sa propre frontière `<Suspense>`, sans
 * quoi l'`await` remonterait jusqu'au composant de page et empêcherait la
 * coquille d'être prérendue statiquement (PPR).
 */
async function HeroFromBanners() {
  const [slides, facets] = await Promise.all([fetchBanners(), getVendorFacets()]);
  const activity =
    facets.status === 'ok' && facets.value.total > 0
      ? vendorCountLabel(facets.value.total, facets.value.open)
      : undefined;
  return <HeroSlider slides={slides} activity={activity} />;
}

type SearchParams = Record<string, string | string[] | undefined>;

export default function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      {/* Le repli réserve la place des bannières pendant leur chargement. */}
      <Suspense fallback={<HeroSlider slides={[]} pending />}>
        <HeroFromBanners />
      </Suspense>
      <CategoryRail />
      <HowItWorks />
      <FeaturedRestaurants searchParams={searchParams} />
      <BecomePartner />
      <DownloadApp />
      <SitecParticipation />
    </div>
  );
}
