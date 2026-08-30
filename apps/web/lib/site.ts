/**
 * URL canonique du site client en production.
 *
 * `liliafood.com` (apex) redirige en 308 vers `www.liliafood.com` côté Vercel :
 * c'est donc le `www` qui doit apparaître dans les métadonnées, le sitemap et
 * le robots.txt, sous peine de faire pointer les moteurs sur une redirection.
 */
export const SITE_URL = 'https://www.liliafood.com';

/**
 * Coordonnées de contact — source unique.
 *
 * Elles vivaient en double dans `footer.tsx` et `support/page.tsx`, et les
 * deux copies avaient divergé : le footer affichait « 06 561 42 94 » mais son
 * `href` appelait le 06 745 46 10. Un visiteur qui cliquait n'appelait donc
 * pas le numéro qu'il lisait. Toute nouvelle utilisation doit passer par ici.
 *
 * `tel:` exige le format E.164 (indicatif pays, sans espaces) ; `display` est
 * la forme lisible. Les deux décrivent toujours la même ligne.
 */
export const CONTACT = {
  phonePrimary: { display: '+242 06 561 42 94', e164: '+242065614294' },
  phoneSecondary: { display: '+242 05 372 03 93', e164: '+242053720393' },
  email: 'contact@liliafood.com',
  /** Le lien WhatsApp attend le numéro sans « + » ni séparateur. */
  whatsapp: 'https://wa.me/242065614294',
  city: 'Brazzaville',
  country: 'CG',
  countryName: 'Congo',
} as const;

/**
 * Réseaux sociaux.
 *
 * Le footer pointait vers `href="#"` : deux liens morts, qui font lire le site
 * comme inachevé. Les icônes ne sont désormais rendues que pour les entrées
 * dont l'URL est réellement renseignée — remplir une valeur ici suffit à
 * réafficher l'icône correspondante, sans toucher au composant.
 */
export const SOCIAL_LINKS: { instagram?: string; facebook?: string } = {
  // TODO — renseigner les URLs réelles des comptes Lilia Food.
  // Tant qu'elles sont vides, les icônes ne s'affichent pas (voir footer.tsx).
  instagram: undefined,
  facebook: undefined,
};
