import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * `/favoris` manquait à la liste : c'est une page de l'espace personnel, au
 * même titre que `/panier` ou `/profil`. Les pages d'authentification sont
 * ajoutées elles aussi — elles n'ont aucune valeur en recherche et occupaient
 * du budget de crawl.
 *
 * Le `Disallow` empêche le crawl, pas l'indexation d'une URL découverte par
 * un lien externe : les `noindex` posés sur les layouts `(auth)` et
 * `(protected)` sont l'autre moitié de la protection.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/panier',
          '/commandes',
          '/profil',
          '/favoris',
          '/connexion',
          '/inscription',
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
