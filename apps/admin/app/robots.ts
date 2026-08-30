import type { MetadataRoute } from 'next';

/**
 * Back-office : rien ne doit être exploré ni indexé.
 *
 * L'indexation était déjà bloquée par `<meta name="robots" content="noindex,
 * nofollow">` dans le layout racine, et l'en-tête HTTP `X-Robots-Tag` ajouté
 * dans `next.config.ts` la double désormais. Ce fichier est la troisième
 * couche, et la seule qui empêche le crawl lui-même plutôt que l'indexation :
 * un robot qui respecte `robots.txt` ne vient même pas frapper à la porte.
 *
 * Aucune directive `sitemap` : il n'y a rien à soumettre.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
