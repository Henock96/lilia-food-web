/**
 * URL canonique du site client en production.
 *
 * `liliafood.com` (apex) redirige en 308 vers `www.liliafood.com` côté Vercel :
 * c'est donc le `www` qui doit apparaître dans les métadonnées, le sitemap et
 * le robots.txt, sous peine de faire pointer les moteurs sur une redirection.
 */
export const SITE_URL = 'https://www.liliafood.com';
