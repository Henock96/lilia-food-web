import 'server-only';
import { fetchImageWidth, HERO_MIN_WIDTH } from './image-size';

/**
 * `'photo'` : le hero affiche la photo du premier vendeur en fond plein
 * écran. `'flat'` : aplat de couleur — pas assez de pixels pour un
 * agrandissement propre, ou aucun vendeur éligible.
 */
export type HeroMode = 'photo' | 'flat';

/**
 * Décide le mode d'affichage du hero à partir de la largeur réelle de
 * l'image du *premier* slide — la seule qui sert de fond au premier
 * affichage, donc la seule mesurée (les suivantes ne le sont pas).
 * En dessous de {@link HERO_MIN_WIDTH}, ou si la largeur est inconnue
 * (pas d'image, échec réseau, format non reconnu), on bascule sur
 * l'aplat : le doute profite à l'aplat plutôt qu'à une image pixelisée.
 *
 * `'use cache'` évite de refaire cette mesure réseau à chaque rendu.
 */
export async function getHeroMode(firstSlideImageUrl: string | undefined): Promise<HeroMode> {
  'use cache';
  if (!firstSlideImageUrl) return 'flat';
  const width = await fetchImageWidth(firstSlideImageUrl);
  return width !== null && width >= HERO_MIN_WIDTH ? 'photo' : 'flat';
}
