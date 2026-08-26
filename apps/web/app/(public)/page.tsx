import { Suspense } from 'react';
import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryRail } from '@/components/home/category-rail';
import { PromoStrip } from '@/components/home/promo-strip';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { Testimonials } from '@/components/home/testimonials';
import { BecomePartner } from '@/components/home/become-partner';
import { AppDownloadBanner } from '@/components/home/app-download-banner';
import { getVendors } from '@/lib/vendors';
import { selectHeroSlides } from '@/lib/hero-slides';
import { getHeroMode } from '@/lib/hero-mode';

function FeaturedFallback() {
  return (
    <section className="noir-canvas py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-10 w-64 rounded-xl bg-white/5" />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-[1.5rem] border border-white/8 bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  // Récupérés une seule fois : le hero et FeaturedRestaurants partagent
  // getVendors() ('use cache'), donc pas de second appel réseau à /vendors.
  const restaurants = await getVendors();
  const heroSlides = selectHeroSlides(restaurants);
  // Seule la photo du premier slide sert de fond au premier affichage :
  // c'est la seule mesurée pour décider photo vs aplat.
  const heroMode = await getHeroMode(heroSlides[0]?.imageUrl);

  return (
    <div className="bg-[var(--noir-900)]">
      {/* Statique — mis en cache */}
      <HeroSlider slides={heroSlides} mode={heroMode} />
      <CategoryRail />
      <PromoStrip />

      {/* Dynamique — rendu à la requête */}
      <Suspense fallback={<FeaturedFallback />}>
        <FeaturedRestaurants />
      </Suspense>

      <HowItWorks />
      <Testimonials />
      <BecomePartner />
      <AppDownloadBanner />
    </div>
  );
}
