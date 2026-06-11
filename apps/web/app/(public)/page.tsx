import { Suspense } from 'react';
import { HeroSection } from '@/components/home/hero-section';
import { CategoryRail } from '@/components/home/category-rail';
import { PromoStrip } from '@/components/home/promo-strip';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { Testimonials } from '@/components/home/testimonials';
import { BecomePartner } from '@/components/home/become-partner';
import { AppDownloadBanner } from '@/components/home/app-download-banner';

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

export default function HomePage() {
  return (
    <div className="bg-[var(--noir-900)]">
      {/* Statique — mis en cache */}
      <HeroSection />
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
