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

export default async function HomePage() {
  const bannerSlides = await fetchBanners();

  return (
    <div>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <HeroSlider slides={bannerSlides} />
      <CategoryRail />
      <FeaturedRestaurants />
      <HowItWorks />
      <DownloadApp />
      <BecomePartner />
    </div>
  );
}
