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

export interface HomePromo {
  badge: string;
  title: string;
  description: string;
  code?: string;
  image: string;
  tone: 'ember' | 'gold' | 'plum';
}

export const HOME_PROMOS: HomePromo[] = [
  {
    badge: 'Première commande',
    title: '-20% sur ton premier festin',
    description: 'Code de bienvenue automatiquement appliqué au panier.',
    code: 'BIENVENUE20',
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200&auto=format&fit=crop',
    tone: 'ember',
  },
  {
    badge: 'Nouveau',
    title: 'Cuisines maison à l’honneur',
    description: 'Les chefs de quartier rejoignent Lilia Food. Goûte le fait-main.',
    image:
      'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=1200&auto=format&fit=crop',
    tone: 'plum',
  },
  {
    badge: 'Fidélité',
    title: '1 point offert / 100 FCFA',
    description: 'Cumule, puis transforme tes points en réductions réelles.',
    image:
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=1200&auto=format&fit=crop',
    tone: 'gold',
  },
];

export interface HomeTestimonial {
  name: string;
  area: string;
  quote: string;
  rating: number;
  avatar: string;
}

export const HOME_TESTIMONIALS: HomeTestimonial[] = [
  {
    name: 'Grâce M.',
    area: 'Bacongo',
    quote:
      'Livré en 22 minutes, encore chaud. Le suivi en temps réel change tout, je ne commande plus ailleurs.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/120?img=47',
  },
  {
    name: 'Yannick O.',
    area: 'Poto-Poto',
    quote:
      'Enfin de la vraie cuisine maison à Brazza. Paiement MoMo nickel, et les points fidélité s’accumulent vite.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/120?img=12',
  },
  {
    name: 'Sarah K.',
    area: 'Moungali',
    quote:
      'Les pâtisseries sur commande pour les anniversaires sont une tuerie. L’app est belle et simple.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/120?img=32',
  },
  {
    name: 'Davy N.',
    area: 'Centre-ville',
    quote:
      'Rapide, fiable, et le choix de vendeurs est énorme. Le service client répond vraiment.',
    rating: 4,
    avatar: 'https://i.pravatar.cc/120?img=68',
  },
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
