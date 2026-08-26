import { HeroSlider } from '@/components/home/hero-slider';
import { CategoryRail } from '@/components/home/category-rail';
import { FeaturedRestaurants } from '@/components/home/featured-restaurants';
import { HowItWorks } from '@/components/home/how-it-works';
import { BecomePartner } from '@/components/home/become-partner';
import { getVendors } from '@/lib/vendors';
import { selectHeroSlides } from '@/lib/hero-slides';
import { getHeroMode } from '@/lib/hero-mode';

export default async function HomePage() {
  // Récupérés une seule fois : le hero et FeaturedRestaurants partagent
  // getVendors() ('use cache'), donc pas de second appel réseau à /vendors.
  // La donnée est déjà résolue ici, donc plus rien en aval n'est réellement
  // en attente réseau : pas de <Suspense> autour de FeaturedRestaurants, ce
  // serait un faux streaming (sa propre requête, mémoïsée, revient déjà
  // depuis le même cache sans nouvel aller-retour).
  const restaurants = await getVendors();
  const heroSlides = selectHeroSlides(restaurants);
  // Seule la photo du premier slide sert de fond au premier affichage :
  // c'est la seule mesurée pour décider photo vs aplat.
  const heroMode = await getHeroMode(heroSlides[0]?.imageUrl);

  return (
    <div>
      <HeroSlider slides={heroSlides} mode={heroMode} />
      <CategoryRail />
      <FeaturedRestaurants />
      <HowItWorks />
      <BecomePartner />
    </div>
  );
}
