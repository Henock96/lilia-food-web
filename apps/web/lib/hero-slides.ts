import type { Restaurant } from '@lilia/types';
import { coverImage } from '@lilia/utils';

/** Vendeur affiché dans le hero de la home. */
export interface HeroSlide {
  id: string;
  nom: string;
  imageUrl: string;
  adresse: string;
  isOpen: boolean;
  /** Fourchette de livraison prête à afficher, ex. « 15–20 min ». */
  delay: string;
}

/** Nombre maximum de slides — au-delà, plus personne ne les regarde. */
const MAX_SLIDES = 5;

/**
 * Sélectionne les vendeurs éligibles au hero : actifs, approuvés, et dotés
 * d'une photo. Les vendeurs ouverts passent devant.
 *
 * Retourner moins de 2 slides est un cas normal, pas une erreur : au
 * lancement le catalogue ne compte qu'un vendeur. C'est à l'appelant de
 * basculer en affichage statique — voir HeroSlider.
 */
export function selectHeroSlides(restaurants: Restaurant[]): HeroSlide[] {
  return restaurants
    .filter((r) => r.isActive && r.adminApproved !== false && coverImage(r) !== null)
    .sort((a, b) => Number(b.isOpen) - Number(a.isOpen))
    .slice(0, MAX_SLIDES)
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      imageUrl: coverImage(r) as string,
      adresse: r.adresse,
      isOpen: r.isOpen,
      delay: `${r.estimatedDeliveryTimeMin}–${r.estimatedDeliveryTimeMax} min`,
    }));
}
