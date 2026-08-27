import {
  UtensilsCrossed,
  CookingPot,
  Croissant,
  CupSoda,
  type LucideIcon,
} from 'lucide-react';
import type { VendorType } from '@lilia/types';

/**
 * Contenu éditorial de la home.
 * Les catégories pointent vers /restaurants?vendorType=… (filtre marketplace
 * LIL-119). GROCERY est volontairement exclu tant que le catalogue épicerie
 * n'est pas activé, comme dans VendorTypeChips.
 */

export interface HomeCategory {
  type: VendorType;
  label: string;
  tagline: string;
  icon: LucideIcon;
  /** Aplat de la tuile, tant qu'il n'y a pas de vraie photo. */
  tone: 'photo' | 'tomato' | 'cream' | 'ink';
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { type: 'RESTAURANT',    label: 'Restaurants',     tagline: 'Les saveurs du quartier',      icon: UtensilsCrossed, tone: 'photo'  },
  { type: 'HOME_COOK',     label: 'Cuisines maison', tagline: 'Le fait-main du quartier',     icon: CookingPot,      tone: 'tomato' },
  { type: 'BAKERY',        label: 'Boulangeries',    tagline: 'Pain chaud dès 6h',            icon: Croissant,       tone: 'cream'  },
  { type: 'BEVERAGE_SHOP', label: 'Boissons',        tagline: 'Fraîches, livrées',            icon: CupSoda,        tone: 'ink'    },
];
