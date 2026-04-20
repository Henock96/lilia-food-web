import { Suspense } from 'react';
import { HeroSection } from '@/components/home/hero-section';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { AppDownloadBanner } from '@/components/home/app-download-banner';
import { RestaurantCardSkeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  return (
    <>
      {/* Statique — mis en cache */}
      <HeroSection />
      <HowItWorks />

      {/* Dynamique — rendu à la requête */}
      <Suspense
        fallback={
          <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-8 w-48 skeleton mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <RestaurantCardSkeleton key={i} />
              ))}
            </div>
          </section>
        }
      >
        <FeaturedRestaurants />
      </Suspense>

      <AppDownloadBanner />
    </>
  );
}
