import type { VendorType } from '@lilia/types';
import { VENDOR_TYPE_PLURAL } from './vendor-catalog';

/**
 * Contenu éditorial de la home : les univers de la marketplace.
 *
 * Le libellé vient de `VENDOR_TYPE_PLURAL`, la même source que les filtres du
 * catalogue : l'accueil disait « Restaurants », les filtres « Restaurant ».
 *
 * Les accroches ne promettent rien d'invérifiable (« Pain chaud dès 6h »
 * engageait des horaires que la plateforme ne garantit pas). L'accueil
 * n'affiche une tuile que si le serveur compte au moins un vendeur de ce
 * type ; le pied de page, statique, les liste toutes.
 */
export interface HomeCategory {
  type: VendorType;
  label: string;
  tagline: string;
  /** Image de fond de la tuile (chemin relatif depuis public/). */
  image: string;
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { type: 'RESTAURANT', label: VENDOR_TYPE_PLURAL.RESTAURANT, tagline: 'Les saveurs du quartier', image: '/categories/cat1.jpeg' },
  { type: 'HOME_COOK', label: VENDOR_TYPE_PLURAL.HOME_COOK, tagline: 'Le fait-main, comme à la maison', image: '/categories/cat2.jpeg' },
  { type: 'BAKERY', label: VENDOR_TYPE_PLURAL.BAKERY, tagline: 'Pains et viennoiseries', image: '/categories/cat3.jpeg' },
  { type: 'BEVERAGE_SHOP', label: VENDOR_TYPE_PLURAL.BEVERAGE_SHOP, tagline: 'Jus, sodas et eaux', image: '/categories/cat4.jpeg' },
];
