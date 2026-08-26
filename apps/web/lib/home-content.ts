import {
  UtensilsCrossed,
  CookingPot,
  Croissant,
  CupSoda,
  Wallet,
  ShieldCheck,
  Megaphone,
  TrendingUp,
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

export interface PartnerPerk {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const PARTNER_PERKS: PartnerPerk[] = [
  {
    icon: TrendingUp,
    title: 'Plus de ventes',
    description: 'Touche des milliers de clients affamés à Brazzaville, sans pub coûteuse.',
  },
  {
    icon: Wallet,
    title: 'Paiements simples',
    description: 'MTN MoMo & Airtel Money intégrés. Tu reçois tes versements sans tracas.',
  },
  {
    icon: ShieldCheck,
    title: 'Zéro risque',
    description: 'Inscription gratuite, validation rapide. Tu gardes le contrôle de ton menu.',
  },
  {
    icon: Megaphone,
    title: 'Mise en avant',
    description: "Les nouveaux vendeurs sont boostés sur la page d'accueil pendant leurs premières semaines.",
  },
];

export interface TrustStat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
}

export const TRUST_STATS: TrustStat[] = [
  { value: 12, suffix: '+', label: 'Vendeurs partenaires' },
  { value: 10, suffix: ' min', label: 'Livraison moyenne' },
  { value: 1, suffix: 'k+', label: 'Commandes livrées' },
  { value: 4.8, suffix: '/5', label: 'Note moyenne', decimals: 1 },
];
