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
 * Le hero seul dépend du réseau — le reste de la page est prérendu.
 *
 * `fetchBanners()` appelle `connection()` : sans cette frontière `<Suspense>`,
 * l'`await` remonterait jusqu'au composant de page et empêcherait la coquille
 * d'être prérendue statiquement (PPR). C'est la règle déjà posée pour
 * `getVendors` dans `FeaturedRestaurants`.
 */
async function HeroFromBanners() {
  const bannerSlides = await fetchBanners();
  return <HeroSlider slides={bannerSlides} />;
}

export default function HomePage() {
  return (
    <div>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      {/* Repli : le hero sans bannière, exactement ce que rend `slides: []`. */}
      <Suspense fallback={<HeroSlider slides={[]} />}>
        <HeroFromBanners />
      </Suspense>
      <CategoryRail />
      <FeaturedRestaurants />
      <HowItWorks />
      <DownloadApp />
      <BecomePartner />
    </div>
  );
}
