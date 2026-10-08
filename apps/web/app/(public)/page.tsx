import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryRail } from '@/components/home/category-rail';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { BecomePartner } from '@/components/home/become-partner';
import { DownloadApp } from '@/components/home/download-app';
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
  const bannerSlides = await fetchBanners();
  return <HeroSlider slides={bannerSlides} />;
}

type SearchParams = Record<string, string | string[] | undefined>;

export default function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      {/* Repli : le hero sans bannière, exactement ce que rend `slides: []`. */}
      <Suspense fallback={<HeroSlider slides={[]} />}>
        <HeroFromBanners />
      </Suspense>
      {/* Les vendeurs d'abord : c'est ce que le visiteur vient chercher. */}
      <FeaturedRestaurants searchParams={searchParams} />
      <CategoryRail />
      <HowItWorks />
      <DownloadApp />
      <BecomePartner />
    </div>
  );
}
